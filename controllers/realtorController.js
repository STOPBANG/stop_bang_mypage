//Models
const e = require("express");
const realtorModel = require("../models/realtorModel.js");
const tags = require("../public/assets/tag.js");
const jwt = require("jsonwebtoken");
const { httpRequest } = require("../utils/httpRequest.js");

// gcp bucket
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID;
const GCP_KEYFILE_PATH = process.env.GCP_KEYFILE_PATH;
const GCP_BUCKET_NAME = process.env.GCP_BUCKET_NAME;

const {Storage} = require('@google-cloud/storage');
const storage = new Storage({
  projectId: GCP_PROJECT_ID,
  keyFilename: GCP_KEYFILE_PATH
});
const bucket = storage.bucket(GCP_BUCKET_NAME);

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
      response.r_id = r_id;
      // [end] 로그인 계정 정보 가져오기

      if (response.rating == null) response.tagsData = null;
      else response.tagsData = tags.tags;

      if (r_point < 2) response.canOpen = 0;
      else response.canOpen = 1;

      response.direction = `/review/${req.params.sys_regno}/create`;
      response.report = [];
      response.bookmark = 0;
      response.openedReviewData = [];
      response.review = []
      // 아래 줄 추가
      const ra_regno = req.params.ra_regno;
      
      // [start] 공인중개사 공공데이터 가져오기 -> open api로 수정
      const apiResponse = await fetch(
        `http://openapi.seoul.go.kr:8088/${process.env.API_KEY}/json/landBizInfo/1/1/${req.params.sys_regno}`
      );
      const js = await apiResponse.json();

      if (js.landBizInfo == undefined) response.agent = null;
      else response.agent = js.landBizInfo.row[0];
      // [end] 공인중개사 공공데이터 가져오기

      // [start] 공인중개사 개인정보 가져오기
      getOptions = {
        host: "stop_bang_auth_DB",
        port: process.env.PORT,
        path: `/db/agent/findByRaRegno/${req.params.sys_regno}`,
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      };

      httpRequest(getOptions).then((agentPriRes) => {
        if (agentPriRes.body.length){
          response.agentPrivate = agentPriRes.body[0];
                    
          /* gcs */
          if (agentPriRes.body[0].a_profile_image != undefined) {
            response.agentPrivate.a_profile_image = bucket.file(`agent/${agentPriRes.body[0].a_profile_image}`).publicUrl();
          }
          else{
            response.agentPrivate.a_profile_image = null;
          }

          if(agentPriRes.body[0].a_image1 != undefined){
              response.agentPrivate.a_image1 = bucket.file(`agent/${agentPriRes.body[0].a_image1}`).publicUrl();
          }
          else{
            response.agentPrivate.a_image1 = null;
          }

          if(agentPriRes.body[0].a_image2 != undefined){
              response.agentPrivate.a_image2 = bucket.file(`agent/${agentPriRes.body[0].a_image2}`).publicUrl();
          }
          else{
            response.agentPrivate.a_image2 = null;
          }

          if(agentPriRes.body[0].a_image3 != undefined){
              response.agentPrivate.a_image3 = bucket.file(`agent/${agentPriRes.body[0].a_image3}`).publicUrl();
          }
          else{
            response.agentPrivate.a_image3 = null;
          }
        }
        else response.agentPrivate = null;
        // [end] 공인중개사 개인정보 가져오기
        
        response.rating = 0;
        // [start] 리뷰 정보 가져오기
        getReviewOptions = {
          host: "stop_bang_review_DB",
          port: process.env.PORT,
          path: `/db/review/findAllByRegno/${req.params.sys_regno}`,
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        };
        requestBody = { username: r_username };
        httpRequest(getReviewOptions).then(async (rvRes) => {
          console.log("리뷰 데이터를 가져옴");
          if (rvRes.body.length) {
            response.review = rvRes.body;
        
            // 각 리뷰에 대한 신고 횟수 가져오기
            for (let review of response.review) {
              const rv_id = review.id;
              review.rv_id = rv_id;
              review.ra_regno = ra_regno;
        
              try {
                // 리뷰를 작성한 사용자의 username 가져오기
                const postUsernameOPtions = {
                  host: "stop_bang_auth_DB",
                  port: process.env.PORT,
                  path: `/db/resident/findByPk`,
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                };
                const requestBody = {resident_r_id: review.resident_r_id};
                const review_username = await httpRequest(postUsernameOPtions, requestBody)
                review.username=review_username.body[0].r_username;
                
                const reportCheckRes = await httpRequest({
                  host: "stop_bang_review",
                  port: process.env.PORT,
                  path: `/review/reportCheck/${rv_id}`,
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json",
                  },
                });
        
                console.log("reportCheckRes:", reportCheckRes.body);
                console.log("신고 횟수를 확인함");
        
                review.check_repo = reportCheckRes.body.result;
                console.log("신고 횟수 확인: ", reportCheckRes.body.result);
        
                if (reportCheckRes.body.result == 1) {
                  console.log("🚨신고가 7회 누적되어 더이상 접근할 수 없는 후기입니다.🚨");
                } else if (reportCheckRes.body.result == 0) {
                  console.log("신고 7회 이하 후기");
                }
              } catch (error) {
                console.error("Error while fetching report check:", error);
              }
            }
          }
          // [end] 리뷰 정보 가져오기

          response.agentReviewData = response.review;
          response.statistics = makeStatistics(response.review);

          // [start] 평균 평점 정보 가져오기
          getRatingOptions = {
            host: "stop_bang_review",
            port: process.env.PORT,
            path: `/review/avgRate/${req.params.sys_regno}`,
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          };
          httpRequest(getRatingOptions).then((rtRes) => {
            if(rtRes.body) { 
              response.rating = rtRes.body['avg'];
            }
            else{
              response.rating = 0;
            }
          // [end] 평균 평점 정보 가져오기
          });

          if (response.rating == null) response.tagsData = null;
          else response.tagsData = tags.tags;
          
          if (response.who == 1) {
            // [start] 북마크 정보 가져오기
            getBookOptions = {
              host: "stop_bang_sub_DB",
              port: process.env.PORT,
              path: `/db/bookmark/findAllByIdnRegno/${r_id}/${req.params.sys_regno}`,
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
                  if (reportRes.body) {
                    console.log("reportRes!!!!!: ", reportRes.body);
                    response.report.push(reportRes.body); 
                    console.log("report_rv_id: ", reportRes.body.repo_rv_id);
                  }
                  else {
                    console.log("신고 정보를 가져올 수 없음");
                }
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
                  // response.openedReviewData = openedReviewRes.body[0];
                  // response.openedReviewData = openedReviewRes.body.length ? openedReviewRes.body[0] : [];
                  response.openedReviewData = openedReviewRes.body.length ? openedReviewRes.body : [];
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

  // 열람한 후기에 추가하기
  // router.post(
  //   "/openReview/:rv_id",
  //   realtorController.opening,
  // );
  opening: async (req, res) => {
    console.log("MS_realtorController - 'opening' started");

    try {
      const decoded = jwt.verify(
        req.cookies.authToken,
        process.env.JWT_SECRET_KEY
      );
      // let r_username = decoded.userId;
      let r_id = decoded.id;
      let r_point = null; // 유저의 포인트를 가져와야 할듯...
      const response = {};
      // console.log(req.body);
      const rv_id = req.params.rv_id;

      postOpenOptions = {
        host: "stop_bang_sub_DB",
        port: process.env.PORT,
        path: `/db/openedReview/create`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      };
      let requestBody = { 
        r_id: r_id,
        rv_id: rv_id,
      };
      console.log("Request body: ", requestBody);

      openResult = await httpRequest(postOpenOptions, requestBody);
      console.log("waiting for openResult...");
      console.log("openResult: ", openResult);
      if (openResult.body.length){
        response = openResult.body[0];
        console.log("opdenResult.body: ", openResult.body[0]);
      }
      return res.json(response);
    } catch (error) {
      console.log();
    }

  }
};
