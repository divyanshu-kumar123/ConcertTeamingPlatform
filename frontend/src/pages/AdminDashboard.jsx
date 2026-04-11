import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import api from '../services/api';
import Loader from '../components/Loader/Loader';
import { ShieldCheck, Download, Wand2, Users, User, LayoutGrid, CheckCircle2 } from 'lucide-react';

const AdminDashboard = () => {
  const { user } = useSelector((state) => state.auth);

  const [loading, setLoading] = useState(true);
  const [allocating, setAllocating] = useState(false);
  const [data, setData] = useState({
    seatingGroups: [],
    teams: [],
    soloEmployees: [],
    summary: { totalTeams: 0, totalSoloEmployees: 0 }
  });

  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/admin/dashboard');
      setData(res.data);
    } catch (error) {
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // --- ADMIN ACTIONS ---

  const handleAutoAllocate = async () => {
    if (!window.confirm('Are you sure you want to run the auto-allocation algorithm? This will assign seats to all unassigned teams.')) return;
    
    setAllocating(true);
    try {
      const res = await api.post('/admin/auto-allocate');
      toast.success(res.data.message || 'Allocation complete!');
      await fetchDashboardData(); 
    } catch (error) {
      toast.error(error.response?.data?.message || 'Allocation failed');
    } finally {
      setAllocating(false);
    }
  };

  const handleExport = async () => {
    try {
      const toastId = toast.loading('Generating Excel file...');
      const res = await api.get('/admin/export', { responseType: 'blob' });
      
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'Event_Seating_Arrangement.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      
      toast.success('Export downloaded successfully!', { id: toastId });
    } catch (error) {
      toast.error('Failed to download export');
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader /></div>;

  return (
    <div className="max-w-6xl mx-auto w-full pb-12">
      
      {/* Page Header with Admin Badge */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-violet-100 text-violet-700 text-xs font-bold rounded-full flex items-center gap-1">
              <ShieldCheck size={14} /> Admin Privileges Active
            </span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Control Center</h2>
          <p className="text-sm text-gray-500 mt-1">Manage seating allocations and export event data</p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex gap-3 w-full sm:w-auto">
          <button 
            onClick={handleExport}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <Download size={18} /> Export Excel
          </button>
          <button 
            onClick={handleAutoAllocate} 
            disabled={allocating}
            className="flex-1 sm:flex-none px-5 py-2.5 bg-gray-900 hover:bg-black disabled:bg-gray-400 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            {allocating ? <Loader size="sm" color="white" /> : <Wand2 size={18} />}
            {allocating ? 'Allocating...' : 'Auto-Allocate'}
          </button>
        </div>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex items-center gap-5">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <Users size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Total Teams Formed</p>
            <h4 className="text-2xl font-bold text-gray-900">{data.summary.totalTeams}</h4>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex items-center gap-5">
          <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
            <User size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Solo Employees (Pending)</p>
            <h4 className="text-2xl font-bold text-gray-900">{data.summary.totalSoloEmployees}</h4>
          </div>
        </div>
      </div>

      {/* Main Split Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Seating Capacities (1/3 width) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 rounded-full bg-violet-50 flex items-center justify-center text-violet-600">
                <LayoutGrid size={18} />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Seating Groups</h3>
            </div>

            <div className="space-y-5">
              {data.seatingGroups.map(group => {
                const fillPercentage = group.capacity > 0 ? Math.round((group.allocatedCount / group.capacity) * 100) : 0;
                const isFull = fillPercentage >= 100;

                return (
                  <div key={group._id}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-semibold text-gray-900">Group {group.name}</span>
                      <span className="text-gray-500">{group.allocatedCount} / {group.capacity} seats</span>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full transition-all duration-500 ${isFull ? 'bg-green-500' : 'bg-violet-500'}`} 
                        style={{ width: `${Math.min(fillPercentage, 100)}%` }}
                      ></div>
                    </div>
                    {isFull && <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><CheckCircle2 size={12} /> At Capacity</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Teams List (2/3 width) */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] overflow-hidden h-full flex flex-col">
            
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0">
              <div>
                <h3 className="text-lg font-bold text-gray-900">All Teams</h3>
                <p className="text-sm text-gray-500">Sorted by size (largest first)</p>
              </div>
              <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full">
                {data.teams.length} total
              </span>
            </div>

            <div className="overflow-y-auto max-h-[500px] p-2">
              {data.teams.length > 0 ? (
                <div className="space-y-2">
                  {data.teams.map((team, index) => (
                    <div key={team._id} className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                      
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-bold">
                          #{index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-mono text-gray-900 font-semibold">{team._id.substring(0, 8).toUpperCase()}</p>
                          <p className="text-xs text-gray-500">{team.members.length} member{team.members.length !== 1 && 's'}</p>
                        </div>
                      </div>

                      <div>
                        {team.seatingGroupId ? (
                          <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-100">
                            Group {team.seatingGroupId.name}
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-orange-50 text-orange-700 text-xs font-bold rounded-full border border-orange-100">
                            Unassigned
                          </span>
                        )}
                      </div>

                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <Users size={48} className="mb-4 text-gray-200" />
                  <p className="text-sm">No teams have been formed yet.</p>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;