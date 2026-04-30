const pool = require("../config/db");

const USER_COLUMNS = `
  username,
  email,
  password_hash,
  full_name,
  phone,
  role
`;

const baseSelect = `
  SELECT user_id, username, email, password_hash, full_name, phone, role, created_at
  FROM users
`;

const findAll = async () => {
  const { rows } = await pool.query(
    `${baseSelect} ORDER BY created_at DESC, user_id DESC`,
  );
  return rows;
};

const findById = async (id) => {
  const { rows } = await pool.query(`${baseSelect} WHERE user_id = $1`, [id]);
  return rows[0] || null;
};

const findByEmail = async (email) => {
  const { rows } = await pool.query(`${baseSelect} WHERE email = $1`, [email]);
  return rows[0] || null;
};

const findByUsername = async (username) => {
  const { rows } = await pool.query(`${baseSelect} WHERE username = $1`, [
    username,
  ]);
  return rows[0] || null;
};

const findByPhone = async (phone) => {
  const { rows } = await pool.query(`${baseSelect} WHERE phone = $1`, [phone]);
  return rows[0] || null;
};

const create = async (userData) => {
  const values = [
    userData.username,
    userData.email,
    userData.password_hash,
    userData.full_name || null,
    userData.phone || null,
    userData.role || "customer",
  ];

  const { rows } = await pool.query(
    `INSERT INTO users (${USER_COLUMNS}) VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING user_id`,
    values,
  );

  return rows[0]?.user_id ? findById(rows[0].user_id) : null;
};

const update = async (id, userData) => {
  const existingUser = await findById(id);

  if (!existingUser) {
    return null;
  }

  const payload = {
    username: userData.username ?? existingUser.username,
    email: userData.email ?? existingUser.email,
    password_hash: userData.password_hash ?? existingUser.password_hash,
    full_name: userData.full_name ?? existingUser.full_name,
    phone: userData.phone ?? existingUser.phone,
    role: userData.role ?? existingUser.role,
  };

  await pool.query(
    `
      UPDATE users
      SET username = $1, email = $2, password_hash = $3, full_name = $4, phone = $5, role = $6
      WHERE user_id = $7
    `,
    [
      payload.username,
      payload.email,
      payload.password_hash,
      payload.full_name,
      payload.phone,
      payload.role,
      id,
    ],
  );

  return findById(id);
};

const deleteUser = async (id) => {
  const result = await pool.query("DELETE FROM users WHERE user_id = $1", [id]);
  return result.rowCount > 0;
};

module.exports = {
  findAll,
  findById,
  findByEmail,
  findByUsername,
  findByPhone,
  create,
  update,
  delete: deleteUser,
};
