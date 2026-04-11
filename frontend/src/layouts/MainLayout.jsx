import { useState, useRef, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { ArrowLeft, LogOut, User as UserIcon } from 'lucide-react';
import { logout } from '../features/auth/authSlice';

const MainLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  // State and Ref for the interactive profile dropdown
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Helper for Avatar letter
  const getInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };

  const isDashboard = location.pathname === '/';

  // Handle Redux Logout
  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  // Close the dropdown if the user clicks anywhere else on the screen
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F4F6FB] to-[#FDFDFE] font-sans relative pb-10">
      
      {/* --- TOP NAVIGATION BAR --- */}
      <header className="w-full bg-white/60 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40">
        <div className="w-full px-6 md:px-12 lg:px-20">
          <div className="flex justify-between items-center h-24">
            
            {/* LEFT SIDE */}
            <div className="flex items-center">
              {isDashboard ? (
                <div>
                  <h1 className="text-xl font-bold text-gray-900 tracking-tight">Concert Team Portal</h1>
                  <p className="text-sm text-gray-500 mt-1">Welcome, {user?.name || 'Employee'}</p>
                </div>
              ) : (
                <button 
                  onClick={() => navigate('/')}
                  className="flex items-center gap-3 text-gray-600 hover:text-gray-900 transition-colors font-medium group"
                >
                  <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                  Back to Dashboard
                </button>
              )}
            </div>

            {/* RIGHT SIDE: Interactive User Profile Widget */}
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-gray-900">{user?.name || 'John Doe'}</p>
                <p className="text-xs text-gray-500 uppercase tracking-wide mt-0.5">{user?.sapId || 'SAP000'}</p>
              </div>
              
              {/* Clickable Profile Area */}
              <div className="relative" ref={profileRef}>
                <button 
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="w-11 h-11 rounded-full bg-violet-600 hover:bg-violet-700 flex items-center justify-center text-white font-bold text-lg shadow-sm shadow-violet-200 transition-all focus:outline-none focus:ring-4 focus:ring-violet-100"
                >
                  {getInitial(user?.name)}
                </button>

                {/* The Dropdown Menu */}
                {isProfileOpen && (
                  <div className="absolute right-0 mt-3 w-48 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 py-2 z-50 origin-top-right transition-all">
                    {/* Mobile info fallback */}
                    <div className="px-4 py-3 border-b border-gray-50 mb-1 sm:hidden">
                      <p className="text-sm font-semibold text-gray-900 truncate">{user?.name || 'John Doe'}</p>
                      <p className="text-xs text-gray-500 uppercase">{user?.sapId || 'SAP000'}</p>
                    </div>
                    
                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors text-left"
                    >
                      <LogOut size={16} /> Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
            
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="w-full px-6 md:px-12 lg:px-20 pt-12">
        <Outlet />
      </main>

      {/* --- FLOATING HELP BUTTON --- */}
      <button 
        className="fixed bottom-8 right-8 w-12 h-12 bg-[#1A1A1A] hover:bg-black text-white rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 z-50 focus:outline-none focus:ring-4 focus:ring-gray-200"
        aria-label="Help and Support"
      >
        <span className="text-xl font-medium">?</span>
      </button>

    </div>
  );
};

export default MainLayout;