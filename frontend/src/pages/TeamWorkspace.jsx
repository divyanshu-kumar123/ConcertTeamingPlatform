import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import Loader from '../components/Loader/Loader';

const TeamWorkspace = () => {
  const { user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [teamData, setTeamData] = useState(null);
  const [requests, setRequests] = useState([]); // This will hold invites/join requests
  
  // Form state for sending an invite/request
  const [inviteInput, setInviteInput] = useState('');

  // Fetch Dashboard Data (Team & Invites) on load
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get('/employees/me');
        setTeamData(res.data.team);
        // For now, we populate requests with received invitations from backend
        setRequests(res.data.receivedInvitations); 
      } catch (error) {
        toast.error('Failed to load workspace data' , error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const handleSendRequest = async (e) => {
    e.preventDefault();
    if (!inviteInput.trim()) return toast.error('Please enter an ID');
    
    setLoading(true);
    try {
      // We send 'targetId' which perfectly matches our new smart backend!
      const res = await api.post('/invitations/send', { targetId: inviteInput.trim() });
      toast.success(res.data.message);
      setInviteInput(''); // clear the input box
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div>
      <nav>
        <button onClick={() => navigate('/')}>Back to Home</button>
        <span>Team Workspace</span>
      </nav>

      {/* Top Banner: Team ID */}
      <header>
        <h2>Your Team ID: {teamData ? teamData._id : 'You are not in a team yet'}</h2>
      </header>

      {/* Split View Layout */}
      <main style={{ display: 'flex', gap: '2rem' }}>
        
        {/* LEFT PART: Team Members */}
        <section style={{ flex: 1 }}>
          <h3>Team Members {teamData ? `(${teamData.members.length}/10)` : '(0/10)'}</h3>
          
          {teamData ? (
            <ul>
              {teamData.members.map((member) => (
                <li key={member._id}>
                  {member.name} - {member.sapId} 
                  {member._id === user.id ? ' (You)' : ''}
                </li>
              ))}
            </ul>
          ) : (
            <p>You are currently solo. Send a request to form a team!</p>
          )}
        </section>

        {/* RIGHT PART: Requests & Invites */}
        <section style={{ flex: 1 }}>
          <h3>Join Requests & Invitations</h3>
          
          {/* Send Request Form */}
          <form onSubmit={handleSendRequest}>
            <label>Invite Colleague or Join Team:</label>
            <input 
              type="text" 
              placeholder="Enter SAP ID or Team ID" 
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
            />
            <button type="submit">Send Request</button>
          </form>

          {/* List of Pending Requests */}
          <hr />
          <h4>Pending Received Requests</h4>
          {requests.length > 0 ? (
            <ul>
              {requests.map((req) => (
                <li key={req._id}>
                  Request from: {req.senderId.name} ({req.senderId.sapId})
                  {/* We will wire up Accept/Reject logic later */}
                  <button>Accept</button>
                  <button>Reject</button>
                </li>
              ))}
            </ul>
          ) : (
            <p>No pending requests.</p>
          )}
        </section>

      </main>
    </div>
  );
};

export default TeamWorkspace;