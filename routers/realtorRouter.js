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
  "/:ra_regno",
  realtorController.mainPage,
);

module.exports = router;
