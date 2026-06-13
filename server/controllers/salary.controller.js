// controllers/salary.controller.js
const path = require("path");
const fs   = require("fs");
const User         = require("../models/User");
const SalaryRecord = require("../models/SalaryRecord");
const { success, created, paginated } = require("../utils/response");
const { ValidationError, NotFoundError } = require("../utils/errors");
const { logAudit } = require("../services/audit.service");

// GET /api/hr/employees — list all non-client employees
exports.getEmployees = async (req, res, next) => {
  try {
    const employees = await User.find({ role: { $ne: "client" }, isActive: true })
      .select("name email role departmentId salary isActive avatar userId")
      .populate("departmentId", "displayName slug")
      .sort("name")
      .lean();
    success(res, employees);
  } catch (err) { next(err); }
};

// PATCH /api/hr/employees/:id/salary — update base salary on User
exports.updateEmployeeSalary = async (req, res, next) => {
  try {
    const { salary } = req.body;
    if (salary == null || salary < 0) throw new ValidationError("salary must be a non-negative number");

    const user = await User.findById(req.params.id);
    if (!user) throw new NotFoundError("Employee");

    user.salary = salary;
    await user.save();

    await logAudit({
      action: "employee.salary_update", entity: "User", entityId: user._id,
      userId: req.user.id, details: { salary }, req,
    });

    success(res, { _id: user._id, name: user.name, salary: user.salary });
  } catch (err) { next(err); }
};

// POST /api/hr/salaries — create salary record for a month
exports.createSalaryRecord = async (req, res, next) => {
  try {
    const { employeeId, month, year, bonus, deductions, notes } = req.body;
    if (!employeeId || !month || !year) {
      throw new ValidationError("employeeId, month, and year are required");
    }

    const employee = await User.findById(employeeId);
    if (!employee) throw new NotFoundError("Employee");
    if (!employee.salary || employee.salary <= 0) {
      throw new ValidationError(`Employee ${employee.name} has no base salary set`);
    }

    const record = await SalaryRecord.create({
      employeeId,
      month: parseInt(month),
      year: parseInt(year),
      baseSalary: employee.salary,
      bonus: bonus || 0,
      deductions: Array.isArray(deductions) ? deductions : [],
      notes: notes || "",
    });

    await logAudit({
      action: "salary.create", entity: "SalaryRecord", entityId: record._id,
      userId: req.user.id, details: { salaryId: record.salaryId, employeeId, month, year }, req,
    });

    created(res, record);
  } catch (err) {
    // Duplicate key error → record already exists for this employee/month/year
    if (err.code === 11000) {
      return next(new ValidationError("Salary record already exists for this employee/month/year"));
    }
    next(err);
  }
};

// GET /api/hr/salaries — list salary records
exports.listSalaryRecords = async (req, res, next) => {
  try {
    const { page = 1, limit = 50, employeeId, month, year, status, sort = "-year -month" } = req.query;
    const filter = {};

    if (employeeId) filter.employeeId = employeeId;
    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);
    if (status) filter.status = status;

    const safeLimit = Math.min(parseInt(limit) || 20, 200);
    const skip = (parseInt(page) - 1) * safeLimit;
    const [docs, total] = await Promise.all([
      SalaryRecord.find(filter)
        .populate("employeeId", "name email role departmentId avatar salary")
        .populate("paidBy", "name")
        .sort(sort).skip(skip).limit(safeLimit).lean(),
      SalaryRecord.countDocuments(filter),
    ]);

    paginated(res, { docs, total, page: parseInt(page), limit: safeLimit });
  } catch (err) { next(err); }
};

