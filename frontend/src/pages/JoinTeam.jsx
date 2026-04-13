import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import Loader from '../components/Loader/Loader';
import Inbox from '../components/Inbox';
import { Search, X, ArrowRight, Users } from 'lucide-react';

const JoinTeam = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [pendingOutgoingRequest, setPendingOutgoingRequest] = useState(null); 

  // Live Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const fetchData = async () => {
    try {
      const res = await api.get('/employees/me');
      setReceivedRequests(res.data.receivedInvitations || []);
      // Ensure we check for any pending sent invitations
      const outgoing = res.data.sentInvitations?.find(inv => inv.status === 'PENDING');
      setPendingOutgoingRequest(outgoing || null);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- DEBOUNCED SEARCH LOGIC (Teams Only) ---
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.trim().length < 3) {
        setSuggestions([]);
        return;
      }
      setIsSearching(true);
      try {
        // CHANGED: Now points to the new dedicated search-teams endpoint
        const res = await api.get(`/employees/search-teams?query=${searchQuery.trim()}`);
        setSuggestions(res.data);
      } catch (error) {
        console.error('Search failed', error);
      } finally {
        setIsSearching(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      fetchSuggestions();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSelectAndRequest = async (targetSapId) => {
    setSearchQuery('');
    setShowDropdown(false);
    setLoading(true);
    try {
      const res = await api.post('/invitations/join-team', { targetId: targetSapId });
      toast.success(res.data.message);
      fetchData(); // Refresh to set pending state
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send request');
      setLoading(false);
    }
  };

  const handleWithdrawRequest = async () => {
    if (!pendingOutgoingRequest) return;
    setLoading(true);
    try {
      await api.delete(`/invitations/${pendingOutgoingRequest._id}`);
      toast.success('Request withdrawn.');
      setPendingOutgoingRequest(null);
    } catch (error) {
      toast.error('Failed to withdraw.');
    } finally {
      setLoading(false);
    }
  };

  const getInitial = (name) => name ? name.charAt(0).toUpperCase() : 'U';

  if (loading && !receivedRequests.length && !pendingOutgoingRequest) return <div className="flex justify-center py-20"><Loader /></div>;

  return (
    <div className="max-w-3xl mx-auto w-full pb-12 px-4">
      
      {/* Page Header - Updated to emphasize Teams */}
      <div className="text-center mb-10">
        <h2 className="text-2xl font-bold text-gray-900">Find a Team to Join</h2>
        <p className="text-sm text-gray-500 mt-1">Search by member name, SAP ID, or exact Team Code</p>
      </div>

      <div className="mb-12">
        {pendingOutgoingRequest ? (
          
          /* --- REQUEST PENDING STATE --- */
          <div className="bg-[#F0F7FF] border border-[#E0EFFF] rounded-2xl p-8 max-w-2xl mx-auto shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">Request Pending</h3>
                <p className="text-sm text-gray-500">You've requested to join a team. Wait for them to accept.</p>
              </div>
              <button 
                onClick={handleWithdrawRequest}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 hover:text-red-600 text-gray-700 text-sm font-semibold rounded-lg transition-colors shadow-sm"
              >
                <X size={16} /> Withdraw
              </button>
            </div>
          </div>

        ) : (
          
          /* --- LIVE SEARCH FORM - Updated Placeholder --- */
          <div className="max-w-xl mx-auto relative">
            <div className="relative flex items-center shadow-sm rounded-2xl bg-white border border-gray-100 z-20 focus-within:ring-2 focus-within:ring-violet-500/20 transition-all">
              <div className="absolute left-4 text-gray-400">
                <Search size={20} />
              </div>
              <input 
                type="text" 
                placeholder="Search teams by Name, SAP, or Team Code..." 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                className="w-full pl-12 pr-4 py-4 bg-transparent rounded-2xl text-gray-900 focus:outline-none text-base"
              />
            </div>

            {showDropdown && searchQuery.length >= 3 && (
              <div className="absolute z-30 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden max-h-80 overflow-y-auto">
                {isSearching ? (
                  <div className="p-6 text-center text-sm text-gray-500 font-medium">Searching existing teams...</div>
                ) : suggestions.length > 0 ? (
                  <div className="p-2">
                    {suggestions.map((emp) => (
                      <div 
                        key={emp._id}
                        onMouseDown={() => handleSelectAndRequest(emp.sapId)}
                        className="flex items-center justify-between p-3 hover:bg-violet-50 cursor-pointer rounded-xl transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold">
                            {getInitial(emp.name)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{emp.name}</p>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-gray-400 font-bold">SAP: {emp.sapId}</p>
                              <span className="flex items-center gap-1 text-[9px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded font-black uppercase">
                                <Users size={10} /> In Team
                              </span>
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] font-black text-violet-600 opacity-0 group-hover:opacity-100 uppercase tracking-tighter transition-opacity">
                          Request to Join →
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-sm text-gray-500 italic">No matching teams or members found.</div>
                )}
              </div>
            )}
          </div>

        )}
      </div>

      {receivedRequests && receivedRequests.length > 0 && (
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-gray-100"></div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Incoming Invitations</p>
            <div className="flex-1 h-px bg-gray-100"></div>
          </div>
          <Inbox requests={receivedRequests} onRefresh={fetchData} />
        </div>
      )}

    </div>
  );
};

export default JoinTeam;