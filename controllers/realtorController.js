//Models
const e = require("express");
const realtorModel = require("../models/realtorModel.js");
const tags = require("../public/assets/tag.js");
const jwt = require("jsonwebtoken");
const { httpRequest } = require("../utils/httpRequest.js");

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
      let r_id = null;
      let r_point = null;
      const response = {};
      response.r_username = r_username;

      // [start] 로그인 계정 정보 가져오기
      response.who = req.cookies.userType;
      // resident인 경우
      postResidentOptions = {
        host: "stop_bang_auth_DB",
        port: process.env.PORT,
        path: `/db/resident/findById`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      };
      let requestBody = { username: r_username };
      residentResult = await httpRequest(postResidentOptions, requestBody);
      // result.body[0]가 undefined인 경우
      if (residentResult.body.length){
        r_id = residentResult.body[0].id;
        r_point = residentResult.body[0].r_point;
      }
      else{
        // agent인 경우 (resident가 아니라면)
        postAgentOptions = {
          host: "stop_bang_auth_DB",
          port: process.env.PORT,
          path: `/db/agent/findById`,
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        };
        let requestBody = { username: r_username };
        agentResult = await httpRequest(postAgentOptions, requestBody);
        // result.body[0]가 undefined인 경우
        if (agentResult.body.length){
          r_id = agentResult.body[0].id;
          r_point = agentResult.body[0].r_point;
        }
      }
      // [end] 로그인 계정 정보 가져오기

      if (response.rating == null) response.tagsData = null;
      else response.tagsData = tags.tags;

      if (r_point < 2) response.canOpen = 0;
      else response.canOpen = 1;

      response.direction = `/review/${req.params.ra_regno}/create`;
      response.report = null;
      response.bookmark = 0;
      response.openedReviewData = null;
      response.review = []

      // [start] 공인중개사 공공데이터 가져오기 -> open api로 수정
      const apiResponse = await fetch(
        `http://openapi.seoul.go.kr:8088/${process.env.API_KEY}/json/landBizInfo/1/1/${req.params.ra_regno}`
      );
      const js = await apiResponse.json();

      if (js.landBizInfo == undefined) response.agent = null;
      else response.agent = js.landBizInfo.row[0];
      // [end] 공인중개사 공공데이터 가져오기

      // [start] 공인중개사 개인정보 가져오기
      getOptions = {
        host: "stop_bang_auth_DB",
        port: process.env.PORT,
        path: `/db/agent/findByRaRegno/${req.params.ra_regno}`,
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      };
      requestBody = { username: r_username };

      httpRequest(getOptions, requestBody).then((agentPriRes) => {
        if (agentPriRes.body.length)
          response.agentPrivate = agentPriRes.body[0];
        else response.agentPrivate = null;
        // [end] 공인중개사 개인정보 가져오기

        response.rating = 0; // 수정 중
        // [start] 리뷰 정보 가져오기
        getReviewOptions = {
          host: "stop_bang_review_DB",
          port: process.env.PORT,
          path: `/db/review//findAllByRegno/${req.params.ra_regno}`,
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        };
        requestBody = { username: r_username };
        httpRequest(getReviewOptions).then((rvRes) => {
          if (rvRes.body.length) response.review = rvRes.body;
          // [end] 리뷰 정보 가져오기

          response.agentReviewData = response.review;
          response.statistics = makeStatistics(response.review);

          // [start] 평균 평점 정보 가져오기
          console.log("rvres의 body is : "+JSON.stringify(rvRes.body));
          
          let reviewCount = rvRes.body.length;
          console.log("reviewCount is :  "+ reviewCount);

          if (reviewCount > 0){
            let ratingSum = 0;

            for (let review of rvRes.body){
              ratingSum += review.rating
              console.log("ratingsum is : "+ ratingSum)
            }              
            console.log("avg is "+ ratingSum/reviewCount);

            response.rating = (ratingSum/reviewCount);
            console.log(response.rating);

          }
          else{
            response.rating = 0 ;
          }
          // [end] 평균 평점 정보 가져오기
          
          if (response.who == 1) {
            // [start] 북마크 정보 가져오기
            getBookOptions = {
              host: "stop_bang_sub_DB",
              port: process.env.PORT,
              path: `/db/bookmark/findAllByIdnRegno/${r_id}/${req.params.ra_regno}`,
              method: "GET",
              headers: {
                "Content-Type": "application/json",
              },
            };
            httpRequest(getBookOptions).then((bookRes) => {
              if (bookRes.body.length)
                response.bookmark = bookRes.body[0].bm_id;
              // else response.bookmark = 0;
              // [end] 북마크 정보 가져오기

              // [start] 신고 정보 가져오기
              for (let review of response.review) {
                getReportOptions = {
                  host: "stop_bang_sub_DB",
                  port: process.env.PORT,
                  path: `/db/report/findOne/${review.rv_id}/${r_username}`,
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json",
                  },
                };
                httpRequest(getReportOptions).then((reportRes) => {
                  if (reportRes.body.length)
                    response.report += reportRes.body[0];
                });
              }
              // [end] 신고 정보 가져오기

              // [start] 후기 열람 여부 가져오기
              getOpenedReviewOptions = {
                host: "stop_bang_sub_DB",
                port: process.env.PORT,
                path: `/db/openedReview/findAllById/${r_id}`,
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                },
              };
              httpRequest(getOpenedReviewOptions).then((openedReviewRes) => {
                if (openedReviewRes.body.length)
                  response.openedReviewData = openedReviewRes.body[0];
                // else response.openedReviewData = null;
                // [end] 후기 열람 여부 가져오기

                return res.json(response);
              });
            });
          }
          else return res.json(response);
        });
      });
    } catch (err) {
      console.error(err.stack);
      return res.json({});
    }
  },
};
