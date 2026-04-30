# Figure Shop - Anime Figure Store

Một cửa hàng mô hình Anime full-stack với trải nghiệm mua sắm nhanh, giao diện rõ ràng, và hệ thống quản trị linh hoạt. Hỗ trợ preorder, quản lý đơn hàng, và báo cáo doanh thu theo ngày/tháng.

**Website:** https://figureshop.qzz.io
**API:** https://api.figureshop.qzz.io/api

---

## 1. Tính năng nổi bật

- Danh sách sản phẩm, chi tiết sản phẩm, tìm kiếm và lọc
- Giỏ hàng + đặt hàng
- Preorder kèm đặt cọc, theo dõi trạng thái
- Quản trị viên: CRUD sản phẩm, bài viết, đơn hàng, báo cáo
- Xác thực JWT (access/refresh)
- Upload ảnh lên Supabase Storage
- Gửi email quên mật khẩu qua Resend

---

## 2. Công nghệ sử dụng

**Frontend**

- React + Vite
- React Router
- Axios

**Backend**

- Node.js + Express
- PostgreSQL (pg)
- JWT Auth
- Multer

**Dịch vụ**

- Supabase (Postgres + Storage)
- Resend (Email)
- MoMo Sandbox (Thanh toán)

**Triển khai & hạ tầng**

- Vercel (Frontend)
- Render (Backend)
- Railway (tùy chọn / thay thế)
- Cloudflare (quản lý DNS, SSL, CDN)
- Tên miền miễn phí: figureshop.qzz.io

---

## 3. URL truy cập

- Website: https://figureshop.qzz.io
- API: https://api.figureshop.qzz.io/api
- Tài khoản admin: admin@figureshop.com / password

---

## 4. Cấu trúc project

```text
webmohinh/
|-- client/
|   |-- src/
|   |   |-- components/
|   |   |-- context/
|   |   |-- pages/
|   |   |-- services/
|   |   |-- styles/
|   |   |-- utils/
|   |   |-- App.jsx
|   |   `-- main.jsx
|   |-- index.html
|   |-- package.json
|   `-- vite.config.js
|-- server/
|   |-- config/
|   |-- controllers/
|   |-- middlewares/
|   |-- models/
|   |-- routes/
|   |-- app.js
|   `-- package.json
|-- database.sql
`-- README.md
```

---

## 5. Database (PostgreSQL)

File [database.sql](webmohinh/database.sql) đã được chuẩn hóa sang PostgreSQL và có dữ liệu mẫu.

### 5.1 Import local

```bash
psql -U postgres -d postgres
```

```sql
\i D:/DocumentByPH/webmohinh/database.sql
```

### 5.2 Supabase Postgres

1. Supabase Dashboard -> Settings -> Database.
2. Copy Connection string (Direct connection).
3. Đặt env trong `server/.env`:

```env
DATABASE_URL=postgresql://postgres:YOUR_DB_PASSWORD@db.<project-ref>.supabase.co:5432/postgres
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
```

**Lưu ý:** Supabase SQL Editor không cho phép `DROP DATABASE` và `CREATE DATABASE`. Khi import [database.sql](webmohinh/database.sql) vào Supabase, hãy xóa 3 dòng đầu (DROP/CREATE/\connect).

---

## 6. Chạy local

### Backend

```bash
cd server
npm install
npm run dev
```

### Frontend

```bash
cd client
npm install
npm run dev
```

---

## 7. Biến môi trường

### server/.env

```env
PORT=5000
CLIENT_URL=http://localhost:5173
DATABASE_URL=postgresql://postgres:YOUR_DB_PASSWORD@db.<project-ref>.supabase.co:5432/postgres
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
JWT_ACCESS_SECRET=replace_with_a_secure_random_string_for_access
JWT_REFRESH_SECRET=replace_with_a_different_secure_random_string_for_refresh
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM="KaFigure <onboarding@resend.dev>"
```

### client/.env

```env
VITE_API_URL=http://localhost:5000/api
```

---

## 8. Ghi chú kỹ thuật

- Backend dùng `pg` và viết SQL trực tiếp trong model.
- `orderModel.createWithItems()` dùng transaction để tránh sai lệch tồn kho.
- Frontend gắn JWT qua Axios interceptor.
- Giỏ hàng được lưu trong `localStorage`.
- Khi khởi động, backend sẽ test kết nối PostgreSQL trước.
