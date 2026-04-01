const bcrypt = require('bcrypt');

async function generateHash() {
  const password = 'Admin@1234'; // Mật khẩu bạn muốn đặt
  const saltRounds = 10;
  const hash = await bcrypt.hash(password, saltRounds);
  console.log('Mật khẩu thật: ' + password);
  console.log('Mã băm (Copy cái này): ' + hash);
}

generateHash();
