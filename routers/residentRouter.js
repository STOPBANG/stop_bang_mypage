const router = require("express").Router();
const residentController = require("../controllers/residentController");

router.get(
  "/myReview",
  residentController.myReview
);
router.get(
  "/openreview",
  residentController.openReview
);
router.get(
  "/bookmark",
  residentController.bookmark
);
router.post(
  "/bookmark/:id/delete",
  residentController.deleteBookmark
);
router.get(
  "/settings",
  residentController.settings
);

router.post(
  "/settings/update",
  residentController.updateSettings
);

router.post(
  "/settings/pwupdate",
  residentController.updatePassword
);

router.post(
  "/deleteAccount",
  residentController.deleteAccount
);

module.exports = router;