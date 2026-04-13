import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import api from '../services/api';
import Loader from '../components/Loader/Loader';
import { 
  ShieldCheck, Download, Wand2, Users, User, LayoutGrid, 
  CheckCircle2, ChevronDown, ChevronUp, X, Search, ChevronLeft, ChevronRight
} from 'lucide-react';

const AdminDashboard = () => {
  const { user } = useSelector((state) => state.auth);

  // --- DATA STATES ---
  const [loading, setLoading] = useState(true);
  const [allocating, setAllocating] = useState(false);
  const [data, setData] = useState({
    seatingGroups: [],
    teams: [],
    pagination: { totalTeams: 0, currentPage: 1, totalPages: 1 },
    summary: { totalTeams: 0, totalSoloEmployees: 0 }
  });

  // --- FILTER & PAGINATION STATES ---
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedTeamId, setExpandedTeamId] = useState(null);

  // --- MODAL STATES ---
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupDetails, setGroupDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [modalTab, setModalTab] = useState('teams'); 
  const [modalSearch, setModalSearch] = useState('');

  // 1. FETCH DATA (Paginated & Searchable)
  const fetchDashboardData = useCallback(async (page = 1, search = "") => {
    // We only show the full loader on initial mount. 
    // Subsequent searches/page changes feel faster with localized loading.
    try {
      const res = await api.get(`/admin/dashboard?page=${page}&limit=10&search=${search}`);
      setData(res.data);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  // 2. DEBOUNCED SEARCH EFFECT
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setLoading(true); // Show loader for the registry specifically
      setCurrentPage(1); // Reset to page 1 on search
      fetchDashboardData(1, searchQuery);
    }, 600); // 600ms debounce is best practice for server-side search

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, fetchDashboardData]);

  // Handle Page Change
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > data.pagination.totalPages) return;
    setCurrentPage(newPage);
    fetchDashboardData(newPage, searchQuery);
    // Smooth scroll to the top of the registry
    document.getElementById('teams-registry').scrollIntoView({ behavior: 'smooth' });
  };

  const handleViewGroupDetails = async (group) => {
    setSelectedGroup(group);
    setLoadingDetails(true);
    try {
      const res = await api.get(`/admin/groups/${group._id}/occupants`);
      setGroupDetails(res.data);
    } catch (error) {
      toast.error("Failed to fetch occupants");
      setSelectedGroup(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const filteredModalOccupants = useMemo(() => {
    if (!groupDetails) return { teams: [], solo: [] };
    const search = modalSearch.toLowerCase();
    return {
      teams: groupDetails.teams.filter(t => 
        t._id.toLowerCase().includes(search) || 
        t.members.some(m => m.name.toLowerCase().includes(search) || m.sapId.toLowerCase().includes(search))
      ),
      solo: groupDetails.soloEmployees.filter(s => s.name.toLowerCase().includes(search) || s.sapId.toLowerCase().includes(search))
    };
  }, [groupDetails, modalSearch]);

  const handleAutoAllocate = async () => {
    if (!window.confirm('Run auto-allocation?')) return;
    setAllocating(true);
    try {
      await api.post('/admin/auto-allocate');
      toast.success('Allocation complete!');
      await fetchDashboardData(currentPage, searchQuery); 
    } catch (error) { toast.error('Allocation failed'); }
    finally { setAllocating(false); }
  };

  const handleExport = async () => {
    try {
      const toastId = toast.loading('Generating Excel...');
      const res = await api.get('/admin/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url; link.setAttribute('download', 'Seating.xlsx');
      document.body.appendChild(link); link.click();
      toast.success('Exported!', { id: toastId });
    } catch (error) { toast.error('Export failed'); }
  };

  if (loading && !data.teams.length) return <div className="flex justify-center py-20"><Loader /></div>;

  return (
    <div className="max-w-7xl mx-auto w-full pb-12 px-4 sm:px-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-violet-100 text-violet-700 text-[10px] font-black uppercase tracking-widest rounded-full">
              <ShieldCheck size={12} className="inline mr-1" /> Control Center
            </span>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Admin Dashboard</h2>
        </div>

        <div className="flex gap-3 w-full sm:w-auto">
          <button onClick={handleExport} className="flex-1 sm:flex-none px-6 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-2xl text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2">
            <Download size={18} /> Export
          </button>
          <button onClick={handleAutoAllocate} disabled={allocating} className="flex-1 sm:flex-none px-8 py-3 bg-gray-900 hover:bg-black disabled:bg-gray-400 text-white rounded-2xl text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2">
            {allocating ? <Loader size="sm" color="white" /> : <Wand2 size={18} />}
            {allocating ? 'Processing...' : 'Auto-Allocate'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* LEFT: Groups Summary */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm sticky top-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600 shadow-inner">
                <LayoutGrid size={20} />
              </div>
              <h3 className="text-lg font-bold">Groups</h3>
            </div>
            <div className="space-y-3">
              {data.seatingGroups.map(group => (
                <div key={group._id} onClick={() => handleViewGroupDetails(group)} className="p-4 rounded-2xl border border-gray-50 bg-gray-50/30 hover:bg-white hover:border-violet-200 hover:shadow-md cursor-pointer transition-all active:scale-95">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-bold text-gray-900 text-sm">Group {group.name}</span>
                    <span className="text-[10px] font-bold text-gray-400">{group.allocatedCount}/{group.capacity}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div className="h-full bg-violet-600 transition-all duration-1000" style={{ width: `${Math.min((group.allocatedCount / group.capacity) * 100, 100)}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: Main Paginated Registry */}
        <div className="lg:col-span-3" id="teams-registry">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[700px]">
            
            {/* Table Header & SEARCH BAR */}
            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center bg-gray-50/30 gap-4">
              <h3 className="font-bold text-gray-900">Teams Registry</h3>
              
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text"
                  placeholder="Search by SAP ID or Name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                />
              </div>
            </div>

            {/* Teams List */}
            <div className="flex-1 divide-y divide-gray-50">
              {data.teams.length > 0 ? (
                data.teams.map((team, index) => (
                  <div key={team._id} className="group border-l-4 border-transparent hover:border-violet-500 transition-all">
                    <div onClick={() => setExpandedTeamId(expandedTeamId === team._id ? null : team._id)} className="flex items-center justify-between p-5 cursor-pointer">
                      <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black text-gray-300 w-4">{(index + 1 + (currentPage - 1) * 10).toString().padStart(2, '0')}</span>
                        <div>
                          <p className="text-sm font-mono font-bold text-gray-900 uppercase">TEAM-{team._id.substring(18)}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{team.members.length} Members</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {team.seatingGroupId && <span className="px-3 py-1 bg-green-50 text-green-700 text-[10px] font-black rounded-lg uppercase">Group {team.seatingGroupId.name}</span>}
                        {expandedTeamId === team._id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </div>
                    {expandedTeamId === team._id && (
                      <div className="bg-gray-50/50 p-5 border-t border-gray-100">
                        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                          <table className="w-full text-left text-sm">
                            <tbody className="divide-y divide-gray-50">
                              {team.members.map(m => (
                                <tr key={m._id} className="hover:bg-violet-50/30 transition-colors">
                                  <td className="px-6 py-4 font-bold text-gray-700">{m.name}</td>
                                  <td className="px-6 py-4 font-mono text-gray-500 text-right text-xs">{m.sapId}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-20 text-center text-gray-400 italic">No teams found matching your search.</div>
              )}
            </div>

            {/* PAGINATION FOOTER */}
            {data.pagination.totalPages > 1 && (
              <div className="p-6 border-t border-gray-100 flex items-center justify-between bg-white">
                <p className="text-xs font-bold text-gray-400">
                  Page {currentPage} of {data.pagination.totalPages}
                </p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-all"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button 
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === data.pagination.totalPages}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-30 transition-all"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* --- MODAL (Drill-down) --- */}
      {selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col border border-white/20">
            <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">Group {selectedGroup.name} Contents</h3>
              <button onClick={() => setSelectedGroup(null)} className="p-3 hover:bg-gray-200 rounded-2xl transition-all"><X size={24} /></button>
            </div>
            {/* Modal search stays local for instant filtering since we already fetched this group's list */}
            <div className="px-8 py-4 bg-white border-b border-gray-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
                <button onClick={() => setModalTab('teams')} className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${modalTab === 'teams' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>Teams ({groupDetails?.teams.length || 0})</button>
                <button onClick={() => setModalTab('solo')} className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${modalTab === 'solo' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>Solo ({groupDetails?.soloEmployees.length || 0})</button>
              </div>
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input type="text" placeholder="Filter current list..." value={modalSearch} onChange={(e) => setModalSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-white relative">
              {loadingDetails ? <div className="absolute inset-0 flex items-center justify-center"><Loader size="lg" /></div> : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm font-black text-gray-400 text-[10px] uppercase tracking-widest">
                    <tr><th className="px-8 py-4 border-b">Context</th><th className="px-8 py-4 border-b">Details</th><th className="px-8 py-4 border-b text-right">Status</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {modalTab === 'teams' ? filteredModalOccupants.teams.map(team => (
                      <tr key={team._id} className="hover:bg-violet-50/30">
                        <td className="px-8 py-4 align-top font-mono font-bold text-violet-600 uppercase text-xs">TEAM-{team._id.substring(18)}</td>
                        <td className="px-8 py-4">
                          <div className="flex flex-wrap gap-1.5">{team.members.map(m => (<span key={m._id} className="px-2 py-1 bg-white border border-gray-100 rounded text-[9px] font-bold text-gray-600 shadow-sm">{m.name}</span>))}</div>
                        </td>
                        <td className="px-8 py-4 text-right text-green-600 font-black text-[10px]">SEATED</td>
                      </tr>
                    )) : filteredModalOccupants.solo.map(emp => (
                      <tr key={emp._id} className="hover:bg-blue-50/30">
                        <td className="px-8 py-5 font-bold text-gray-800">{emp.name}</td>
                        <td className="px-8 py-5 font-mono text-gray-500 text-xs">{emp.sapId}</td>
                        <td className="px-8 py-5 text-right text-blue-600 font-black text-[10px]">SOLO</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;