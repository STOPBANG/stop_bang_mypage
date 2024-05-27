const express = require("express");
const router = express.Router();

//Controllers
const agentController = require("../controllers/agentMypageController.js");

// [msa] agent_mypage
//agent 사용자 정보 확인용
router.get("/settings", agentController.settings);

// [msa] agent_mypage
router.post(
  "/settings/update",
  agentController.updateSettings
);

// [msa] agent_mypage
router.post(
  "/settings/pwupdate",
  agentController.updatePassword,
);

// [msa] agent_mypage
router.post(
  "/deleteAccount",
  agentController.deleteAccount
);

module.exports = router;
