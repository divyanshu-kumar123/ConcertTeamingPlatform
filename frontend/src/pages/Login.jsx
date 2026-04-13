import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, Lock, User, KeyRound, ArrowRight, ShieldCheck } from 'lucide-react';
import api from '../services/api';
import { setCredentials } from '../features/auth/authSlice';
import Loader from '../components/Loader/Loader';

// FIX: Moved InputField OUTSIDE the main component so it doesn't remount and lose focus!
const InputField = ({ icon: Icon, label, type, name, placeholder, value, onChange }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
        <Icon size={18} />
      </div>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required
        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:bg-white focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none transition-all duration-200"
      />
    </div>
  </div>
);

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('REGISTER_STEP_1'); 
  
  const [formData, setFormData] = useState({
    sapId: '',
    email: '',
    password: '',
    otp: ''
  });

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/request-otp', {
        sapId: formData.sapId,
        email: formData.email,
        password: formData.password
      });
      toast.success('OTP Sent! Please check your email.');
      setMode('REGISTER_STEP_2');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/verify-otp', { sapId: formData.sapId, otp: formData.otp });
      const loginRes = await api.post('/auth/login', { sapId: formData.sapId, password: formData.password });
      dispatch(setCredentials({ user: loginRes.data.user, token: loginRes.data.token }));
      toast.success('Registration Successful!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDirectLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { sapId: formData.sapId, password: formData.password });
      dispatch(setCredentials({ user: res.data.user, token: res.data.token }));
      toast.success('Welcome back!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center md:items-start justify-center bg-[url('/Pritam1.jpeg')] bg-cover bg-center bg-no-repeat p-4 md:pl-32 md:pr-4 font-sans">
      
      {mode !== 'LOGIN' && (
        <div className="flex items-center justify-center mb-8 w-full max-w-xs md:ml-15">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${mode === 'REGISTER_STEP_1' ? 'bg-violet-600 text-white' : 'bg-green-500 text-white'}`}>1</div>
            <span className="text-xs text-gray-500 mt-2 font-medium">Register</span>
          </div>
          <div className={`flex-1 h-0.5 mx-2 ${mode === 'REGISTER_STEP_2' ? 'bg-green-500' : 'bg-gray-200'}`}></div>
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${mode === 'REGISTER_STEP_2' ? 'bg-violet-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
            <span className="text-xs text-gray-500 mt-2 font-medium">Verify</span>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 w-full max-w-md p-8 relative overflow-hidden">
        
        {loading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
            <Loader />
          </div>
        )}

        <div className="w-14 h-14 bg-violet-50 rounded-full flex items-center justify-center mx-auto mb-6 text-violet-600">
          {mode === 'LOGIN' ? <User size={28} /> : mode === 'REGISTER_STEP_2' ? <ShieldCheck size={28} /> : <Mail size={28} />}
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {mode === 'LOGIN' ? 'Welcome Back' : mode === 'REGISTER_STEP_2' ? 'Verify Your Email' : 'Welcome to Concert Portal'}
          </h1>
          <p className="text-sm text-gray-500 mt-2">
            {mode === 'LOGIN' ? 'Enter your credentials to access your dashboard' : mode === 'REGISTER_STEP_2' ? `We sent a code to ${formData.email || 'your email'}` : 'Enter your details to get started'}
          </p>
        </div>

        {/* Note the added 'value' and 'onChange' props passed to InputField */}
        {mode === 'REGISTER_STEP_1' && (
          <form onSubmit={handleRequestOtp} className="space-y-2">
            <InputField icon={User} label="SAP ID" type="text" name="sapId" placeholder="e.g. 52111453" value={formData.sapId} onChange={handleInputChange} />
            <InputField icon={Mail} label="Corporate Email" type="email" name="email" placeholder="your.email@hcltech.com" value={formData.email} onChange={handleInputChange} />
            <InputField icon={Lock} label="Create Password" type="password" name="password" placeholder="••••••••" value={formData.password} onChange={handleInputChange} />
            <button type="submit" className="w-full mt-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm shadow-violet-200">
              Send OTP <ArrowRight size={18} />
            </button>
          </form>
        )}

        {mode === 'REGISTER_STEP_2' && (
          <form onSubmit={handleVerifyAndLogin} className="space-y-2">
            <InputField icon={KeyRound} label="6-Digit OTP" type="text" name="otp" placeholder="123456" value={formData.otp} onChange={handleInputChange} />
            <button type="submit" className="w-full mt-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm shadow-violet-200">
              Verify & Login
            </button>
            <button type="button" onClick={() => setMode('REGISTER_STEP_1')} className="w-full mt-4 py-3 bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl font-medium transition-colors">
              Back to Registration
            </button>
          </form>
        )}

        {mode === 'LOGIN' && (
          <form onSubmit={handleDirectLogin} className="space-y-2">
            <InputField icon={User} label="SAP ID" type="text" name="sapId" placeholder="e.g. 52111453" value={formData.sapId} onChange={handleInputChange} />
            <InputField icon={Lock} label="Password" type="password" name="password" placeholder="••••••••" value={formData.password} onChange={handleInputChange} />
            <button type="submit" className="w-full mt-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm shadow-violet-200">
              Login to Portal <ArrowRight size={18} />
            </button>
          </form>
        )}

        {mode !== 'REGISTER_STEP_2' && (
          <div className="mt-8 text-center border-t border-gray-100 pt-6">
            <p className="text-sm text-gray-500">
              {mode === 'LOGIN' ? "Don't have an account?" : "Already registered?"}{' '}
              <button 
                onClick={() => setMode(mode === 'LOGIN' ? 'REGISTER_STEP_1' : 'LOGIN')}
                className="text-violet-600 font-semibold hover:text-violet-800 transition-colors"
              >
                {mode === 'LOGIN' ? 'Create one now' : 'Log in here'}
              </button>
            </p>
          </div>
        )}

      </div>
      
      <p className="text-xs text-gray-400 mt-8 font-medium">Private Employee Concert - Team Formation Portal</p>
    </div>
  );
};

export default Login;