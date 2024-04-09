//db정보받기
const db = require("../config/db.js");

module.exports = {
  //입주민 회원인지 공인중개사 회원인지 확인
  whoAreYou: async (r_username) => {
    try {
      let rawQuery = `
      SELECT r_id
      FROM resident
      WHERE r_username=?;`;
      let who = await db.query(rawQuery, [r_username]);
      if(who[0][0] == null) return 0;
      else return 1;
    } catch (error) {
      return error;
    }
  },

  // 공인중개사 공공데이터 조회
  getRealtorPublicData: async (ra_regno) => {
    try {
      const res = await db.query(
        `SELECT * FROM agentList WHERE ra_regno = ?;`,
        [ra_regno]
      );
      return res[0];
    } catch(error) {
      return error;
    }
  },
  
  // 공인중개사 개인정보 조회
  getRealtorPrivateData: async (ra_regno) => {
    try {
      const res = await db.query(
        `SELECT * FROM agent WHERE agentList_ra_regno = ?;`,
        [ra_regno]
      );
      return res[0];
    } catch(error) {
      return error;
    }
  },

  //부동산 페이지에 방문한 입주민이 해당 부동산을 북마크 했는지 확인
  getBookmarkByIdnRegno: async (ra_regno, r_username) => {
    try {
      const res = await db.query(
        `SELECT * FROM bookmark JOIN resident ON resident_r_id=r_id WHERE agentList_ra_regno=? AND r_username=?`,
        [ra_regno, r_username]
      );
      return res;
    } catch (error) {
      return error;
    }
  },

  updateBookmark: async (r_username, body, result) => {
    let getRIdRawQuery = `
    SELECT r_id
    FROM resident
    WHERE r_username=?`;
    let res;

    try {
      if (body.isBookmark !== "0") {
        rawQuery = `DELETE FROM bookmark WHERE bm_id=?`;
        res = await db.query(rawQuery, [body.isBookmark]);
      } else {
        insertRawQuery = `INSERT INTO bookmark (resident_r_id, agentList_ra_regno) values (?, ?)`;
        r_username = await db.query(getRIdRawQuery, [r_username]);
        res = await db.query(insertRawQuery, [r_username[0][0].r_id, body.raRegno]);
      }
      result(res);
    } catch (error) {
      result(null, error);
    }
  },
};
