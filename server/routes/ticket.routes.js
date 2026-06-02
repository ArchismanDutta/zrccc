// routes/ticket.routes.js
const router = require("express").Router();
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");
const { PERMISSIONS: P } = require("../config/roles");
const t = require("../controllers/ticket.controller");

router.use(authenticate);

router.post("/",              authorize(P.TICKET_CREATE),  t.createTicket);
router.get("/",               authorize(P.TICKET_READ),    t.listTickets);
router.get("/:id",            authorize(P.TICKET_READ),    t.getTicketById);
router.patch("/:id/status",   authorize(P.TICKET_UPDATE),  t.updateTicketStatus);
router.patch("/:id/assign",   authorize(P.TICKET_ASSIGN),  t.assignTicket);
router.post("/:id/reply",     authorize(P.TICKET_REPLY),   t.addReply);

module.exports = router;
