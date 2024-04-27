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
      try {
        const decoded = jwt.verify(
          req.cookies.authToken,
          process.env.JWT_SECRET_KEY
        );
        let r_username = decoded.userId;
        console.log("name: " + r_username);
        const response = {};
        response.r_username = r_username;

        // [start] 로그인 계정 정보 가져오기
        response.who = req.cookies.userType;
        // [end] 로그인 계정 정보 가져오기

        // [start] 공인중개사 공공데이터 가져오기 -> open api로 고치기
        const getOptions1 = {
          host: 'stop_bang_auth_DB',
          port: process.env.PORT,
          path: `/db/agentlist/findById/${req.params.ra_regno}`,
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }

        result = await httpRequest(getOptions1)
        if (result.body.length)
          response.agent = result.body[0];
        else
          response.agent = null;
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

        // 이부분도 DB 서버와 통신하는 것으로 변경해야 합니다
        response.rating = 0;
        response.review = [];
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
      } catch (err) {
        console.error(err.stack);
        return res.json({});
      }
    }
  }
