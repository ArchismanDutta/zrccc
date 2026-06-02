// routes/client.routes.js
const router = require("express").Router();
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const c = require("../controllers/client.controller");

router.use(authenticate);

router.post("/",           authorize("clients:create"),       c.createClient);
router.get("/",            authorize("clients:read:all", "clients:read:own"), c.listClients);
router.get("/:id",         authorize("clients:read:all", "clients:read:own"), c.getClient);
router.patch("/:id",       authorize("clients:update"),       c.updateClient);
router.patch("/:id/status", authorize("clients:update"),      c.changeStatus);
router.delete("/:id",      authorize("clients:delete"),       c.archiveClient);

module.exports = router;