// PATCH /api/hr/salaries/:id/pay — mark as paid + generate PDF
exports.markSalaryPaid = async (req, res, next) => {
  try {
    const record = await SalaryRecord.findById(req.params.id).populate("employeeId", "name email role");
    if (!record) throw new NotFoundError("Salary Record");
    if (record.status === "paid") throw new ValidationError("Salary already marked as paid");

    record.status = "paid";
    record.paidDate = new Date();
    record.paidBy = req.user.id;
    record.paymentMethod = req.body.paymentMethod || "bank_transfer";
    record.transactionRef = req.body.transactionRef || "";

    // ── Generate PDF payslip ─────────────────────────────────
    try {
      const PDFDocument = require("pdfkit");
      const payslipDir = path.join(__dirname, "..", "uploads", "payslips");
      fs.mkdirSync(payslipDir, { recursive: true });

      const filePath = path.join(payslipDir, `${record.salaryId}.pdf`);
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filePath);

      await new Promise((resolve, reject) => {
        stream.on("finish", resolve);
        stream.on("error", reject);
        doc.pipe(stream);

        // Header
        doc.fontSize(20).font("Helvetica-Bold").text("ZRC Media Network", { align: "center" });
        doc.fontSize(12).font("Helvetica").text("Payslip", { align: "center" });
        doc.moveDown();

        // Divider
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown();

        // Employee info
        const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
        doc.fontSize(11).font("Helvetica-Bold").text("Employee Details");
        doc.font("Helvetica").fontSize(10);
        doc.text(`Name:        ${record.employeeId.name}`);
        doc.text(`Email:       ${record.employeeId.email}`);
        doc.text(`Role:        ${record.employeeId.role}`);
        doc.text(`Pay Period:  ${monthNames[record.month - 1]} ${record.year}`);
        doc.text(`Salary ID:   ${record.salaryId}`);
        doc.moveDown();

        // Salary breakdown
        doc.font("Helvetica-Bold").fontSize(11).text("Salary Breakdown");
        doc.font("Helvetica").fontSize(10);
        doc.moveDown(0.5);
        const tableTop = doc.y;
        const col1 = 50, col2 = 400;

        const totalDeductions = record.deductions.reduce((s, d) => s + (d.amount || 0), 0);
        const rows = [
          ["Base Salary", `Rs.${record.baseSalary.toLocaleString("en-IN")}`],
          ["Bonus", `Rs.${record.bonus.toLocaleString("en-IN")}`],
          ["Deductions", `- Rs.${totalDeductions.toLocaleString("en-IN")}`],
        ];

        rows.forEach(([label, value], i) => {
          const y = tableTop + i * 20;
          doc.text(label, col1, y);
          doc.text(value, col2, y, { align: "right", width: 145 });
        });

        // Net salary line
        const netY = tableTop + rows.length * 20 + 10;
        doc.moveTo(50, netY).lineTo(545, netY).stroke();
        doc.font("Helvetica-Bold").fontSize(12);
        doc.text("Net Salary", col1, netY + 5);
        doc.text(`Rs.${record.netSalary.toLocaleString("en-IN")}`, col2, netY + 5, { align: "right", width: 145 });
        doc.moveDown(2);

        // Payment details
        doc.font("Helvetica-Bold").fontSize(11).text("Payment Details", 50);
        doc.font("Helvetica").fontSize(10);
        doc.text(`Payment Method:   ${(record.paymentMethod || "").replace("_", " ").toUpperCase()}`);
        doc.text(`Transaction Ref:  ${record.transactionRef || "N/A"}`);
        doc.text(`Paid Date:        ${record.paidDate.toLocaleDateString("en-IN")}`);
        doc.moveDown(2);

        // Footer
        doc.fontSize(8).fillColor("gray").text(
          `Generated on ${new Date().toLocaleString("en-IN")} | This is a system-generated payslip.`,
          50, doc.page.height - 60, { align: "center" }
        );

        doc.end();
      });

      record.payslipUrl = `uploads/payslips/${record.salaryId}.pdf`;
    } catch (pdfErr) {
      console.error("⚠️ Payslip PDF generation failed:", pdfErr.message);
      // Don't block — salary is still marked paid even if PDF fails
    }

    await record.save();

    // Fire-and-forget email notification
    try {
      const { sendSalaryPaidEmail } = require("../utils/mailer");
      sendSalaryPaidEmail(record.employeeId, record);
    } catch (emailErr) {
      console.error("⚠️ Salary email failed:", emailErr.message);
    }

    await logAudit({
      action: "salary.paid", entity: "SalaryRecord", entityId: record._id,
      userId: req.user.id, details: { salaryId: record.salaryId, netSalary: record.netSalary }, req,
    });

    success(res, record);
  } catch (err) { next(err); }
};

// GET /api/hr/salaries/:id/payslip — download PDF
exports.downloadPayslip = async (req, res, next) => {
  try {
    const record = await SalaryRecord.findById(req.params.id);
    if (!record) throw new NotFoundError("Salary Record");
    if (!record.payslipUrl) throw new NotFoundError("Payslip not generated yet");

    const filePath = path.join(__dirname, "..", record.payslipUrl);
    if (!fs.existsSync(filePath)) throw new NotFoundError("Payslip file not found");

    res.download(filePath, `Payslip-${record.salaryId}.pdf`);
  } catch (err) { next(err); }
};

// PATCH /api/hr/salaries/:id/deductions — update deductions list
exports.updateDeductions = async (req, res, next) => {
  try {
    const { deductions } = req.body;
    if (!Array.isArray(deductions)) throw new ValidationError("deductions must be an array");

    const record = await SalaryRecord.findById(req.params.id);
    if (!record) throw new NotFoundError("Salary Record");
    if (record.status === "paid") throw new ValidationError("Cannot modify a paid salary record");

    record.deductions = deductions;
    await record.save();

    await logAudit({
      action: "salary.deductions_update", entity: "SalaryRecord", entityId: record._id,
      userId: req.user.id, details: { salaryId: record.salaryId }, req,
    });

    success(res, record);
  } catch (err) { next(err); }
};

// GET /api/hr/salaries/mine — employee's own salary records
exports.getMyRecords = async (req, res, next) => {
  try {
    const docs = await SalaryRecord.find({ employeeId: req.user.id })
      .sort("-year -month")
      .lean();
    success(res, docs);
  } catch (err) { next(err); }
};
