import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { formatRole } from "../utils/format";
import {
  BoxIcon,
  CartIcon,
  ClipboardIcon,
  CubeIcon,
  GiftIcon,
  HeartHandshakeIcon,
  MenuGridIcon,
  NewspaperIcon,
  PhoneIcon,
  QuestionIcon,
  SearchIcon,
  SparklesIcon,
  TagIcon,
  TruckIcon,
  UserIcon,
} from "./Icons";

const isUtilityActive = (item, location) => {
  const matchesPath = item.matchStartsWith
    ? location.pathname.startsWith(item.matchStartsWith)
    : location.pathname === item.matchPath;

  if (!matchesPath) return false;
  if (!item.matchHash) return true;
  if (!location.hash && item.defaultOnEmptyHash) return true;
  return location.hash === item.matchHash;
};

const getUtilityClass = (item, location) =>
  isUtilityActive(item, location) ? "utility-link active" : "utility-link";

const utilityLinks = [
  {
    label: "Giao hàng & bảo hành",
    to: "/shipping-warranty#delivery",
    matchPath: "/shipping-warranty",
    matchHash: "#delivery",
    defaultOnEmptyHash: true,
    icon: TruckIcon,
  },
  {
    label: "Tra cứu đơn đặt trước",
    to: "/preorder-lookup#lookup",
    matchPath: "/preorder-lookup",
    matchHash: "#lookup",
    defaultOnEmptyHash: true,
    icon: ClipboardIcon,
  },
  {
    label: "FAQ",
    to: "/shipping-warranty#faq",
    matchPath: "/shipping-warranty",
    matchHash: "#faq",
    icon: QuestionIcon,
  },
  {
    label: "Tin tức",
    to: "/news",
    matchStartsWith: "/news",
    icon: NewspaperIcon,
  },
];

const catalogLinks = [
  { label: "Hàng mới về", to: "/new-arrivals", icon: GiftIcon },
  { label: "Có sẵn ngay", to: "/ready-stock", icon: BoxIcon },
  { label: "Tất cả sản phẩm", to: "/#catalog", icon: TagIcon },
  { label: "PVC Figure", to: "/#catalog", icon: CubeIcon },
  { label: "Resin Figure", to: "/#catalog", icon: SparklesIcon },
  { label: "Blindbox Arttoy", to: "/#catalog", icon: BoxIcon },
  { label: "Gundam / Plastic Model", to: "/#catalog", icon: CubeIcon },
  { label: "Goods nhân vật", to: "/#catalog", icon: TagIcon },
  { label: "Hàng đặt trước", to: "/preorder", icon: ClipboardIcon },
  { label: "Khách hàng thân thiết", to: "/#catalog", icon: HeartHandshakeIcon },
];

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const isStaff = user?.role === "staff";
  const { cartCount } = useCart();
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const nextQuery = new URLSearchParams(location.search).get("q") || "";
    setSearchTerm(nextQuery);
  }, [location.search]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();

    const trimmedQuery = searchTerm.trim();
    navigate(
      trimmedQuery ? `/?q=${encodeURIComponent(trimmedQuery)}#catalog` : "/",
    );
  };

  return (
    <header className="site-header">
      <div className="header-topband">
        <div className="header-top-inner">
          <NavLink to="/" className="brand-mark">
            <span className="brand-symbol">力</span>
            <div className="brand-copy">
              <strong>FIGURE</strong>
              <small>Figure anime sưu tầm</small>
            </div>
          </NavLink>

          <form className="header-search" onSubmit={handleSearchSubmit}>
            <input
              type="search"
              placeholder="Bạn đang tìm gì..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              aria-label="Tìm sản phẩm"
            />
            <button
              type="submit"
              className="search-submit"
              aria-label="Tìm kiếm"
            >
              <SearchIcon />
            </button>
          </form>

          <div className="header-actions">
            <a href="tel:0396686826" className="contact-pill">
              <PhoneIcon className="header-icon" />
              <span>
                Hotline
                <strong>0396686826</strong>
              </span>
            </a>

            {isAuthenticated ? (
              <div className="account-panel">
                <div className="account-user">
                  <UserIcon className="header-icon" />
                  <div>
                    <span>{user?.full_name || user?.username}</span>
                    <small>{formatRole(user?.role)}</small>
                  </div>
                </div>
                <div className="account-links">
                  <NavLink to="/profile" className="account-link">
                    Tài khoản
                  </NavLink>
                  {(isAdmin || isStaff) && (
                    <NavLink to="/admin" className="account-link">
                      Quản trị
                    </NavLink>
                  )}
                  <button
                    type="button"
                    className="account-link button-reset"
                    onClick={logout}
                  >
                    Đăng xuất
                  </button>
                </div>
              </div>
            ) : (
              <div className="account-panel guest">
                <UserIcon className="header-icon" />
                <div className="account-links">
                  <NavLink to="/login" className="account-link">
                    Đăng nhập
                  </NavLink>
                  <NavLink to="/register" className="account-link">
                    Đăng ký
                  </NavLink>
                </div>
              </div>
            )}

            <NavLink to="/cart" className="cart-button">
              <CartIcon className="header-icon" />
              <span>Giỏ hàng</span>
              <strong className="badge-pill">{cartCount}</strong>
            </NavLink>
          </div>
        </div>
      </div>

      <div className="header-utility-bar">
        <div className="header-utility-inner">
          <div className="catalog-menu">
            <NavLink to="/" end className="menu-trigger">
              <MenuGridIcon className="header-icon" />
              <span>Danh mục</span>
            </NavLink>

            <div className="catalog-dropdown" aria-label="Danh mục sản phẩm">
              {catalogLinks.map((item) => {
                const Icon = item.icon;

                return (
                  <Link key={item.label} to={item.to} className="sidebar-link">
                    <div className="sidebar-link-main">
                      <Icon className="sidebar-icon" />
                      <span>{item.label}</span>
                    </div>
                    <span className="sidebar-arrow" aria-hidden="true">
                      ›
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          <nav className="utility-links" aria-label="Tiện ích cửa hàng">
            {utilityLinks.map((item) => {
              const Icon = item.icon;
              const isActive = isUtilityActive(item, location);

              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className={getUtilityClass(item, location)}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon className="header-icon" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
