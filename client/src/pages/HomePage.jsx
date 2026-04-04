import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { ClipboardIcon, TruckIcon } from "../components/Icons";
import ProductCard from "../components/ProductCard";
import { useCart } from "../context/CartContext";
import productService from "../services/productService";
import { IMAGE_FALLBACK, resolveImageUrl } from "../utils/format";

const PRODUCTS_PER_PAGE = 8;

const promoCards = [
  {
    title: "Tra cứu đơn & hạng thành viên",
    copy: "Theo dõi trạng thái đơn hàng, lịch sử mua và quyền lợi thành viên ngay trên tài khoản.",
    to: "/preorder-lookup",
    icon: ClipboardIcon,
    tone: "rose",
  },
  {
    title: "Giao hàng toàn quốc",
    copy: "Đóng gói kỹ, hỗ trợ kiểm tra tình trạng đơn và cập nhật vận chuyển sau khi chốt đơn.",
    to: "/shipping-warranty",
    icon: TruckIcon,
    tone: "sky",
  },
];

function HomePage() {
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [previewProducts, setPreviewProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { addToCart } = useCart();

  const searchQuery =
    new URLSearchParams(location.search).get("q")?.trim() || "";

  // Reset to page 1 when search changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError("");
      try {
        const result = await productService.getAll({
          page,
          limit: PRODUCTS_PER_PAGE,
          inStockOnly: true,
          ...(searchQuery ? { search: searchQuery } : {}),
        });
        setProducts(result.data);
        setPagination(result.pagination);

        // Hero preview: first page without search filter
        if (page === 1 && !searchQuery) {
          setPreviewProducts(result.data.slice(0, 6));
        }
      } catch (requestError) {
        setError(
          requestError.response?.data?.message ||
            "Không thể tải danh sách sản phẩm lúc này.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [page, searchQuery]);

  useEffect(() => {
    if (!searchQuery || loading) return;
    const target = document.getElementById("catalog");
    if (!target) return;

    const headerOffset = 90;
    const top =
      target.getBoundingClientRect().top + window.scrollY - headerOffset;
    window.scrollTo({ top, behavior: "smooth" });
  }, [searchQuery, loading]);

  return (
    <div className="page-stack storefront-home">
      <section className="storefront-layout">
        <div className="hero-column">
          <section className="home-hero">
            <div className="hero-copy-group">
              <p className="hero-brand-chip">KAFIGURE</p>
              <span className="hero-mini-label">
                Store figure anime chính hãng
              </span>
              <h1>
                Hàng đặt trước
                <br />
                đảm bảo giá tốt
              </h1>
              <p className="hero-copy">
                Mô hình anime sưu tầm chính hãng — bảo mật khi thanh toán, giao
                hàng toàn quốc, kiểm tra trước khi gửi.
              </p>
              {searchQuery && (
                <p className="hero-search-note">
                  Đang hiển thị kết quả cho từ khóa{" "}
                  <strong>"{searchQuery}"</strong>.
                </p>
              )}
            </div>

            <div className="hero-product-strip">
              {previewProducts.length ? (
                <div className="hero-product-track" aria-live="polite">
                  {[...previewProducts, ...previewProducts].map(
                    (product, index) => (
                      <article
                        key={`${product.product_id}-${index}`}
                        className="hero-product-card"
                        aria-hidden={index >= previewProducts.length}
                      >
                        <img
                          src={resolveImageUrl(product.image_url)}
                          alt={product.name}
                          onError={(e) => {
                            e.currentTarget.src = IMAGE_FALLBACK;
                            e.currentTarget.onerror = null;
                          }}
                        />
                        <span>{product.name}</span>
                      </article>
                    ),
                  )}
                </div>
              ) : (
                <div className="hero-empty-card">
                  Sản phẩm sẽ xuất hiện tại đây khi dữ liệu được tải xong.
                </div>
              )}
            </div>

            <div className="hero-cta-row">
              <a href="#catalog" className="hero-cta">
                Mua ngay
              </a>
              <div className="hero-summary">
                <span>
                  {pagination ? pagination.total : products.length} sản phẩm
                </span>
                <div className="hero-dots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          </section>

          <div className="feature-promo-grid">
            {promoCards.map((card) => {
              const Icon = card.icon;

              return (
                <article
                  key={card.title}
                  className={`feature-promo ${card.tone}`}
                >
                  <div className="feature-promo-copy">
                    <h3>{card.title}</h3>
                    <p>{card.copy}</p>
                    <Link to={card.to} className="promo-link">
                      Xem ngay
                    </Link>
                  </div>
                  <Icon className="feature-promo-icon" />
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="new-releases" className="section-header-row">
        <div>
          <p className="eyebrow">Danh mục trưng bày</p>
          <h2>{searchQuery ? "Kết quả tìm kiếm" : "Sản phẩm nổi bật"}</h2>
        </div>
      </section>

      {loading && (
        <section className="content-panel">Đang tải sản phẩm...</section>
      )}
      {error && (
        <section className="content-panel error-panel">{error}</section>
      )}

      {!loading && !error && !products.length && (
        <section className="content-panel empty-state">
          <h3>Không tìm thấy sản phẩm phù hợp</h3>
          <p>Hãy thử từ khóa khác hoặc quay lại catalog đầy đủ.</p>
          <Link to="/" className="primary-button link-button">
            Quay lại catalog
          </Link>
        </section>
      )}

      {!loading && !error && !!products.length && (
        <section
          id="catalog"
          className={`product-grid ${searchQuery ? "" : "featured-grid"}`}
        >
          {products.map((product) => (
            <ProductCard
              key={product.product_id}
              product={product}
              onAddToCart={addToCart}
            />
          ))}
        </section>
      )}

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <nav className="pagination-row" aria-label="Phân trang sản phẩm">
          <button
            type="button"
            className="ghost-button compact-button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            ← Trước
          </button>

          <span className="pagination-info">
            Trang {page} / {pagination.pages}
          </span>

          <button
            type="button"
            className="ghost-button compact-button"
            onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
            disabled={page >= pagination.pages}
          >
            Tiếp →
          </button>
        </nav>
      )}
    </div>
  );
}

export default HomePage;
