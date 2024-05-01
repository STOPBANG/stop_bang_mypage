const express = require("express");
const router = express.Router();

//Controllers
const agentController = require("../controllers/agentController.js");

router.use((req, res, next) => {
    console.log("Router for agent page was started");
    next();
  });

router.get("/:id", agentController.agentProfile);

router.get("/:id/update", agentController.updateEnteredInfo);

router.post(
    "/:id/update_process",
    agentController.upload.single("myImage"),
    agentController.updatingEnteredInfo,
);

router.get("/:id/info_edit", agentController.updateMainInfo);

router.post(
    "/:id/edit_process",
    agentController.upload.fields([{name: 'myImage1'}, {name: 'myImage2'}, {name: 'myImage3'}]),
    agentController.updatingMainInfo,
);