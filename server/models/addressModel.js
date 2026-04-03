const pool = require("../config/db");

const findDefaultByUserId = async (userId) => {
  const [rows] = await pool.execute(
    `SELECT address_id, receiver_name, phone, address_line, city, country, is_default
     FROM addresses
     WHERE user_id = ? AND is_default = 1
     ORDER BY address_id DESC
     LIMIT 1`,
    [userId],
  );

  return rows[0] || null;
};

module.exports = {
  findDefaultByUserId,
};
