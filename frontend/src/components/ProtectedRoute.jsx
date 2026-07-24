import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
};

export const AdminRoute = ({ children }) => {
  const { user, isAdmin } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
};

// Cho phép admin và pos_staff
export const StaffRoute = ({ children }) => {
  const { user, isStaff } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!isStaff) return <Navigate to="/" replace />;
  return children;
};
