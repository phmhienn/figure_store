const bcrypt = require("bcrypt");
const pool = require("./config/db");

async function resetAndVerify() {
  const email = "admin@figureshop.com";
  const password = "Admin@1234";
  const saltRounds = 10;

  try {
    // 1. Generate new hash
    const newHash = await bcrypt.hash(password, saltRounds);
    console.log("1. Generated new hash for Admin@1234");

    // 2. Update DB
    const result = await pool.query(
      "UPDATE users SET password_hash = $1 WHERE email = $2",
      [newHash, email],
    );

    if (result.rowCount === 0) {
      console.error("ERROR: No user found with email " + email);
      process.exit(1);
    }
    console.log(
      "2. Updated DB successfully. Rows affected: " + result.rowCount,
    );

    // 3. Fetch back and verify with bcrypt.compare
    const { rows } = await pool.query(
      "SELECT password_hash FROM users WHERE email = $1",
      [email],
    );
    const storedHash = rows[0]?.password_hash;
    const isMatch = await bcrypt.compare(password, storedHash);

    if (isMatch) {
      console.log("3. VERIFICATION SUCCESS: Password matches stored hash!");
      console.log("--- LOGIN INFO ---");
      console.log("Email: " + email);
      console.log("Password: " + password);
      console.log("------------------");
    } else {
      console.error(
        "ERROR: Verification failed. Password does NOT match stored hash.",
      );
    }
  } catch (err) {
    console.error("FATAL ERROR:", err);
  } finally {
    process.exit(0);
  }
}

resetAndVerify();
