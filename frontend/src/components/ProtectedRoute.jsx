import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';

const ProtectedRoute = ({ allowedRoles }) => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  // If they are not logged in at all, kick them to the login page
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // If a specific role is required (like Admin) and they don't have it, kick them to their dashboard
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // If they pass the checks, render the child route
  return <Outlet />;
};

export default ProtectedRoute;