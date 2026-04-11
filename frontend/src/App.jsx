import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useSelector } from 'react-redux';

// Pages & Components
import Login from './pages/Login';
import EmployeeDashboard from './pages/EmployeeDashboard';
import ManageTeam from './pages/ManageTeam';
import JoinTeam from './pages/JoinTeam';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout'; // <-- Import the new layout

function App() {
  const { user } = useSelector((state) => state.auth);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <Toaster position="top-right" />
      
      <Router>
        <Routes>
          {/* Public Route (Login handles its own background/styling) */}
          <Route path="/login" element={<Login />} />

          {/* Protected Routes wrapped in MainLayout */}
          <Route element={<ProtectedRoute />}>
            <Route element={<MainLayout />}>
              <Route 
                path="/" 
                element={user?.role === 'ADMIN' ? <Navigate to="/admin" replace /> : <EmployeeDashboard />} 
              />
              <Route path="/manage-team" element={<ManageTeam />} />
              <Route path="/join-team" element={<JoinTeam />} />
            </Route>
          </Route>

          {/* Admin Routes (Also wrapped in MainLayout) */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route element={<MainLayout />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </div>
  );
}

export default App;