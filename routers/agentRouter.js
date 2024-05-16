const express = require("express");
const router = express.Router();

//Controllers
const agentController = require("../controllers/agentController.js");

router.use((req, res, next) => {
    console.log("Router for agent page was started");
    next();
  });

router.get("/:ra_regno", agentController.agentProfile);

router.get("/:ra_regno/info_edit", agentController.updateMainInfo);

router.post(
    "/:ra_regno/edit_process",
    agentController.upload.fields([{name: 'myImage1'}, {name: 'myImage2'}, {name: 'myImage3'}]),
    agentController.updatingMainInfo,
);

router.get("/:ra_regno/entered_info_process", agentController.updateEnteredInfo);

router.post(
    "/:ra_regno/entered_info_update",
    agentController.upload.single("myImage"),
    agentController.updatingEnteredInfo,
);

module.exports = router;