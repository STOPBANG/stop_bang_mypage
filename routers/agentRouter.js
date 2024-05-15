const express = require("express");
const router = express.Router();

//Controllers
const agentController = require("../controllers/agentController.js");

router.use((req, res, next) => {
    console.log("Router for agent page was started");
    next();
  });

router.get("/:ra_regno", agentController.agentProfile);

router.get("/:sys_regno/info_edit", agentController.updateMainInfo);

// router.post(
//     "/:id/edit_process",
//     agentController.upload.fields([{name: 'myImage1'}, {name: 'myImage2'}, {name: 'myImage3'}]),
//     agentController.updatingMainInfo,
// );

router.get("/:id/entered_info_process", agentController.updateEnteredInfo);

//  부동산 홈페이지 영업시간, 전화번호 수정 사항 저장
// router.post(
//     "/:id/entered_info_update",
//     agentController.upload.single("myImage"),
//     agentController.updatingEnteredInfo,
// );

module.exports = router;