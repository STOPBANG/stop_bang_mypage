const e = require("express");
const tags = require("../public/assets/tag.js");
const jwt = require("jsonwebtoken");
const { httpRequest } = require("../utils/httpRequest.js");
const multer = require("multer");

const makeStatistics = (reviews) => {
  let array = Array.from({ length: 10 }, () => 0);
  let stArray = new Array(10);
  reviews.forEach((review) => {
    review.tags.split("").forEach((tag) => {
      array[parseInt(tag)]++;
    });
  });
  for (let index = 0; index < array.length; index++) {
    stArray[index] = { id: index, tag: tags.tags[index], count: array[index] };
  }
  stArray.sort((a, b) => {
    return b.count - a.count;
  });
  return stArray;
};

// gcp bucket
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID;
const GCP_KEYFILE_PATH = process.env.GCP_KEYFILE_PATH;
const GCP_BUCKET_NAME = process.env.GCP_BUCKET_NAME;

const { Storage } = require("@google-cloud/storage");

const storage = new Storage({
  projectId: GCP_PROJECT_ID,
  keyFilename: GCP_KEYFILE_PATH,
});
const bucket = storage.bucket(GCP_BUCKET_NAME);

// Check File Type
function checkFileType(file, cb) {
  // Allowed ext
  const filetypes = /jpeg|jpg|png/;
  // Check ext
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb("Error: Images Only!");
  }
}

function jsonKeyLowerCase(object) {
  if (Array.isArray(object)) {
    // 리스트<맵> 형식으로 넘어오는 경우 처리
    object.forEach((item, index) => {
      object[index] = Object.fromEntries(
        Object.entries(item).map(([key, value]) => [key.toLowerCase(), value])
      );
    });
    return object;
  } else {
    // 맵 형식으로 넘어오는 경우 처리
    return Object.fromEntries(
      Object.entries(object).map(([key, value]) => [key.toLowerCase(), value])
    );
  }
}

