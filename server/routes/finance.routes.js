// routes/finance.routes.js
const router = require("express").Router();
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const f = require("../controllers/finance.controller");

router.use(authenticate);

// Finance dashboard
router.get("/dashboard", authorize("finance:dashboard"), f.dashboard);
router.get("/client-payments", authorize("invoices:read:all"), f.clientPayments);

// Invoices
router.post("/invoices",           authorize("invoices:create"),          f.createInvoice);
router.get("/invoices",            authorize("invoices:read:all", "invoices:read:own"), f.listInvoices);
router.get("/invoices/:id",        authorize("invoices:read:all", "invoices:read:own"), f.getInvoice);
router.patch("/invoices/:id",        authorize("invoices:update"),                          f.updateInvoice);
router.post("/invoices/:id/send",    authorize("invoices:send"),                            f.sendInvoice);
router.post("/invoices/:id/cancel",  authorize("invoices:update"),                          f.cancelInvoice);
router.get("/invoices/:id/pdf",      authorize("invoices:read:all", "invoices:read:own"),   f.downloadInvoicePdf);

// Payments
router.post("/payments",             authorize("payments:log"),                             f.logPayment);
router.get("/payments",              authorize("payments:read"),                            f.listPayments);
router.delete("/payments/:id",       authorize("payments:log"),                             f.voidPayment);

module.exports = router;
