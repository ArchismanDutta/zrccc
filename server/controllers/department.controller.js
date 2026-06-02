const Department = require("../models/Department");
const { success } = require("../utils/response");

exports.listDepartments = async (req, res, next) => {
  try {
    const departments = await Department.find({}).sort("displayName").lean();
    success(res, departments);
  } catch (err) { next(err); }
};
