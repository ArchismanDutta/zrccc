const router = require("express").Router();
const authenticate = require("../middleware/authenticate");
const d = require("../controllers/department.controller");

router.use(authenticate);
router.get("/", d.listDepartments);

module.exports = router;
