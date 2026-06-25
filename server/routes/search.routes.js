// routes/search.routes.js
const router       = require("express").Router();
const authenticate = require("../middleware/authenticate");
const search       = require("../controllers/search.controller");

router.get("/", authenticate, search.search);

module.exports = router;
