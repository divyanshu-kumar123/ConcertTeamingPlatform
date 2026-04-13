import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import api from "../services/api";
import toast from "react-hot-toast";
import Loader from "../components/Loader/Loader";
import Inbox from "../components/Inbox";
import {
  Copy,
  Users,
  AlertCircle,
  Plus,
  Eye,
  EyeOff,
  Search,
  Clock,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const ManageTeam = () => {
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Data States
  const [teamData, setTeamData] = useState(null);
  const [receivedRequests, setReceivedRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]); // <-- Added this
  const [showCode, setShowCode] = useState(false);

  // Live Search States
  const [inviteQuery, setInviteQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const fetchData = async () => {
    try {
      const res = await api.get("/employees/me");
      setTeamData(res.data.team);
      setReceivedRequests(res.data.receivedInvitations || []);
      setSentRequests(res.data.sentInvitations || []); // <-- Populating sent requests
    } catch (error) {
      toast.error("Failed to load team data");
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
      if (inviteQuery.trim().length < 3) {
        setSuggestions([]);
        return;
      }
      setIsSearching(true);
      try {
        const res = await api.get(
          `/employees/search?query=${inviteQuery.trim()}`,
        );
        const filtered = res.data.filter(
          (emp) =>
            emp._id !== user.id &&
            !teamData?.members.some((member) => member._id === emp._id),
        );
        setSuggestions(filtered);
      } catch (error) {
        console.error("Search failed", error);
      } finally {
        setIsSearching(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      fetchSuggestions();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [inviteQuery, teamData, user.id]);

  const handleSelectAndInvite = async (targetSapId) => {
    setInviteQuery("");
    setShowDropdown(false);
    setLoading(true);
    try {
      const res = await api.post("/invitations/send", {
        targetId: targetSapId,
      });
      toast.success(res.data.message);
      fetchData(); // <-- Refresh instantly to show in Sent Requests below
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send invite");
      setLoading(false);
    }
  };

  // --- NEW: Remove Sent Request Logic ---
  const handleRemoveRequest = async (requestId, isRejected = false) => {
    setLoading(true);
    try {
      await api.delete(`/invitations/${requestId}`);
      toast.success(
        isRejected ? "History cleared." : "Invite withdrawn successfully.",
      );
      fetchData();
    } catch (error) {
      toast.error("Failed to remove request.");
      setLoading(false);
    }
  };

  const handleLeaveTeam = async () => {
    // Best Practice: Destructive actions should always require confirmation
    const confirmLeave = window.confirm(
      "Are you sure you want to leave this team? If you are the last member, the team will be deleted.",
    );

    if (!confirmLeave) return;

    setLoading(true);
    try {
      const res = await api.post("/teams/leave");
      toast.success(res.data.message);

      // Redirect to dashboard since they no longer have a team to manage
      navigate("/dashboard");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to leave team");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (teamData?._id) {
      navigator.clipboard.writeText(teamData._id);
      toast.success("Team Code copied to clipboard!");
    }
  };

  const getInitial = (name) => (name ? name.charAt(0).toUpperCase() : "U");

  if (loading && !teamData)
    return (
      <div className="flex justify-center py-20">
        <Loader />
      </div>
    );

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
            {teamData ? (showCode ? teamData._id : "••••••••") : "PENDING"}
          </span>
          <Copy
            size={20}
            className="text-blue-400 group-hover:text-blue-600 transition-colors"
          />
          {showCode ? (
            <Eye
              size={20}
              className="text-blue-400 group-hover:text-blue-600 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setShowCode(false);
              }}
            />
          ) : (
            <EyeOff
              size={20}
              className="text-blue-400 group-hover:text-blue-600 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setShowCode(true);
              }}
            />
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* LEFT COLUMN: Team Members & Invite */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex flex-col">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Users size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">Team Members</h3>
              <p className="text-sm text-gray-500">
                {teamData ? teamData.members.length : 1} member
                {teamData?.members.length !== 1 && "s"}
              </p>
            </div>
          </div>

          {/* Live Search Invite Form */}
          <div className="relative mb-6">
            <div className="flex gap-2 relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Search size={16} />
              </div>
              <input
                type="text"
                placeholder="Search to invite members..."
                value={inviteQuery}
                onChange={(e) => {
                  setInviteQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                className="flex-1 pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>

            {/* Dropdown Suggestions */}
            {showDropdown && inviteQuery.length >= 3 && (
              <div className="absolute z-10 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden max-h-60 overflow-y-auto">
                {isSearching ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    Searching...
                  </div>
                ) : suggestions.length > 0 ? (
                  suggestions.map((emp) => (
                    <div
                      key={emp._id}
                      onMouseDown={() => handleSelectAndInvite(emp.sapId)}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0"
                    >
                      <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-xs">
                        {getInitial(emp.name)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {emp.name}
                        </p>
                        <p className="text-xs text-gray-500">{emp.sapId}</p>
                      </div>
                      <Plus size={16} className="ml-auto text-gray-400" />
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-sm text-gray-500">
                    No employees found.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Members List */}
          <div className="space-y-4">
            {teamData ? (
              teamData.members.map((member) => (
                <div
                  key={member._id}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold shadow-sm">
                      {getInitial(member.name)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {member.name}
                      </p>
                      <p className="text-xs text-gray-500 uppercase">
                        {member.sapId}
                      </p>
                    </div>
                  </div>
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
                  <p className="text-sm font-semibold text-gray-900">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-500 uppercase">
                    {user.sapId}
                  </p>
                </div>
                <span className="ml-auto px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-full">
                  Owner
                </span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: The Inbox Component */}
        <div>
          <Inbox requests={receivedRequests} onRefresh={fetchData} />
        </div>
      </div>

      {/* --- SENT REQUESTS HISTORY SECTION --- */}
      {sentRequests && sentRequests.length > 0 && (
        <div className="mb-8 bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_2px_10px_rgb(0,0,0,0.02)] animate-fade-in-up">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Pending & Past Invites
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sentRequests.map((req) => (
              <div
                key={req._id}
                className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-gray-200"
              >
                <div className="flex items-center gap-3">
                  {req.status === "PENDING" ? (
                    <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 shrink-0">
                      <Clock size={18} />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-500 shrink-0">
                      <XCircle size={18} />
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-bold text-gray-900">
                      {req.receiverId?.name || "Unknown Colleague"}
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      SAP: {req.receiverId?.sapId} •
                      <span
                        className={`ml-1 font-semibold ${req.status === "PENDING" ? "text-amber-600" : "text-red-600"}`}
                      >
                        {req.status}
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    handleRemoveRequest(req._id, req.status === "REJECTED")
                  }
                  className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-red-50 hover:border-red-100 hover:text-red-600 text-gray-600 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shadow-sm"
                >
                  {req.status === "PENDING" ? "Withdraw" : "Clear"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Danger Zone */}
      <div className="bg-red-50/30 border border-red-100 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="text-red-500">
            <AlertCircle size={24} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-gray-900">Team Management</h4>
            <p className="text-sm text-gray-500 mt-0.5">
              Leaving the team will remove you from the team. You need to request again if you want to join the team again
            </p>
          </div>
        </div>
        <button
          onClick={handleLeaveTeam}
          className="px-6 py-2.5 bg-[#E11D48] hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm shadow-red-200 whitespace-nowrap"
        >
          Leave Team
        </button>
      </div>
    </div>
  );
};

export default ManageTeam;
