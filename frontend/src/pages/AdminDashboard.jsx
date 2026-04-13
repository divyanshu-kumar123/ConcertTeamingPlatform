import { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import api from '../services/api';
import Loader from '../components/Loader/Loader';
import { 
  ShieldCheck, Download, Wand2, Users, User, LayoutGrid, 
  CheckCircle2, ChevronDown, ChevronUp, X, Search
} from 'lucide-react';

const AdminDashboard = () => {
  const { user } = useSelector((state) => state.auth);

  // --- CORE DATA ---
  const [loading, setLoading] = useState(true);
  const [allocating, setAllocating] = useState(false);
  const [data, setData] = useState({
    seatingGroups: [],
    teams: [],
    soloEmployees: [],
    summary: { totalTeams: 0, totalSoloEmployees: 0 }
  });

  // --- ACCORDION STATE (Main View) ---
  const [expandedTeamId, setExpandedTeamId] = useState(null);

  // --- MODAL STATES (Group Drill-down) ---
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupDetails, setGroupDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [modalTab, setModalTab] = useState('teams'); 
  const [modalSearch, setModalSearch] = useState('');

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

  useEffect(() => { fetchDashboardData(); }, []);

  // --- LOGIC HANDLERS ---
  const toggleTeamExpansion = (teamId) => {
    setExpandedTeamId(prev => (prev === teamId ? null : teamId));
  };

  const handleViewGroupDetails = async (group) => {
    setSelectedGroup(group);
    setLoadingDetails(true);
    setModalSearch(''); 
    try {
      const res = await api.get(`/admin/groups/${group._id}/occupants`);
      setGroupDetails(res.data);
    } catch (error) {
      toast.error("Failed to fetch group occupants");
      setSelectedGroup(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Instant filtering for the 1,200+ occupants in the Modal
  const filteredOccupants = useMemo(() => {
    if (!groupDetails) return { teams: [], solo: [] };
    const search = modalSearch.toLowerCase();
    
    return {
      teams: groupDetails.teams.filter(t => 
        t._id.toLowerCase().includes(search) || 
        t.members.some(m => m.name.toLowerCase().includes(search) || m.sapId.toLowerCase().includes(search))
      ),
      solo: groupDetails.soloEmployees.filter(s => 
        s.name.toLowerCase().includes(search) || s.sapId.toLowerCase().includes(search)
      )
    };
  }, [groupDetails, modalSearch]);

  // --- GLOBAL ACTIONS ---
  const handleAutoAllocate = async () => {
    if (!window.confirm('Run auto-allocation for all unassigned teams?')) return;
    setAllocating(true);
    try {
      await api.post('/admin/auto-allocate');
      toast.success('Allocation complete!');
      await fetchDashboardData(); 
    } catch (error) { toast.error('Allocation failed'); }
    finally { setAllocating(false); }
  };

  const handleExport = async () => {
    try {
      const toastId = toast.loading('Generating Excel...');
      const res = await api.get('/admin/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url; link.setAttribute('download', 'Seating_Arrangement.xlsx');
      document.body.appendChild(link); link.click();
      toast.success('Exported!', { id: toastId });
    } catch (error) { toast.error('Export failed'); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader /></div>;

  return (
    <div className="max-w-7xl mx-auto w-full pb-12 px-4 sm:px-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-violet-100 text-violet-700 text-[10px] font-black uppercase tracking-widest rounded-full">
              <ShieldCheck size={12} className="inline mr-1" /> Admin Privileges
            </span>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Control Center</h2>
          <p className="text-sm text-gray-500">Live monitoring of {data.summary.totalTeams} teams</p>
        </div>

        <div className="flex gap-3 w-full sm:w-auto">
          <button onClick={handleExport} className="flex-1 sm:flex-none px-6 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-2xl text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2">
            <Download size={18} /> Export
          </button>
          <button onClick={handleAutoAllocate} disabled={allocating} className="flex-1 sm:flex-none px-8 py-3 bg-gray-900 hover:bg-black disabled:bg-gray-400 text-white rounded-2xl text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2">
            {allocating ? <Loader size="sm" color="white" /> : <Wand2 size={18} />}
            {allocating ? 'Allocating...' : 'Auto-Allocate'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* LEFT SIDE: Seating Group Summary */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm sticky top-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-600 shadow-inner">
                <LayoutGrid size={20} />
              </div>
              <h3 className="text-lg font-bold">Groups</h3>
            </div>

            <div className="space-y-3">
              {data.seatingGroups.map(group => {
                const fill = group.capacity > 0 ? Math.round((group.allocatedCount / group.capacity) * 100) : 0;
                return (
                  <div 
                    key={group._id} 
                    onClick={() => handleViewGroupDetails(group)}
                    className="p-4 rounded-2xl border border-gray-50 bg-gray-50/30 hover:bg-white hover:border-violet-200 hover:shadow-md cursor-pointer transition-all active:scale-95 group"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-bold text-gray-900 text-sm">Group {group.name}</span>
                      <span className="text-[10px] font-bold text-gray-400">{group.allocatedCount}/{group.capacity}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-700 ${fill >= 100 ? 'bg-green-500' : 'bg-violet-600'}`} 
                        style={{ width: `${Math.min(fill, 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-[10px] text-violet-500 font-bold mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      VIEW FULL LIST →
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: All Teams Registry */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
              <h3 className="font-bold text-gray-900">All Teams Registry</h3>
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white px-3 py-1 rounded-full border border-gray-100">
                {data.teams.length} Records
              </span>
            </div>

            <div className="divide-y divide-gray-50">
              {data.teams.map((team, index) => (
                <div key={team._id} className="border-l-4 border-transparent hover:border-violet-500 transition-all">
                  {/* Clickable Header Row */}
                  <div 
                    onClick={() => toggleTeamExpansion(team._id)} 
                    className={`flex items-center justify-between p-5 cursor-pointer transition-colors ${expandedTeamId === team._id ? 'bg-violet-50/30' : 'hover:bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-black text-gray-300 w-4">{(index + 1).toString().padStart(2, '0')}</span>
                      <div>
                        <p className="text-sm font-mono font-bold text-gray-900 uppercase">TEAM-{team._id.substring(18)}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{team.members.length} Members</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {team.seatingGroupId ? (
                        <span className="hidden sm:inline-block px-3 py-1 bg-green-50 text-green-700 text-[10px] font-black rounded-lg uppercase border border-green-100">
                          Group {team.seatingGroupId.name}
                        </span>
                      ) : (
                        <span className="hidden sm:inline-block px-3 py-1 bg-gray-100 text-gray-400 text-[10px] font-black rounded-lg uppercase">Waiting</span>
                      )}
                      {expandedTeamId === team._id ? <ChevronUp size={16} className="text-violet-600" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </div>

                  {/* Expanded Member Content */}
                  {expandedTeamId === team._id && (
                    <div className="bg-gray-50/50 p-5 border-t border-gray-100">
                      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-gray-50/50 border-b border-gray-100">
                            <tr>
                              <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Employee</th>
                              <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">SAP ID</th>
                            </tr>
                          </thead>
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
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* --- MODAL: GROUP OCCUPANCY TABLE (Optimized for 1,200+) --- */}
      {selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col border border-white/20">
            
            {/* Header */}
            <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-2xl font-black text-gray-900 tracking-tight">Group {selectedGroup.name} Contents</h3>
                  <span className="px-3 py-1 bg-violet-600 text-white text-[10px] font-black rounded-full uppercase">
                    {selectedGroup.allocatedCount}/{selectedGroup.capacity} Seats
                  </span>
                </div>
                <p className="text-sm text-gray-500 font-medium">Viewing all assigned personnel in this zone</p>
              </div>
              <button onClick={() => setSelectedGroup(null)} className="p-3 hover:bg-gray-200 rounded-2xl transition-all">
                <X size={24} />
              </button>
            </div>

            {/* Modal Controls */}
            <div className="px-8 py-4 bg-white border-b border-gray-100 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
                <button 
                  onClick={() => setModalTab('teams')}
                  className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-xs font-bold transition-all ${modalTab === 'teams' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                >
                  Teams ({groupDetails?.teams.length || 0})
                </button>
                <button 
                  onClick={() => setModalTab('solo')}
                  className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-xs font-bold transition-all ${modalTab === 'solo' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                >
                  Solo ({groupDetails?.soloEmployees.length || 0})
                </button>
              </div>

              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input 
                  type="text"
                  placeholder="Filter by name or ID..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                />
              </div>
            </div>

            {/* Large-Scale Table Content */}
            <div className="flex-1 overflow-y-auto bg-white">
              {loadingDetails ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400"><Loader size="lg" /></div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                        {modalTab === 'teams' ? 'Team Context' : 'Employee Name'}
                      </th>
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                        {modalTab === 'teams' ? 'Members Assigned' : 'SAP ID'}
                      </th>
                      <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 text-right">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {modalTab === 'teams' ? (
                      filteredOccupants.teams.map(team => (
                        <tr key={team._id} className="hover:bg-violet-50/30">
                          <td className="px-8 py-4 align-top">
                            <p className="text-xs font-mono font-bold text-violet-600 uppercase">TEAM-{team._id.substring(18)}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">{team.members.length} Members</p>
                          </td>
                          <td className="px-8 py-4">
                            <div className="flex flex-wrap gap-1.5">
                              {team.members.map(m => (
                                <span key={m._id} className="inline-flex items-center px-2 py-1 bg-white border border-gray-100 rounded text-[9px] font-bold text-gray-600 shadow-sm">
                                  {m.name} <span className="ml-1 text-gray-300">#{m.sapId}</span>
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-8 py-4 text-right align-top">
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-md">
                              <CheckCircle2 size={10} /> SEATED
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      filteredOccupants.solo.map(emp => (
                        <tr key={emp._id} className="hover:bg-blue-50/30">
                          <td className="px-8 py-5 font-bold text-gray-800">{emp.name}</td>
                          <td className="px-8 py-5 font-mono text-gray-500 text-xs">{emp.sapId}</td>
                          <td className="px-8 py-5 text-right">
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-md">SOLO SEAT</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer Summary */}
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
              <div>Filtered Results: {modalTab === 'teams' ? filteredOccupants.teams.length : filteredOccupants.solo.length} entries</div>
              <div>Search Filter: {modalSearch || 'None'}</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;