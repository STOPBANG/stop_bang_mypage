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

        const response = {};
        response.r_username = r_username;

        // [start] 로그인 계정 정보 가져오기
        response.who = req.cookies.userType;
        postOptions = {
          host: 'stop_bang_auth_DB',
          port: process.env.PORT,
          path: `/db/resident/findById`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        }
        let requestBody = {username: r_username};
        result = await httpRequest(postOptions, requestBody);
        const r_id = result.body[0].id;
        // [end] 로그인 계정 정보 가져오기

        // [start] 공인중개사 공공데이터 가져오기 -> open api로 수정
        const apiResponse = await fetch(
          `http://openapi.seoul.go.kr:8088/${process.env.API_KEY}/json/landBizInfo/1/1/${req.params.ra_regno}`
        );
        const js = await apiResponse.json();

        if (js.landBizInfo == undefined)
          response.agent = null;
        else
          response.agent = js.landBizInfo.row[0];
        // [end] 공인중개사 공공데이터 가져오기

        // [start] 공인중개사 개인정보 가져오기
        getOptions = {
          host: 'stop_bang_auth_DB',
          port: process.env.PORT,
          path: `/db/agent/findByRaRegno/${req.params.ra_regno}`,
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        }
        requestBody = { username: r_username };

        httpRequest(getOptions, requestBody)
          .then((agentPriRes) => {
            if (agentPriRes.body.length)
              response.agentPrivate = agentPriRes.body[0];
            else
              response.agentPrivate = null;
            // [end] 공인중개사 개인정보 가져오기
            // [start] 북마크 정보 가져오기
            getBookOptions = {
              host: 'stop_bang_sub_feature_DB',
              port: process.env.PORT,
              path: `/db/bookmark/findAllByIdnRegno/${r_id}/${req.params.ra_regno}`,
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              }
            }
            httpRequest(getBookOptions)
            .then(bookRes => {
            if (bookRes.body.length)
              response.bookmark = bookRes.body[0].bm_id;
            else
              response.bookmark = 0;
            // [end] 북마크 정보 가져오기
            response.rating = 0;
            response.review = [];
            response.agentReviewData = [];
            response.statistics = [];
            response.report = null;
            response.openedReviewData = null;
            response.canOpen = null;
            response.tagsData = null;
            response.direction = '';
    
            return res.json(response);
            })
        });
      } catch (err) {
        console.error(err.stack);
        return res.json({});
      }
    }
  }
