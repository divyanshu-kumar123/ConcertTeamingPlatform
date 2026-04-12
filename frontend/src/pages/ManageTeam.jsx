import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import api from '../services/api';
import toast from 'react-hot-toast';
import Loader from '../components/Loader/Loader';
import Inbox from '../components/Inbox';
import { Copy, Users, AlertCircle, Plus, Trash2, Eye, EyeOff } from 'lucide-react';

const ManageTeam = () => {
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [teamData, setTeamData] = useState(null);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [inviteSapId, setInviteSapId] = useState('');
  const [showCode, setShowCode] = useState(false);

  const fetchData = async () => {
    try {
      const res = await api.get('/employees/me');
      setTeamData(res.data.team);
      setReceivedRequests(res.data.receivedInvitations);
    } catch (error) {
      toast.error('Failed to load team data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!inviteSapId.trim()) return toast.error('Please enter an SAP ID');
    
    setLoading(true);
    try {
      const res = await api.post('/invitations/send', { targetId: inviteSapId.trim() });
      toast.success(res.data.message);
      setInviteSapId('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send invite');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (teamData?._id) {
      navigator.clipboard.writeText(teamData._id);
      toast.success('Team Code copied to clipboard!');
    }
  };

  const getInitial = (name) => name ? name.charAt(0).toUpperCase() : 'U';

  if (loading) return <div className="flex justify-center py-20"><Loader /></div>;

  return (
    <div className="max-w-5xl mx-auto w-full pb-12">
      
      {/* Top Banner: Team Code */}
      <div className="flex flex-col items-center justify-center mb-10 text-center">
        <p className="text-sm font-medium text-gray-500 mb-2">Your Team Code</p>
        <button 
          onClick={copyToClipboard}
          className="flex items-center gap-3 px-6 py-3 bg-blue-50/50 border border-blue-200 rounded-xl hover:bg-blue-50 transition-colors group"
        >
          <span className="text-2xl font-bold text-blue-600 tracking-wider">
            {teamData ? (showCode ? teamData._id : '••••••••') : 'PENDING'}
          </span>
          <Copy size={20} className="text-blue-400 group-hover:text-blue-600 transition-colors" />
          {showCode ? (
            <Eye 
              size={20} 
              className="text-blue-400 group-hover:text-blue-600 transition-colors cursor-pointer" 
              onClick={(e) => { e.stopPropagation(); setShowCode(false); }} 
            />
          ) : (
            <EyeOff 
              size={20} 
              className="text-blue-400 group-hover:text-blue-600 transition-colors cursor-pointer" 
              onClick={(e) => { e.stopPropagation(); setShowCode(true); }} 
            />
          )}
        </button>
        <p className="text-sm text-gray-500 mt-3">Share this code with others to join your team</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LEFT COLUMN: Team Members */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] h-full flex flex-col">
          
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Users size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Team Members</h3>
              <p className="text-sm text-gray-500">{teamData ? teamData.members.length : 1} member{teamData?.members.length !== 1 && 's'}</p>
            </div>
          </div>

          {/* Inline Invite Form (Added based on your functional requirement) */}
          <form onSubmit={handleInviteMember} className="flex gap-2 mb-6">
            <input 
              type="text" 
              placeholder="Invite via SAP ID..." 
              value={inviteSapId}
              onChange={(e) => setInviteSapId(e.target.value)}
              className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
            <button type="submit" className="px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-1">
              <Plus size={16} /> Add
            </button>
          </form>

          {/* Members List */}
          <div className="space-y-4 flex-1">
            {teamData ? (
              teamData.members.map((member) => (
                <div key={member._id} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold shadow-sm">
                      {getInitial(member.name)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{member.name}</p>
                      <p className="text-xs text-gray-500 uppercase">{member.sapId}</p>
                    </div>
                  </div>
                  {/* Owner Badge (Mock logic: Assuming first member or yourself is owner for visual sake) */}
                  {member._id === user.id && (
                    <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-full">
                      Owner
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold">
                  {getInitial(user.name)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500 uppercase">{user.sapId}</p>
                </div>
                <span className="ml-auto px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-full">Owner</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: The Inbox Component */}
        <div>
          <Inbox requests={receivedRequests} onRefresh={fetchData} />
        </div>

      </div>

      {/* Danger Zone: Team Management */}
      <div className="mt-6 bg-red-50/30 border border-red-100 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="text-red-500">
            <AlertCircle size={24} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900">Team Management</h4>
            <p className="text-sm text-gray-500 mt-0.5">Leaving the team will delete it permanently.</p>
          </div>
        </div>
        <button 
          onClick={() => toast.error('Delete backend route not yet mapped!')}
          className="px-6 py-2.5 bg-[#E11D48] hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm shadow-red-200 whitespace-nowrap"
        >
          Delete Team
        </button>
      </div>

    </div>
  );
};

export default ManageTeam;