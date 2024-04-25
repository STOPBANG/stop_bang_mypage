//Models
const e = require("express");
const realtorModel = require("../models/realtorModel.js");
const tags = require("../public/assets/tag.js");
const jwt = require("jsonwebtoken");
const { httpRequest } = require('../utils/httpRequest.js');

const makeStatistics = (reviews) => {
  let array = Array.from({ length: 10 }, () => 0);
  let stArray = new Array(10);
  reviews.forEach((review) => {
    if (review.tags !== null) {
      review.tags.split("").forEach((tag) => {
        array[parseInt(tag)]++;
      });
    }
  });
  for (let index = 0; index < array.length; index++) {
    stArray[index] = { id: index, tag: tags.tags[index], count: array[index] };
  }
  stArray.sort((a, b) => {
    return b.count - a.count;
  });
  return stArray;
};

module.exports = {

  mainPage: async (req, res) => {
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

      try {
        const response = {};

        response.r_username = r_username;

        // [start] 로그인 계정 정보 가져오기
        response.who = req.cookies.userType;
        // [end] 로그인 계정 정보 가져오기

        // [start] 공인중개사 공공데이터 가져오기
        // 서울시 공공데이터 api
        const apiResponse = await fetch(
          `http://openapi.seoul.go.kr:8088/${process.env.API_KEY}/json/landBizInfo/1/1/${req.params.ra_regno}`
        );
        const js = await apiResponse.json();
        const agentPublicData = js.landBizInfo.row[0];

        response.agent = agentPublicData;
        // [end] 공인중개사 공공데이터 가져오기

        // [start] 공인중개사 개인정보 가져오기
        postOptions = {
          host: 'stop_bang_auth_DB',
          port: process.env.PORT,
          path: `/db/agent/findByRaRegno/${req.params.ra_regno}`,
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
        requestBody = { username: r_username };

        result = await httpRequest(postOptions, requestBody);
        if (result.body.length)
          response.agentPrivate = result.body[0];
        else
          response.agentPrivate = null;
        // [end] 공인중개사 개인정보 가져오기

        // [start] 부동산 후기 가져오기
        getOptions = {
          host: 'stop_bang_review_DB',
          port: process.env.PORT,
          path: `/db/review/findAllByRegno/${req.params.ra_regno}`,
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
        result = await httpRequest(getOptions);
        if (result.body.length)
          response.review = result.body;
        else
          response.review = null;
        // [end] 부동산 후기 가져오기

        // 이부분도 DB 서버와 통신하는 것으로 변경해야 합니다
        response.rating = 0;
        response.agentReviewData = [];
        response.statistics = [];
        response.report = null;
        response.openedReviewData = null;
        response.canOpen = null;
        response.tagsData = null;
        response.bookmark = 0;
        response.direction = '';

        console.log(response);
        return res.json(response);

        // let getMyReport = await realtorModel.getReport(req.params, r_username);
        // let statistics;
        // if(getReviews.length > 0)
        //   statistics = makeStatistics(getReviews);
        // let getRating = await realtorModel.getRating(req.params);
        // getRating = getRating === null ? 0 : getRating;

        // if(who === 1) {
        //   let getOpened = await realtorModel.getOpenedReview(r_username);
        //   let canOpen = await realtorModel.canIOpen(r_username);
        //   let getBookmark = await realtorModel.getBookmarkByIdnRegno(
        //     req.params.ra_regno,
        //     r_username
        //   );

        //   response.openedReviewData = getOpened;
        //   response.canOpen = canOpen;
        //   response.bookmark = getBookmark[0][0] ? getBookmark[0][0] : 0;
        // }

        // if (getRating === null) {
        //   response.tagsData = null;
        // } else {
        //   response.tagsData = tags.tags;
        // }
      } catch (err) {
        console.error(err.stack);
        return res.json({});
      }
    }
  },
};
