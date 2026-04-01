import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children, adminOnly = false, allowedRoles }) {
  const { isAuthenticated, isAdmin, isBootstrapping, user } = useAuth();
  const location = useLocation();

  if (isBootstrapping) {
    return (
      <section className="content-panel">Đang tải phiên đăng nhập...</section>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;
