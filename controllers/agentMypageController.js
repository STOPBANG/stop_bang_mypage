//Models
const {httpRequest} = require('../utils/httpRequest.js');
const jwt = require("jsonwebtoken");

module.exports = {
  settings: (req, res) => {
    let authToken;
    try {
      authToken = jwt.decode(req.cookies.authToken);
    } catch(err) {
    }
    /* msa */
    const postOptions = {
      host: 'stop_bang_auth_DB',
      port: process.env.PORT,
      path: `/db/agent/findById`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const requestBody = {username: authToken.userId};
    httpRequest(postOptions, requestBody)
      .then(result => {
        if (result === null) {
          console.log("error occured: ", err);
        } else {
          res.json({
            agent: result.body[0],
            path: "settings"
          });
        }
      });
  },

  updateSettings: (req, res) => {
    /* msa */
    const postOptions = {
      host: 'stop_bang_auth_DB',
      port: process.env.PORT,
      path: `/db/agent/update`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const requestBody = req.body;
    httpRequest(postOptions, requestBody)
      .then(result => {
        if (result === null) {
          console.log("error occured: ", err);
        } else {
          return res.status(302).redirect("/agent/settings");
        }
      });
  },
  updatePassword: (req, res) => {
    /* msa */
    const postOptions = {
      host: 'stop_bang_auth_DB',
      port: process.env.PORT,
      path: `/db/agent/updatepw`,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const requestBody = req.body;
    httpRequest(postOptions, requestBody)
      .then(result => {
        if (result === null) {
          if (err === "pwerror") {
            res.json({ message: "입력한 비밀번호가 잘못되었습니다." });
          }
        } else {
          res.redirect("/agent/settings");
        }
      });
  },

  deleteAccount: async (req, res) => {
    try {
      /* msa */
      const postOptions = {
        host: 'stop_bang_auth_DB',
        port: process.env.PORT,
        path: `/db/agent/delete`,
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
