import { Navigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthLoading, isAuthenticated } = useApp();

  // Show loading spinner while auth state resolves
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-warm-bg-start to-warm-bg-end">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-lg text-gray-500 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to Welcome if not authenticated
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;
