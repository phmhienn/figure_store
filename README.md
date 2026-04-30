# Figure Shop - Anime Figure Store

Website ban mo hinh Anime Figure duoc xay dung voi:

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: PostgreSQL
- Backend architecture: MVC (Model - View - Controller)
- API style: RESTful

pgAdmin chi la cong cu quan tri. Ung dung nay da duoc chuan hoa de ket noi truc tiep toi PostgreSQL Server va import schema bang psql/pgAdmin.

## 1. Cau truc project

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

## 2. Database PostgreSQL

File [database.sql](D:/DocumentByPH/webmohinh/database.sql) da duoc chuan hoa sang cu phap PostgreSQL va gom:

- `CREATE DATABASE figure_shop`
- `CREATE TABLE users`
- `CREATE TABLE products`
- `CREATE TABLE orders`
- `CREATE TABLE order_items`
- du lieu mau cho users, products, orders

### Cach import `database.sql` vao PostgreSQL

Cach 1: psql CLI

1. Mo terminal.
2. Dang nhap psql:

```bash
psql -U postgres -d postgres
```

3. Trong psql shell, chay:

```sql
\i D:/DocumentByPH/webmohinh/database.sql
```

Cach 2: pgAdmin

1. Mo pgAdmin va ket noi PostgreSQL server.
2. Tao database `figure_shop` neu chua co.
3. Mo `Query Tool` cua database `figure_shop`.
4. Mo file [database.sql](D:/DocumentByPH/webmohinh/database.sql). Neu pgAdmin bao loi o dong `\connect`, hay xoa 3 dong dau (DROP/CREATE/\connect) truoc khi chay.

### Ket noi Supabase Postgres

1. Vao Supabase Dashboard -> Settings -> Database.
2. Copy Connection string (Direct connection).
3. Trong `server/.env`, uu tien dat `DATABASE_URL` va bat SSL:

```env
DATABASE_URL=postgresql://postgres:YOUR_DB_PASSWORD@db.<project-ref>.supabase.co:5432/postgres
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
```

Neu ban muon dung cach thong thuong (khong dung `DATABASE_URL`), su dung cac bien sau (van can SSL):

```env
DB_HOST=db.<project-ref>.supabase.co
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=YOUR_DB_PASSWORD
DB_NAME=postgres
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
```

Luu y: Supabase SQL Editor khong cho phep `DROP DATABASE` va `CREATE DATABASE`. Khi import [database.sql](D:/DocumentByPH/webmohinh/database.sql) vao Supabase, hay xoa 3 dong dau (DROP/CREATE/\connect) truoc khi chay.

### Tai khoan mau sau khi import

- Admin: `admin@figureshop.com` / `password`
- User: `hana@example.com` / `password`

## 3. Chay backend

### Tao file env

Copy file [server/.env.example](D:/DocumentByPH/webmohinh/server/.env.example) thanh `server/.env` va cap nhat thong tin PostgreSQL:

```env
PORT=5000
CLIENT_URL=http://localhost:5173
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_NAME=figure_shop
JWT_ACCESS_SECRET=replace_with_a_secure_random_string_for_access
JWT_REFRESH_SECRET=replace_with_a_different_secure_random_string_for_refresh
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM="KaFigure <onboarding@resend.dev>"
```

Neu ban ket noi Postgres voi `localhost:5432`, hay dat `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD` trong `server/.env` giong dung ket noi do.

De gui email quen mat khau bang Resend, dat `EMAIL_PROVIDER=resend`, `RESEND_API_KEY` va `RESEND_FROM` hop le (domain da verify voi Resend).

### Cai dependency va chay server

```bash
cd server
npm install
npm run dev
```

Backend se chay tai `http://localhost:5000`.

### API chinh

- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products` (admin)
- `PUT /api/products/:id` (admin)
- `DELETE /api/products/:id` (admin)
- `POST /api/users/register`
- `POST /api/users/login`
- `GET /api/users/me`
- `POST /api/orders`
- `GET /api/orders/my-orders`
- `GET /api/orders/user/:userId`

## 4. Chay frontend

### Tao file env

Copy file [client/.env.example](D:/DocumentByPH/webmohinh/client/.env.example) thanh `client/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

### Cai dependency va chay client

```bash
cd client
npm install
npm run dev
```

Frontend se chay tai `http://localhost:5173`.

## 5. Tinh nang da co

### User

- Xem danh sach san pham
- Xem chi tiet san pham
- Them vao gio hang
- Dang ky / dang nhap bang JWT
- Dat hang
- Xem lich su don hang

### Admin

- Dang nhap bang role `admin`
- CRUD san pham tu dashboard
- Route admin duoc bao ve bang JWT + role middleware

## 6. Ghi chu ky thuat

- Backend dung `pg` va viet SQL truc tiep trong model.
- `orderModel.createWithItems()` dung transaction de tranh sai lech ton kho khi dat hang.
- Frontend dung Axios interceptor de gan JWT vao request tu dong.
- Gio hang duoc luu trong `localStorage`.
- Khi khoi dong, backend se kiem tra ket noi PostgreSQL truoc va bao loi ro neu sai tai khoan, sai port, hoac chua import schema.

## 7. Thu tu khoi dong de test nhanh

1. Import [database.sql](D:/DocumentByPH/webmohinh/database.sql) vao PostgreSQL (psql/pgAdmin).
2. Chay backend trong thu muc `server`.
3. Chay frontend trong thu muc `client`.
4. Vao trang login bang tai khoan admin neu muon test CRUD san pham.
