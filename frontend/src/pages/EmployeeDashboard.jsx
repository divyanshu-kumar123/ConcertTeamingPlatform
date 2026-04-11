import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Users, UserPlus, Settings, ArrowRight } from 'lucide-react';

const EmployeeDashboard = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto w-full">
      
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Team Selection</h2>
        <p className="text-sm text-gray-500 mt-1">Choose to create a new team or join an existing one</p>
      </div>

      {/* Main Action Cards (CSS Grid for Responsive Layout) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: Create Team */}
        <div 
          onClick={() => navigate('/manage-team')}
          className="bg-white rounded-2xl p-8 border border-gray-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-blue-100 transition-all duration-300 cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
            <Users size={24} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Create Team</h3>
          <p className="text-sm text-gray-500 mb-8 min-h-[40px]">
            Start a new team and invite others to join
          </p>
          <div className="flex items-center text-sm font-semibold text-blue-600">
            Get Started 
            <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Card 2: Join Team */}
        <div 
          onClick={() => navigate('/join-team')}
          className="bg-white rounded-2xl p-8 border border-gray-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:border-violet-100 transition-all duration-300 cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-full bg-violet-50 flex items-center justify-center text-violet-600 mb-6 group-hover:scale-110 transition-transform">
            <UserPlus size={24} />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Join Team</h3>
          <p className="text-sm text-gray-500 mb-8 min-h-[40px]">
            Search for a team using team code or SAP ID
          </p>
          <div className="flex items-center text-sm font-semibold text-violet-600">
            Search Teams 
            <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

      </div>

      {/* Admin Panel Link (Only visible if they have the ADMIN role) */}
      {user?.role === 'ADMIN' && (
        <div className="mt-8 bg-white/50 backdrop-blur-sm border border-dashed border-gray-300 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
              <Settings size={20} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-gray-900">Admin Panel</h4>
              <p className="text-xs text-gray-500 mt-0.5">Manage all teams and seat allocations</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/admin')}
            className="px-5 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap"
          >
            Access Admin
          </button>
        </div>
      )}

    </div>
  );
};

export default EmployeeDashboard;