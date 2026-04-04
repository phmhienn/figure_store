import { useEffect, useState } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminHomePage from "./pages/AdminHomePage";
import AdminNewsPage from "./pages/AdminNewsPage";
import AdminOrdersPage from "./pages/AdminOrdersPage";
import AdminReportsPage from "./pages/AdminReportsPage";
import AdminStaffPage from "./pages/AdminStaffPage";
import CartPage from "./pages/CartPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import NewArrivalsPage from "./pages/NewArrivalsPage";
import NewsDetailPage from "./pages/NewsDetailPage";
import NewsPage from "./pages/NewsPage";
import PreorderPage from "./pages/PreorderPage";
import ReadyStockPage from "./pages/ReadyStockPage";
import NotFoundPage from "./pages/NotFoundPage";
import PreorderLookupPage from "./pages/PreorderLookupPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import ProfilePage from "./pages/ProfilePage";
import RegisterPage from "./pages/RegisterPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import ShippingWarrantyPage from "./pages/ShippingWarrantyPage";

function App() {
  const location = useLocation();
  const [appToast, setAppToast] = useState(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("app_toast");
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      if (parsed?.text) {
        setAppToast(parsed);
      }
    } catch (_error) {
      // Ignore malformed toast payloads.
    } finally {
      sessionStorage.removeItem("app_toast");
    }
  }, [location.key]);

  useEffect(() => {
    const handleToastEvent = (event) => {
      const payload = event?.detail;
      if (payload?.text) {
        setAppToast(payload);
      }
    };

    window.addEventListener("app-toast", handleToastEvent);
    return () => window.removeEventListener("app-toast", handleToastEvent);
  }, []);

  useEffect(() => {
    if (!appToast) return undefined;
    const timer = setTimeout(() => setAppToast(null), 3200);
    return () => clearTimeout(timer);
  }, [appToast]);

  return (
    <div className="app-shell">
      {appToast && (
        <div className={`toast-notice ${appToast.type || ""}`}>
          <span>{appToast.text}</span>
          <button
            type="button"
            className="toast-close"
            onClick={() => setAppToast(null)}
            aria-label="Đóng thông báo"
          >
            ×
          </button>
        </div>
      )}
      <Navbar />

      <main className="page-shell">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/shipping-warranty" element={<ShippingWarrantyPage />} />
          <Route path="/preorder-lookup" element={<PreorderLookupPage />} />
          <Route path="/news" element={<NewsPage />} />
          <Route path="/news/:id" element={<NewsDetailPage />} />
          <Route path="/new-arrivals" element={<NewArrivalsPage />} />
          <Route path="/ready-stock" element={<ReadyStockPage />} />
          <Route path="/preorder" element={<PreorderPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["admin", "staff"]}>
                <AdminHomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/products"
            element={
              <ProtectedRoute adminOnly>
                <AdminDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <ProtectedRoute allowedRoles={["admin", "staff"]}>
                <AdminOrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/news"
            element={
              <ProtectedRoute allowedRoles={["admin", "staff"]}>
                <AdminNewsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <ProtectedRoute adminOnly>
                <AdminReportsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/staff"
            element={
              <ProtectedRoute adminOnly>
                <AdminStaffPage />
              </ProtectedRoute>
            }
          />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>

      <footer className="site-footer">
        <p>© 2025 KaFigure — Mô hình anime chính hãng. Giao hàng toàn quốc.</p>
      </footer>
    </div>
  );
}

export default App;