module.exports = {
  agentProfile: async (req, res, next) => {
    const sys_regno = req.params.sys_regno;
    const response = {};
    try {
        const getProfileOptions = {
            host: "auth-api",
            port: process.env.PORT,
            path: `/db/agent/findByRaRegno/${sys_regno}`,
            method: "GET",
            headers: {
            "Content-Type": "application/json",
            },
        };
        const profileRes = await httpRequest(getProfileOptions);
        // 공인중개사 계정으로 로그인되지 않은 경우 처리 + 다른 공인중개사 페이지 접근 제한

        let a_username = req.headers.auth;
        const apiResponse = await fetch(
          `http://openapi.seoul.go.kr:8088/${process.env.API_KEY}/json/landBizInfo/1/1/${sys_regno}/`
        );
        const js = await apiResponse.json();
        if (js.landBizInfo == undefined) {
          response.agent = null;
          response.agentMainInfo = null;
          response.agentSubInfo = null;
        } else {
          const agentData = jsonKeyLowerCase(js.landBizInfo.row[0]);
          response.agent = agentData;
          response.agentMainInfo = profileRes.body[0];
          response.agentSubInfo = profileRes.body[0];
        }

        /* gcs */
        // const profileImage = profileRes.body[0].a_profile_image; // 프로필 이미지
        if (profileRes.body[0].a_profile_image !== null) {
          response.agent.a_profile_image = bucket
            .file(`agent/${profileRes.body[0].a_profile_image}`)
            .publicUrl();
        }

        if (profileRes.body[0].a_image1 != undefined) {
          response.agentMainInfo.a_image1 = bucket
            .file(`agent/${profileRes.body[0].a_image1}`)
            .publicUrl();
        }

        if (profileRes.body[0].a_image2 != undefined) {
          response.agentMainInfo.a_image2 = bucket
            .file(`agent/${profileRes.body[0].a_image2}`)
            .publicUrl();
        }

        if (profileRes.body[0].a_image3 != undefined) {
          response.agentMainInfo.a_image3 = bucket
            .file(`agent/${profileRes.body[0].a_image3}`)
            .publicUrl();
        }

        // 초기화
        response.agentRating = 0;
        response.tagsData = null;
        response.agentReviewData = [];
        response.report = [];
        response.statistics = null;
        let residentIds = [];
        let reviewIds = [];
        if (profileRes == undefined) return res.json({});
        else if (profileRes.body[0].a_username != a_username)
          return res.json({});

        // [start] 리뷰 정보 가져오기
        getReviewOptions = {
          host: "review-api",
          port: process.env.PORT,
          path: `/db/review/findAllByRegno/${req.params.sys_regno}`,
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        };
        const rvRes = await httpRequest(getReviewOptions);
        console.log("리뷰 데이터를 가져옴");

        if (rvRes.body) {
            response.agentReviewData = rvRes.body;
            response.statistics = makeStatistics(response.agentReviewData);
            // 각 review 객체의 resident_r_id와 id를 배열에 저장
            residentIds = response.agentReviewData.map(review => review.resident_r_id);
            reviewIds = response.agentReviewData.map(review => review.id);
        
            console.log("Resident IDs:", residentIds);
            console.log("Review IDs:", reviewIds);
        } else {
            console.log("리뷰 데이터 가져오기 실패");
        }
        // [end] 리뷰 정보 가져오기

        // [start] 평균 평점 정보 가져오기
        getRatingOptions = {
            host: "review-ms",
            port: process.env.PORT,
            path: `/review/avgRate/${req.params.sys_regno}`,
            method: "GET",
            headers: {
            "Content-Type": "application/json",
            },
        };
        const rtRes = await httpRequest(getRatingOptions);
        if (rtRes.body) {
            response.agentRating = rtRes.body["avg"];
        } else response.agentRating = 0;

        console.log("평균평점", response.agentRating);
        // [end] 평균 평점 정보 가져오기

        response.tagsData = tags.tags;
        console.log("태그", (response.tagsData = tags.tags));


        // [start] 신고 정보 가져오기
        getReportOptions = {
            host: "bookmark-ms",
            port: process.env.PORT,
            path: `/agent/isReported/${a_username}`,
            method: "GET",
            headers: {
            "Content-Type": "application/json",
            },
        };
        const reportRes = await httpRequest(getReportOptions);
        if (reportRes) {
            console.log("공인중개사가 신고한 후기: ", reportRes.body);
            response.report = reportRes.body;
            console.log("main으로 보낼 report배열: ", response.report);
        }
        // [end] 신고 정보 가져오기


        // [start] 리뷰를 작성한 사용자의 username 가져오기
        const postUsernameOPtions = {
            host: "auth-api",
            port: process.env.PORT,
            path: `/db/resident/findByPk`,
            method: "POST",
            headers: {
            "Content-Type": "application/json",
            },
        };  
        for (let i = 0; i < response.agentReviewData.length; i++) {
            const review = response.agentReviewData[i];
            const userNamerequestBody = { resident_r_id: review.resident_r_id }; // 해당 review의 resident_r_id 사용
            try {
                const review_username = await httpRequest(postUsernameOPtions, userNamerequestBody);
                if (review_username) {
                    review.username = review_username.body[0].r_username;
                    console.log("후기 작성자: ", review.username);
                } else {
                    console.log("후기 작성자 가져오기 실패");
                }
            } catch (error) {
                console.error("후기 작성자 요청 중 오류 발생:", error);
            }
        }
        // [end] 리뷰를 작성한 사용자의 username 가져오기


        // [start] 신고 7회 이상인지 확인
        // const queryParams = reviewIds.join('/');
        // console.log("queryParams: ", queryParams);
        
        
        // 각 후기 객체에 대한 신고 횟수를 확인하고 추가
        for (let i = 0; i < response.agentReviewData.length; i++) {
            const review = response.agentReviewData[i];
            const rv_id = review.id;

            const reportCheckOptions = {
                host: "review-ms",
                port: process.env.PORT,
                path: `/review/reportCheck/${rv_id}`,
                method: "GET",
                headers: {
                "Content-Type": "application/json",
                },
            };
            
            try {
                const reportCheckRes = await httpRequest(reportCheckOptions);
                if (reportCheckRes) {
                    const report = reportCheckRes.body;
                    review.check_repo = report.result;
                    console.log("신고 횟수 확인: ", report.result);
                    if (report.result == 1) {
                        console.log("🚨신고가 7회 누적되어 더이상 접근할 수 없는 후기입니다.🚨");
                    } else if (report.result == 0) {
                        console.log("신고 7회 이하 후기");
                    }
                } else {
                    console.log("신고 횟수 확인 실패");
                }
            } catch (error) {
                console.error("신고 정보 요청 중 오류 발생:", error);
            }
        }
        // [end] 신고 7회 이상인지 확인

        return res.json(response);
    } catch (err) {
      console.log(err);
      console.error(err.stack);
    }
 }, // agentProfile 중괄호

  updateMainInfo: async (req, res) => {
    response = {};
    /* msa */
    const getUpdateMainInfoOptions = {
      host: "auth-api",
      port: process.env.PORT,
      path: `/db/agent/findByRaRegno/${req.params.sys_regno}`,
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    };
    httpRequest(getUpdateMainInfoOptions).then((updateMainInfoResult) => {
      response.image1 = updateMainInfoResult.body[0].a_image1;
      response.image2 = updateMainInfoResult.body[0].a_image2;
      response.image3 = updateMainInfoResult.body[0].a_image3;
      response.introduction = updateMainInfoResult.body[0].a_introduction;

      return res.json(response);
    });
  },

  updatingMainInfo: (req, res, next) => {
    /* msa */
    const putUpdatingMainInfoOptions = {
      host: "auth-api",
      port: process.env.PORT,
      path: `/db/agent/updateImage`,
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
    };
    let requestBody = {
      file: req.body.file,
      introduction: req.body.introduction,
      sys_regno: req.body.sys_regno,
    };
    httpRequest(putUpdatingMainInfoOptions, requestBody).then(
      (updatingMainInfoResult) => {
        return res.json(updatingMainInfoResult);
      }
    );
  },

  updateEnteredInfo: async (req, res) => {
    response = {};
    /* msa */
    const getUpdateEnteredInfoOptions = {
      host: "auth-api",
      port: process.env.PORT,
      path: `/db/agent/findByRaRegno/${req.params.sys_regno}`,
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    };
    httpRequest(getUpdateEnteredInfoOptions).then((updateEnteredInfoResult) => {
      response.profileImage = updateEnteredInfoResult.body[0].a_profile_image;
      let officeHour = updateEnteredInfoResult.body[0].a_office_hours;
      response.hours = officeHour != null ? officeHour.split(" ") : null;

      return res.json(response);
    });
  },

  updatingEnteredInfo: (req, res, next) => {
    let body = req.body;
    /* msa */
    const putUpdatingEnteredInfoOptions = {
      host: "auth-api",
      port: process.env.PORT,
      path: `/db/agent/updateEnteredInfo`,
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
    };
    let requestBody = {
      file: body.file,
      a_office_hours: body.a_office_hours,
      sys_regno: body.sys_regno,
    };
    httpRequest(putUpdatingEnteredInfoOptions, requestBody).then(
      (updatingEnteredInfoResult) => {
        return res.json(updatingEnteredInfoResult);
      }
    );
  },
};
