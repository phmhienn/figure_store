const pool = require("../config/db");

const findDefaultByUserId = async (userId) => {
  const { rows } = await pool.query(
    `SELECT address_id, receiver_name, phone, address_line, city, country, is_default
     FROM addresses
     WHERE user_id = $1 AND is_default = TRUE
     ORDER BY address_id DESC
     LIMIT 1`,
    [userId],
  );

  return rows[0] || null;
};

module.exports = {
  findDefaultByUserId,
};
