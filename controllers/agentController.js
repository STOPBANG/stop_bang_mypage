const e = require("express");
const tags = require("../public/assets/tag.js");
const jwt = require("jsonwebtoken");
const { httpRequest } = require('../utils/httpRequest.js');
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

const {Storage} = require('@google-cloud/storage');

const storage = new Storage({
  projectId: GCP_PROJECT_ID,
  keyFilename: GCP_KEYFILE_PATH
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

function jsonKeyLowerCase(object){
    if(Array.isArray(object)){
    // 리스트<맵> 형식으로 넘어오는 경우 처리
        object.forEach((item, index) =>{
            object[index] = Object.fromEntries(Object.entries(item).map(([key, value]) => [key.toLowerCase(), value]));
        });
        return object;
    }
    else {
        // 맵 형식으로 넘어오는 경우 처리
        return Object.fromEntries(Object.entries(object).map(([key, value]) => [key.toLowerCase(), value]));
    }
}

module.exports = {
    upload: multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: 10 * 1024 * 1024 },
        fileFilter: function (req, file, cb) {
            checkFileType(file, cb);
        },
    }),

    agentProfile: async (req, res, next) => {
        const ra_regno = req.params.ra_regno;
        const response = {};
        try {
            // const decoded = jwt.verify(
            //     req.cookies.authToken,
            //     process.env.JWT_SECRET_KEY
            //   );
            // let a_username = decoded.userId;
            const getProfileOptions = {
            host: 'stop_bang_auth_DB',
            port: process.env.PORT,
            path: `/db/agent/findByRaRegno/${ra_regno}`,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
            };
            httpRequest(getProfileOptions)
            .then(async (profileRes) => {
                // 공인중개사 계정으로 로그인되지 않은 경우 처리 + 다른 공인중개사 페이지 접근 제한
                let a_username = req.headers.auth;
                const apiResponse = await fetch(
                `http://openapi.seoul.go.kr:8088/${process.env.API_KEY}/json/landBizInfo/1/1/${ra_regno}/`
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
                const profileImage = profileRes.body[0].a_profile_image;
                if (profileImage !== null) {
                response.a_profile_image = bucket.file(`agent/${profileImage}`).publicUrl();
                }

              // 초기화
            response.agentRating = 0; // default (통신 추가해야함)
            response.tagsData = null; // default (통신 추가해야함)
            response.agentReviewData = [];
            response.report = null;
            response.statistics = null;
            console.log(profileRes.body[0]);
            if (profileRes == undefined)
            return res.json({});
            else if (profileRes.body[0].a_username != a_username)
            return res.json({});

            // [start] 리뷰 정보 가져오기
            getReviewOptions = {
            host: "stop_bang_review_DB",
            port: process.env.PORT,
            path: `/db/review/findAllByRegno/${req.params.ra_regno}`,
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
            };
            requestBody = { username: a_username };
            httpRequest(getReviewOptions).then(async (rvRes) => {
            console.log("리뷰 데이터를 가져옴");
            if (rvRes.body && rvRes.body.length) {
                response.agentReviewData = rvRes.body;

                // 각 리뷰에 대한 신고 횟수 가져오기
                for (let review of response.agentReviewData) {
                const rv_id = review.id;

                try {
                    const reportCheckRes = await httpRequest({
                    host: "stop_bang_review",
                    port: process.env.PORT,
                    path: `/review/reportCheck/${rv_id}`,
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    });

                    console.log("reportCheckRes:", reportCheckRes);
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

            response.statistics = makeStatistics(response.agentReviewData);
            // [start] 평균 평점 정보 가져오기
            getRatingOptions = {
                host: "stop_bang_review",
                port: process.env.PORT,
                path: `/review/avgRate/${req.params.ra_regno}`,
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
                console.log("평균평점" ,response.rating);
            // [end] 평균 평점 정보 가져오기
            }); 
                // [end] 평균 평점 정보 가져오기
            response.tagsData = tags.tags
            console.log("태그" ,response.tagsData = tags.tags); 

            return res.json(response);
            });
        });
    } catch (err) {
        console.error(err.stack);
    }
},
    updateMainInfo: async (req, res) => {
        response = {};
        /* msa */
        const getUpdateMainInfoOptions = {
            host: 'stop_bang_auth_DB',
            port: process.env.PORT,
            path: `/db/agent/findByRaRegno/${req.params.ra_regno}`,
            method: 'GET',
            headers: {
                "Content-Type": "application/json",
            },
        }
        httpRequest(getUpdateMainInfoOptions)
        .then(updateMainInfoResult => {

            response.image1 = updateMainInfoResult.body[0].a_image1;
            response.image2 = updateMainInfoResult.body[0].a_image2;
            response.image3 = updateMainInfoResult.body[0].a_image3;
            response.introduction = updateMainInfoResult.body[0].a_introduction;
            
            return res.json(response);
        })
    },

    updatingMainInfo: (req, res, next) => {
        response = {};
        /* msa */
        const putUpdatingMainInfoOptions = {
            host: 'stop_bang_auth_DB',
            port: process.env.PORT,
            path: `/db/agent/updateImage`,
            method: 'PUT',
            headers: {
                "Content-Type": "application/json",
            },
        };
        let requestBody = { files: req.files, introduction: req.body.introduction, sys_regno: req.body.sys_regno};
        httpRequest(putUpdatingMainInfoOptions, requestBody)
        .then(updatingMainInfoResult => { 
            return res.json(updatingMainInfoResult);
        })
        //
        // agentModel.updateMainInfo(req.params.id, req.files, req.body, () => {
        // if (res === null) {
        //     if (error === "imageError") {
        //     res.render('notFound.ejs', {message: "이미지 크기가 너무 큽니다. 다른 사이즈로 시도해주세요."})
        //     }
        // } else {
        //     res.locals.redirect = `/agent/${req.params.id}`;
        //     next();
        // }
        // });
    },

    updateEnteredInfo: async (req, res) => {
        response = {};
        /* msa */
        const getUpdateEnteredInfoOptions = {
          host: 'stop_bang_auth_DB',
          port: process.env.PORT,
          path: `/db/agent/findByRaRegno/${req.params.ra_regno}`,
          method: 'GET',
          headers: {
              "Content-Type": "application/json",
          },
        }
        httpRequest(getUpdateEnteredInfoOptions)
        .then(updateEnteredInfoResult => {
          response.profileImage = updateEnteredInfoResult.body[0].a_profile_image;
          let officeHour = updateEnteredInfoResult.body[0].a_office_hours;
          response.hours = officeHour != null ? officeHour.split(' ') : null;
          
          return res.json(response);
        })
      },    

    updatingEnteredInfo: (req, res, next) => {
        try {
        let filename = '';
        /* gcs */
        if(req.file) {
            const date = new Date();
            const fileTime = date.getTime();
            filename = `${fileTime}-${req.file.originalname}`;
            const gcsFileDir = `agent/${filename}`;
            // gcs에 agent 폴더 밑에 파일이 저장
            const blob = bucket.file(gcsFileDir);
            const blobStream = blob.createWriteStream();

            blobStream.on('finish', () => {
            console.log('gcs upload successed');
            });

            blobStream.on('error', (err) => {
            console.log(err);
            });

            blobStream.end(req.file.buffer);
        }
        req.file.filename = filename;
        agentModel.updateEnterdAgentInfo(req.params.id, req.file, req.body, () => {
            res.redirect(`/agent/${req.params.id}`);
        });
        } catch(err) {
        console.log('updating info err : ', err);
        }
  }
}