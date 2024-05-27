const express = require("express");
const router = express.Router();

//Controllers
const agentController = require("../controllers/agentController.js");

router.use((req, res, next) => {
    console.log("Router for agent page was started");
    next();
  });

router.get("/:sys_regno", agentController.agentProfile);

router.get("/:sys_regno/info_edit", agentController.updateMainInfo);

router.post(
    "/:sys_regno/edit_process",
    agentController.updatingMainInfo,
);

router.get("/:sys_regno/entered_info_process", agentController.updateEnteredInfo);

router.post(
    "/:sys_regno/entered_info_update",
    agentController.updatingEnteredInfo,
);

module.exports = router;