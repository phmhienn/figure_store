-- Figure Shop schema for MySQL
-- Converted from SQL Server syntax. Run this in MySQL Workbench or MySQL CLI.

DROP DATABASE IF EXISTS figure_shop;
CREATE DATABASE figure_shop CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE figure_shop;

-- ============================================================
-- Users & Addresses
-- ============================================================

CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(100),
    phone VARCHAR(20),
    role VARCHAR(20) NOT NULL DEFAULT 'customer',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE addresses (
    address_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    receiver_name VARCHAR(100),
    phone VARCHAR(20),
    address_line TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    is_default TINYINT(1) DEFAULT 0,

    CONSTRAINT FK_addresses_users
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ============================================================
-- Products & related lookup tables
-- ============================================================

CREATE TABLE products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    stock_quantity INT DEFAULT 0,
    release_date DATE,
    status VARCHAR(20) DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_images (
    image_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT,
    image_url TEXT,
    is_main TINYINT(1) DEFAULT 0,

    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
);

CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    parent_id INT,

    FOREIGN KEY (parent_id) REFERENCES categories(category_id)
);

CREATE TABLE product_categories (
    product_id INT,
    category_id INT,
    PRIMARY KEY (product_id, category_id),

    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE CASCADE
);

CREATE TABLE series (
    series_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE product_series (
    product_id INT,
    series_id INT,
    PRIMARY KEY (product_id, series_id),

    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    FOREIGN KEY (series_id) REFERENCES series(series_id) ON DELETE CASCADE
);

CREATE TABLE brands (
    brand_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE product_brands (
    product_id INT,
    brand_id INT,
    PRIMARY KEY (product_id, brand_id),

    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
    FOREIGN KEY (brand_id) REFERENCES brands(brand_id) ON DELETE CASCADE
);

CREATE TABLE product_variants (
    variant_id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT,
    size VARCHAR(50),
    color VARCHAR(50),
    stock INT DEFAULT 0,

    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
);

-- ============================================================
-- News Posts
-- ============================================================

CREATE TABLE news_posts (
    news_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    excerpt TEXT,
    content LONGTEXT,
    cover_image_url TEXT,
    status VARCHAR(20) DEFAULT 'draft',
    author_id INT,
    published_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (author_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- ============================================================
-- Cart
-- ============================================================

CREATE TABLE carts (
    cart_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE cart_items (
    cart_item_id INT AUTO_INCREMENT PRIMARY KEY,
    cart_id INT,
    product_id INT,
    quantity INT NOT NULL CHECK (quantity > 0),

    FOREIGN KEY (cart_id) REFERENCES carts(cart_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

-- ============================================================
-- Orders, Payments, Shipping
-- ============================================================

CREATE TABLE orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    address_id INT,
    total_amount DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (address_id) REFERENCES addresses(address_id)
);

CREATE TABLE order_items (
    order_item_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT,
    product_id INT,
    quantity INT NOT NULL,
    price DECIMAL(10,2) NOT NULL,

    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

CREATE TABLE payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT,
    method VARCHAR(50),
    status VARCHAR(20),
    paid_at DATETIME,

    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
);

CREATE TABLE shipping (
    shipping_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT,
    tracking_number VARCHAR(100),
    carrier VARCHAR(100),
    status VARCHAR(50),
    shipped_at DATETIME,
    delivered_at DATETIME,

    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
);

-- ============================================================
-- Reviews & Wishlist
-- ============================================================

CREATE TABLE reviews (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    product_id INT,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
);

CREATE TABLE wishlist (
    user_id INT,
    product_id INT,
    PRIMARY KEY (user_id, product_id),

    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
);

-- ============================================================
-- Refresh tokens (for JWT revocation)
-- ============================================================

CREATE TABLE refresh_tokens (
    token_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ============================================================
-- Password reset tokens
-- ============================================================

CREATE TABLE password_reset_tokens (
    token_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_product_images_product_id ON product_images(product_id);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_news_slug ON news_posts(slug);
CREATE INDEX idx_news_status ON news_posts(status);
CREATE INDEX idx_news_created_at ON news_posts(created_at);

-- ============================================================
-- Seed data
-- ============================================================

-- password = 'password' hashed with bcrypt (10 rounds)
INSERT INTO users (username, email, password_hash, full_name, phone, role) VALUES
('admin', 'admin@figureshop.com', '$2b$10$Y6MKD5ZI5gtkvBdYyqwr1.CrHA66ppM/9YNDvacUuqWZSVduKQcIq', 'Figure Shop Admin', '0900000001', 'admin'),
('otaku_hana', 'hana@example.com', '$2b$10$Y6MKD5ZI5gtkvBdYyqwr1.CrHA66ppM/9YNDvacUuqWZSVduKQcIq', 'Nguyen Thu Ha', '0900000002', 'customer');

INSERT INTO addresses (user_id, receiver_name, phone, address_line, city, country, is_default) VALUES
(2, 'Nguyen Thu Ha', '0900000002', '123 Nguyen Trai, Quan 1', 'TP. Ho Chi Minh', 'Vietnam', 1);

INSERT INTO categories (name, parent_id) VALUES
('Scale Figure', NULL),
('Premium Figure', NULL),
('Nendoroid', NULL),
('Bunny Figure', NULL),
('Statue', NULL),
('Action Figure', NULL),
('Collector Figure', NULL);

INSERT INTO series (name) VALUES
('Fate/stay night'),
('Jujutsu Kaisen'),
('Spy x Family'),
('Darling in the Franxx'),
('One Piece'),
('Re:Zero'),
('Attack on Titan'),
('Naruto Shippuden');

INSERT INTO brands (name) VALUES
('Good Smile Company'),
('eStream'),
('FREEing'),
('Bandai Spirits'),
('Taito'),
('Kotobukiya'),
('Megahouse');

INSERT INTO products (name, slug, description, price, stock_quantity, status) VALUES
('Saber Altria Pendragon - Deluxe Scale Figure', 'saber-altria-pendragon-deluxe-scale-figure', 'Deluxe scale figure of Saber in battle pose with translucent effects and premium base.', 2890000.00, 12, 'active'),
('Gojo Satoru - Limited Edition Figure', 'gojo-satoru-limited-edition-figure', 'High-detail figure featuring Gojo with domain expansion inspired background effect.', 3190000.00, 8, 'active'),
('Anya Forger - Family Outfit Figure', 'anya-forger-family-outfit-figure', 'Cute collectible with interchangeable facial plates and compact display stand.', 1290000.00, 25, 'active'),
('Zero Two - Bunny Version Figure', 'zero-two-bunny-version-figure', 'Large-scale bunny version figure with glossy finish and metal support base.', 4590000.00, 6, 'active'),
('Roronoa Zoro - Battle Diorama Figure', 'roronoa-zoro-battle-diorama-figure', 'Dynamic diorama statue with sword slash effect and textured rock base.', 3490000.00, 9, 'active'),
('Rem - Maid Dress Figure', 'rem-maid-dress-figure', 'Elegant Rem figure with layered costume sculpt and pastel paint application.', 2390000.00, 14, 'active'),
('Mikasa Ackerman - Final Season Figure', 'mikasa-ackerman-final-season-figure', 'Poseable figure inspired by the final season design with ODM gear details.', 1890000.00, 10, 'active'),
('Naruto Uzumaki - Sage Mode Figure', 'naruto-uzumaki-sage-mode-figure', 'Collector edition Naruto figure with swirling chakra effect and scenic base.', 2790000.00, 11, 'active');

INSERT INTO product_images (product_id, image_url, is_main) VALUES
(1, 'https://via.placeholder.com/640x640?text=Saber+Figure', 1),
(2, 'https://via.placeholder.com/640x640?text=Gojo+Figure', 1),
(3, 'https://via.placeholder.com/640x640?text=Anya+Figure', 1),
(4, 'https://via.placeholder.com/640x640?text=Zero+Two+Figure', 1),
(5, 'https://via.placeholder.com/640x640?text=Zoro+Figure', 1),
(6, 'https://via.placeholder.com/640x640?text=Rem+Figure', 1),
(7, 'https://via.placeholder.com/640x640?text=Mikasa+Figure', 1),
(8, 'https://via.placeholder.com/640x640?text=Naruto+Figure', 1);

-- product_categories: link products to categories
INSERT INTO product_categories (product_id, category_id) VALUES
(1, 1), -- Saber -> Scale Figure
(2, 2), -- Gojo -> Premium Figure
(3, 3), -- Anya -> Nendoroid
(4, 4), -- Zero Two -> Bunny Figure
(5, 5), -- Zoro -> Statue
(6, 1), -- Rem -> Scale Figure
(7, 6), -- Mikasa -> Action Figure
(8, 7); -- Naruto -> Collector Figure

-- product_series: link products to series
INSERT INTO product_series (product_id, series_id) VALUES
(1, 1), -- Saber -> Fate/stay night
(2, 2), -- Gojo -> Jujutsu Kaisen
(3, 3), -- Anya -> Spy x Family
(4, 4), -- Zero Two -> Darling in the Franxx
(5, 5), -- Zoro -> One Piece
(6, 6), -- Rem -> Re:Zero
(7, 7), -- Mikasa -> Attack on Titan
(8, 8); -- Naruto -> Naruto Shippuden

-- product_brands: link products to brands
INSERT INTO product_brands (product_id, brand_id) VALUES
(1, 1), -- Saber -> Good Smile Company
(2, 2), -- Gojo -> eStream
(3, 1), -- Anya -> Good Smile Company
(4, 3), -- Zero Two -> FREEing
(5, 4), -- Zoro -> Bandai Spirits
(6, 5), -- Rem -> Taito
(7, 6), -- Mikasa -> Kotobukiya
(8, 7); -- Naruto -> Megahouse

INSERT INTO orders (user_id, address_id, total_amount, status) VALUES
(2, 1, 3680000.00, 'pending');

INSERT INTO order_items (order_id, product_id, quantity, price) VALUES
(1, 3, 1, 1290000.00),
(1, 6, 1, 2390000.00);

INSERT INTO news_posts (title, slug, excerpt, content, cover_image_url, status, author_id, published_at) VALUES
('Huong dan preorder an toan', 'huong-dan-preorder-an-toan', 'Cac buoc kiem tra thong tin va dat coc de giu suat preorder.', '<p>Chon san pham preorder va kiem tra thong tin mo ta, gia va thoi gian du kien. Dat coc de giu suat va theo doi cap nhat tu cua hang.</p>', 'https://via.placeholder.com/960x540?text=Preorder+Guide', 'published', 1, NOW()),
('Lich ve hang thang nay', 'lich-ve-hang-thang-nay', 'Tong hop nhung mau figure sap ve trong thang.', '<p>Danh sach hang ve gom cac mau moi nhat tu cac hang Good Smile, Bandai, Kotobukiya. Lien he de giu hang.</p>', 'https://via.placeholder.com/960x540?text=Monthly+Arrivals', 'published', 1, NOW()),
('Chinh sach doi tra cap nhat', 'chinh-sach-doi-tra-cap-nhat', 'Cap nhat quy dinh doi tra va bao hanh cho khach hang.', '<p>Chinh sach doi tra duoc cap nhat de ho tro khach hang nhanh hon. Vui long giu lai hoa don va quay video mo hop.</p>', 'https://via.placeholder.com/960x540?text=Return+Policy', 'draft', 1, NULL);
