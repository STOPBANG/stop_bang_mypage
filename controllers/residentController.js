const {httpRequest} = require("../utils/httpRequest.js");
const tags = require("../public/assets/tag.js");

module.exports = {
  myReview: (req, res) => {
    /* msa */
    const user_id = req.headers.id;
    const getOptions = {
      host: 'review-api',
      port: process.env.PORT,
      path: `/db/review/findAllByUserId/${user_id}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    httpRequest(getOptions)
      .then(result => {
        if (result === null) {
          console.log("error occured: ", err);
        } else {
          const body = result.body.map(element => {
            const apiUrl = `http://openapi.seoul.go.kr:8088/${process.env.API_KEY}/json/landBizInfo/1/1/${element.agentList_ra_regno}/`;
            return fetch(apiUrl)
              .then(apiResponse => {
                if (!apiResponse.ok) {
                  throw new Error(`HTTP error! Status: ${apiResponse.status}`);
                }
                return apiResponse.json();
              })
              .then(js => {
                if (js.landBizInfo && js.landBizInfo.row) {
                  const row = js.landBizInfo.row[0];
                  element.cmp_nm = row.CMP_NM;
                  element.address = row.ADDRESS;
                }
                return element;
              });
          })
          Promise.all(body)
            .then(body => {
              return res.json({
                reviews: body,
                tagsData: tags,
                path: 'myreview'
              })
            });
        }
      })
  },
  openReview: (req, res) => {
    /* msa */
    const user_id = req.headers.id;
    const getOptions = {
      host: 'sub-api',
      port: process.env.PORT,
      path: `/db/openedReview/findAllById/${user_id}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    };
    httpRequest(getOptions).then(openReviews => {
        if (openReviews === null) {
          console.log("error occured: ", err);
        } else {
          const body = openReviews.body.map(async element => {
            const getReviewOptions = {
              host: 'review-api',
              port: process.env.PORT,
              path: `/db/review/findAllByReviewId/${element.review_rv_id}`,
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              }
            };
            let review = await httpRequest(getReviewOptions);
            const apiUrl = `http://openapi.seoul.go.kr:8088/${process.env.API_KEY}/json/landBizInfo/1/1/${review.body[0].agentList_ra_regno}/`;
            return await fetch(apiUrl)
            .then(apiResponse => {
              if (!apiResponse.ok) {
                throw new Error(`HTTP error! Status: ${apiResponse.status}`);
              }
              return apiResponse.json();
              })
              .then(js => {
                if (js.landBizInfo && js.landBizInfo.row) {
                const row = js.landBizInfo.row[0];
                review.body[0].cmp_nm = row.CMP_NM;
                review.body[0].address = row.ADDRESS;
                }
                return review.body[0];
              });
          });
          Promise.all(body)
            .then(body => {
              return res.json({
                openReviews: body,
                tagsData: tags,
                path: 'openreview'
              });
            });
        }
    });
  },
  bookmark: (req, res) => {
    /* msa */
    const getOptions = {
      host: 'sub-api',
      port: process.env.PORT,
      path: `/db/bookmark/findALLById/${req.headers.id}`,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    httpRequest(getOptions)
      .then(result => {
        if (result === null) {
          console.log("error occured: ", err);
        } else {
          const body = result.body.map(element => {
            const apiUrl = `http://openapi.seoul.go.kr:8088/${process.env.API_KEY}/json/landBizInfo/1/1/${element.agentList_ra_regno}/`;
            return fetch(apiUrl)
              .then(apiResponse => {
                if (!apiResponse.ok) {
                  throw new Error(`HTTP error! Status: ${apiResponse.status}`);
                }
                return apiResponse.json();
              })
              .then(js => {
                if (js.landBizInfo && js.landBizInfo.row) {
                  const row = js.landBizInfo.row[0];
                  element.cmp_nm = row.CMP_NM;
                  element.address = row.ADDRESS;
                }
                return element;
              });
          })
          Promise.all(body)
            .then(body => {
              return res.json({
                bookmarks: body,
                path: "bookmark"
              });
            });
        }
      });
  },
  deleteBookmark: (req, res) => {
    /* msa */
    const postOptions = {
      host: 'sub-api',
      port: process.env.PORT,
      path: `/db/bookmark/delete`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const requestBody = {
      bm_id: req.params.id
    };

    httpRequest(postOptions, requestBody)
      .then(result => {
        if (result === null) {
          console.log("error occured: ", err);
        } else {
          return res.status(302).redirect("/resident/bookmark");
        }
      });
  },
  settings: (req, res) => {
    /* msa */
    const postOptions = {
      host: 'auth-api',
      port: process.env.PORT,
      path: `/db/resident/findById`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const requestBody = {
      username: req.headers.auth
    };
    httpRequest(postOptions, requestBody)
      .then(result => {
        if (result === null) {
          console.log("error occured: ", err);
        } else {
          return res.json({
            resident: result.body[0],
            path: "settings"
          });
        }
      });
  },
  updateSettings: (req, res) => {
    /* msa */
    const postOptions = {
      host: 'auth-api',
      port: process.env.PORT,
      path: `/db/resident/update`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const requestBody = req.body;
    if (!requestBody.birth) requestBody.birth = null;
    httpRequest(postOptions, requestBody)
      .then(result => {
        if (result === null) {
          console.log("error occured: ", err);
        } else {
          return res.status(302).redirect("/resident/settings");
        }
      });
  },
  updatePassword: (req, res) => {
    /* msa */
    const postOptions = {
      host: 'auth-api',
      port: process.env.PORT,
      path: `/db/resident/updatepw`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const requestBody = req.body;
    requestBody.username = req.headers.auth;
    httpRequest(postOptions, requestBody)
      .then(result => {
        if (result === null) {
          if (err === "pwerror") {
            res.json({ message: "입력한 비밀번호가 잘못되었습니다." });
          }
        } else {
          res.redirect("/resident/settings");
        }
      });
  },
  deleteAccount: async (req, res) => {
    try {
      /* msa */
      const postOptions = {
        host: 'auth-api',
        port: process.env.PORT,
        path: `/db/resident/delete`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      };
      const requestBody = req.body;

      httpRequest(postOptions, requestBody)
        .then(() => {
          res.clearCookie("userType");
          res.clearCookie("authToken");
          return res.status(302).redirect("/");
        });
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: error });
    }
  }
};