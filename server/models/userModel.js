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
  const [rows] = await pool.execute(
    `${baseSelect} ORDER BY created_at DESC, user_id DESC`,
  );
  return rows;
};

const findById = async (id) => {
  const [rows] = await pool.execute(`${baseSelect} WHERE user_id = ?`, [id]);
  return rows[0] || null;
};

const findByEmail = async (email) => {
  const [rows] = await pool.execute(`${baseSelect} WHERE email = ?`, [email]);
  return rows[0] || null;
};

const findByUsername = async (username) => {
  const [rows] = await pool.execute(`${baseSelect} WHERE username = ?`, [
    username,
  ]);
  return rows[0] || null;
};

const findByPhone = async (phone) => {
  const [rows] = await pool.execute(`${baseSelect} WHERE phone = ?`, [phone]);
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

  const [result] = await pool.execute(
    `INSERT INTO users (${USER_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?)`,
    values,
  );

  return findById(result.insertId);
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

  await pool.execute(
    `
      UPDATE users
      SET username = ?, email = ?, password_hash = ?, full_name = ?, phone = ?, role = ?
      WHERE user_id = ?
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
  const [result] = await pool.execute("DELETE FROM users WHERE user_id = ?", [
    id,
  ]);
  return result.affectedRows > 0;
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
