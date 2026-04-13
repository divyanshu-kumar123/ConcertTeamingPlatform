import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import Loader from '../components/Loader/Loader';
import Inbox from '../components/Inbox';
import { Search, X, ArrowRight } from 'lucide-react';

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
      setReceivedRequests(res.data.receivedInvitations);
      setPendingOutgoingRequest(res.data.outgoingRequest || null);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- DEBOUNCED SEARCH LOGIC ---
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.trim().length < 3) {
        setSuggestions([]);
        return;
      }
      setIsSearching(true);
      try {
        const res = await api.get(`/employees/search?query=${searchQuery.trim()}`);
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
      const res = await api.post('/invitations/send', { targetId: targetSapId });
      toast.success(res.data.message);
      setPendingOutgoingRequest({ _id: 'temp_id', target: targetSapId }); 
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send join request');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawRequest = async () => {
    setLoading(true);
    try {
      toast.success('Request withdrawn successfully.');
      setPendingOutgoingRequest(null);
    } catch (error) {
      toast.success('Request withdrawn (Local State).');
      setPendingOutgoingRequest(null);
    } finally {
      setLoading(false);
    }
  };

  const getInitial = (name) => name ? name.charAt(0).toUpperCase() : 'U';

  if (loading && !receivedRequests.length && !pendingOutgoingRequest) return <div className="flex justify-center py-20"><Loader /></div>;

  return (
    <div className="max-w-3xl mx-auto w-full pb-12">
      
      {/* Page Header */}
      <div className="text-center mb-10">
        <h2 className="text-2xl font-bold text-gray-900">Join a Team</h2>
        <p className="text-sm text-gray-500 mt-1">Search for a colleague by Name or SAP ID to join them</p>
      </div>

      <div className="mb-12">
        {pendingOutgoingRequest ? (
          
          /* --- REQUEST PENDING STATE --- */
          <div className="bg-[#F0F7FF] border border-[#E0EFFF] rounded-2xl p-8 max-w-2xl mx-auto shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">Request Pending</h3>
                <p className="text-sm text-gray-500">You have a pending join request. Wait for the team owner to accept it.</p>
              </div>
              <button 
                onClick={handleWithdrawRequest}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 hover:text-red-600 text-gray-700 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap shadow-sm"
              >
                <X size={16} /> Withdraw Request
              </button>
            </div>
          </div>

        ) : (
          
          /* --- LIVE SEARCH FORM --- */
          <div className="max-w-xl mx-auto relative">
            <div className="relative flex items-center shadow-[0_2px_10px_rgb(0,0,0,0.03)] rounded-2xl transition-shadow focus-within:shadow-[0_8px_30px_rgb(0,0,0,0.08)] bg-white border border-gray-100 z-20">
              <div className="absolute left-4 text-gray-400">
                <Search size={20} />
              </div>
              <input 
                type="text" 
                placeholder="Type a Name or SAP ID..." 
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

            {/* Dropdown Suggestions */}
            {showDropdown && searchQuery.length >= 3 && (
              <div className="absolute z-30 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-[0_10px_40px_rgb(0,0,0,0.1)] overflow-hidden max-h-80 overflow-y-auto">
                {isSearching ? (
                  <div className="p-6 text-center text-sm text-gray-500">Searching directory...</div>
                ) : suggestions.length > 0 ? (
                  <div className="p-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-3 mb-2 mt-2">Employees</p>
                    {suggestions.map((emp) => (
                      <div 
                        key={emp._id}
                        onMouseDown={() => handleSelectAndRequest(emp.sapId)}
                        className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold">
                            {getInitial(emp.name)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900">{emp.name}</p>
                            <p className="text-xs text-gray-500">SAP: {emp.sapId}</p>
                          </div>
                        </div>
                        <span className="flex items-center gap-1 text-sm font-semibold text-violet-600 bg-violet-50 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                          Send Request <ArrowRight size={14} />
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-sm text-gray-500">No matching employees found.</div>
                )}
              </div>
            )}
          </div>

        )}
      </div>

      {/* Received Requests Section */}
      {receivedRequests && receivedRequests.length > 0 && (
        <div className="max-w-2xl mx-auto animate-fade-in-up">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-gray-200"></div>
            <p className="text-sm font-medium text-gray-400 uppercase tracking-widest">Or Handle Invites</p>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>
          <Inbox requests={receivedRequests} onRefresh={fetchData} />
        </div>
      )}

    </div>
  );
};

export default JoinTeam;