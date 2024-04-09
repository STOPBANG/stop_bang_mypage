//Models
const e = require("express");
const realtorModel = require("../models/realtorModel.js");
const tags = require("../public/assets/tag.js");
const jwt = require("jsonwebtoken");

module.exports = {

  mainPage: async (req, res, next) => {
    //쿠키로부터 로그인 계정 알아오기
    if (req.cookies.authToken == undefined)
      res.render("notFound.ejs", { message: "로그인이 필요합니다" });
    else {
      const decoded = jwt.verify(
      req.cookies.authToken,
      process.env.JWT_SECRET_KEY
      );
      let r_username = decoded.userId;
      if (r_username === null)
        res.render("notFound.ejs", { message: "로그인이 필요합니다" });
      res.locals.r_username = r_username;
      console.log(res.locals.r_username);
      try {
        let who = await realtorModel.whoAreYou(r_username);
        let agent = await realtorModel.getRealtorPublicData(req.params.ra_regno);
        let agentPrivate = await realtorModel.getRealtorPrivateData(req.params.ra_regno);
        let getReviews = await realtorModel.getReviewByRaRegno(
          req.params.ra_regno,
          r_username
        );
        let getMyReport = await realtorModel.getReport(req.params, r_username);
        let statistics;
        if(getReviews.length > 0)
          statistics = makeStatistics(getReviews);
        let getRating = await realtorModel.getRating(req.params);
        getRating = getRating === null ? 0 : getRating;

        res.locals.who = who;
        res.locals.agent = agent[0];
        res.locals.agentPrivate = agentPrivate.length ? agentPrivate[0] : null;
        res.locals.agentReviewData = getReviews;
        res.locals.report = getMyReport;
        res.locals.statistics = statistics;
        res.locals.rating = getRating;

        res.locals.title = `${res.locals.agent.cmp_nm}의 후기`;
        res.locals.direction = `/review/${req.params.ra_regno}/create`;
        res.locals.cmpName = res.locals.agent.cmp_nm;

        res.locals.openedReviewData = null;
        res.locals.canOpen = null;
        res.locals.bookmark = 0;

        if(who === 1) {
          let getOpened = await realtorModel.getOpenedReview(r_username);
          let canOpen = await realtorModel.canIOpen(r_username);
          let getBookmark = await realtorModel.getBookmarkByIdnRegno(
            req.params.ra_regno,
            r_username
          );
          
          res.locals.openedReviewData = getOpened;
          res.locals.canOpen = canOpen;
          res.locals.bookmark = getBookmark[0][0] ? getBookmark[0][0] : 0;
        }

        if (getRating === null) {
          res.locals.tagsData = null;
        } else {
          res.locals.tagsData = tags.tags;
        }
      } catch (err) {
        console.error(err.stack);
      }
      next();
    }
  },

  realtorView: (req, res) => {
    res.render("realtor/realtorIndex.ejs");
  },

  updateBookmark: (req, res) => {
    if (req.cookies.authToken == undefined)
      res.render("notFound.ejs", { message: "로그인이 필요합니다" });
    else {
      const decoded = jwt.verify(
        req.cookies.authToken,
        process.env.JWT_SECRET_KEY
      );
      const r_username = decoded.userId;
      if (r_username === null)
        res.render("notFound.ejs", { message: "로그인이 필요합니다" });
      else {
        let body = {
          r_username: r_username,
          raRegno: req.params.ra_regno,
          isBookmark: req.body.bookmarkData,
        };
        realtorModel.updateBookmark(r_username, body, (result, err) => {
          if (result === null) {
            console.log("error occured: ", err);
          } else {
            console.log(result);
            res.redirect(`/realtor/${req.params.ra_regno}`);
          }
        });
      }
    }
  }
};
