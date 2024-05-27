const express = require("express");
const router = express.Router();

//Controllers
const realtorController = require("../controllers/realtorController.js");

router.use((req, res, next) => {
  console.log("Router for realtor page was started");
  next();
});

/* 부동산 홈페이지 관련 */

//입주민이 보는 공인중개사 홈페이지
router.get(
  "/:sys_regno",
  realtorController.mainPage,
);

// 열람한 후기에 추가하기
router.get(
  "/openReview/:rv_id",
  realtorController.opening,
);


module.exports = router;
