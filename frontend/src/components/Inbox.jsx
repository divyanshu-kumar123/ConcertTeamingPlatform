import { useState } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Inbox as InboxIcon, Check, X } from 'lucide-react';

const Inbox = ({ requests, onRefresh }) => {
  const [loading, setLoading] = useState(false);

  const handleAction = async (actionType, inviteId) => {
    setLoading(true);
    try {
      const res = await api.post(`/invitations/${actionType}/${inviteId}`);
      toast.success(res.data.message);
      onRefresh();
    } catch (error) {
      toast.error(error.response?.data?.message || `Failed to ${actionType} request`);
    } finally {
      setLoading(false);
    }
  };

  const getInitial = (name) => name ? name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] h-full">
      {/* Card Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-10 h-10 rounded-full bg-fuchsia-50 flex items-center justify-center text-fuchsia-600">
          <InboxIcon size={20} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Join Requests</h3>
          <p className="text-sm text-gray-500">{requests?.length || 0} pending</p>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {requests && requests.length > 0 ? (
          requests.map((req) => (
            <div key={req._id} className="border border-gray-100 rounded-xl p-4 transition-colors hover:border-gray-200">
              
              {/* User Info */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold shadow-sm">
                  {getInitial(req.senderId.name)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{req.senderId.name}</p>
                  <p className="text-xs text-gray-500 uppercase">{req.senderId.sapId}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button 
                  onClick={() => handleAction('accept', req._id)} 
                  disabled={loading}
                  className="flex-1 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-sm shadow-violet-200"
                >
                  <Check size={16} /> Accept
                </button>
                <button 
                  onClick={() => handleAction('reject', req._id)} 
                  disabled={loading}
                  className="flex-1 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <X size={16} /> Decline
                </button>
              </div>
              
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <p className="text-sm">No pending requests.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inbox;