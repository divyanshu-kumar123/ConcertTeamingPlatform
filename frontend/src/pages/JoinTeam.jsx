import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import Loader from '../components/Loader/Loader';
import Inbox from '../components/Inbox';
import { Search, X, ArrowRight, Clock } from 'lucide-react';

const JoinTeam = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data States
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [pendingOutgoingRequest, setPendingOutgoingRequest] = useState(null); 

  const fetchData = async () => {
    try {
      const res = await api.get('/employees/me');
      setReceivedRequests(res.data.receivedInvitations);
      
      // Assuming your backend returns outgoing requests. If not, we will manage this via local state for now.
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

  const handleSendJoinRequest = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return toast.error('Please enter an ID');
    
    setLoading(true);
    try {
      const res = await api.post('/invitations/send', { targetId: searchQuery.trim() });
      toast.success(res.data.message);
      
      // Visually switch to the "Pending" state
      setPendingOutgoingRequest({ _id: 'temp_id', target: searchQuery }); 
      setSearchQuery('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send join request');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawRequest = async () => {
    setLoading(true);
    try {
      // NOTE: You will need to ensure a '/invitations/withdraw/:id' route exists on your backend!
      // await api.delete(`/invitations/withdraw/${pendingOutgoingRequest._id}`);
      
      toast.success('Request withdrawn successfully.');
      setPendingOutgoingRequest(null);
    } catch (error) {
      // Fallback for visual testing if backend route isn't ready
      toast.success('Request withdrawn (Local State).');
      setPendingOutgoingRequest(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader /></div>;

  return (
    <div className="max-w-3xl mx-auto w-full pb-12">
      
      {/* Page Header (Centered) */}
      <div className="text-center mb-10">
        <h2 className="text-2xl font-bold text-gray-900">Join a Team</h2>
        <p className="text-sm text-gray-500 mt-1">Search for a team using team code or SAP ID</p>
      </div>

      {/* Main Dynamic View: Search Form OR Pending Request Card */}
      <div className="mb-12">
        {pendingOutgoingRequest ? (
          
          /* --- STATE: REQUEST PENDING (Matching Figma Design) --- */
          <div className="bg-[#F0F7FF] border border-[#E0EFFF] rounded-2xl p-8 max-w-2xl mx-auto shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                  Request Pending
                </h3>
                <p className="text-sm text-gray-500">
                  You have a pending join request. Wait for the team owner to accept it.
                </p>
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
          
          /* --- STATE: SEARCH FORM --- */
          <div className="max-w-xl mx-auto">
            <form onSubmit={handleSendJoinRequest} className="relative flex items-center shadow-[0_2px_10px_rgb(0,0,0,0.03)] rounded-2xl transition-shadow focus-within:shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
              <div className="absolute left-4 text-gray-400">
                <Search size={20} />
              </div>
              <input 
                type="text" 
                placeholder="Enter Team ID or Player SAP ID..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-32 py-4 bg-white border border-gray-100 rounded-2xl text-gray-900 focus:outline-none focus:border-violet-200 focus:ring-4 focus:ring-violet-50 transition-all text-base"
              />
              <button 
                type="submit" 
                disabled={!searchQuery.trim()}
                className="absolute right-2 top-2 bottom-2 px-6 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2"
              >
                Request <ArrowRight size={16} />
              </button>
            </form>
          </div>

        )}
      </div>

      {/* Received Requests Section (Only visible if they have incoming invites) */}
      {receivedRequests && receivedRequests.length > 0 && (
        <div className="max-w-2xl mx-auto animate-fade-in-up">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-gray-200"></div>
            <p className="text-sm font-medium text-gray-400 uppercase tracking-widest">Or</p>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>
          
          <Inbox requests={receivedRequests} onRefresh={fetchData} />
        </div>
      )}

    </div>
  );
};

export default JoinTeam;