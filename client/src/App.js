import { useEffect, useMemo, useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom';
import axios from 'axios';
import io from 'socket.io-client';
import './App.css';

const API = axios.create({ baseURL: 'http://localhost:3000/api' });

let authState = null;
let setAuthState = null;

API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      authState?.refresh_token
    ) {
      originalRequest._retry = true;
      try {
        const res = await axios.post('http://localhost:3000/api/auth/refresh', {
          refresh_token: authState.refresh_token,
        });

        const newTokens = res.data.data;
        const updatedAuth = {
          ...authState,
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token,
        };

        authState = updatedAuth;
        if (setAuthState) setAuthState(updatedAuth);

        API.defaults.headers.common.Authorization = `Bearer ${newTokens.access_token}`;
        originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`;
        return API(originalRequest);
      } catch (refreshError) {
        authState = null;
        if (setAuthState) setAuthState(null);
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

function Login({ onAuth }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/auth/login', { email, password });
      onAuth(res.data.data);
      navigate('/chat');
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="glass w-full max-w-md p-6">
        <div className="mb-5">
          <div className="text-teal-300 font-bold text-2xl">Chatspace</div>
          <div className="text-slate-300 text-sm">Premium dark theme chat app</div>
        </div>
        <form className="space-y-3" onSubmit={submit}>
          <div>
            <label className="text-slate-300 text-xs uppercase tracking-wide">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full mt-1 p-2 rounded bg-slate-800 border border-slate-700 text-white" placeholder="you@example.com" />
          </div>
          <div>
            <label className="text-slate-300 text-xs uppercase tracking-wide">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full mt-1 p-2 rounded bg-slate-800 border border-slate-700 text-white" placeholder="••••••••" />
          </div>
          {error && <div className="text-rose-300 text-sm">{error}</div>}
          <button className="w-full bg-teal-500 hover:bg-teal-400 transition rounded p-2 font-semibold text-slate-900">Log In</button>
        </form>
        <div className="mt-3 text-center text-slate-300 text-sm">
          Don&apos;t have an account? <button onClick={() => navigate('/register')} className="text-teal-300 underline">Register</button>
        </div>
      </div>
    </div>
  );
}

function Register({ onAuth }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post('/auth/register', { username, email, password });
      onAuth(res.data.data);
      navigate('/chat');
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="glass w-full max-w-md p-6">
        <div className="mb-5">
          <div className="text-teal-300 font-bold text-2xl">Chatspace</div>
          <div className="text-slate-300 text-sm">Create your account</div>
        </div>
        <form className="space-y-3" onSubmit={submit}>
          <div>
            <label className="text-slate-300 text-xs uppercase tracking-wide">Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full mt-1 p-2 rounded bg-slate-800 border border-slate-700 text-white" placeholder="alice" />
          </div>
          <div>
            <label className="text-slate-300 text-xs uppercase tracking-wide">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full mt-1 p-2 rounded bg-slate-800 border border-slate-700 text-white" placeholder="you@example.com" />
          </div>
          <div>
            <label className="text-slate-300 text-xs uppercase tracking-wide">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full mt-1 p-2 rounded bg-slate-800 border border-slate-700 text-white" placeholder="••••••" />
          </div>
          {error && <div className="text-rose-300 text-sm">{error}</div>}
          <button className="w-full bg-teal-500 hover:bg-teal-400 transition rounded p-2 font-semibold text-slate-900">Register</button>
        </form>
        <div className="mt-3 text-center text-slate-300 text-sm">
          Already have an account? <button onClick={() => navigate('/login')} className="text-teal-300 underline">Login</button>
        </div>
      </div>
    </div>
  );
}

function Chat({ auth, onLogout }) {
  const [socket, setSocket] = useState(null);
  const [roomId, setRoomId] = useState(1);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!auth?.access_token) return;
    const s = io('http://localhost:3000', {
      auth: { token: auth.access_token },
      transports: ['websocket', 'polling'],
    });
    s.on('connect', () => setStatus('Connected'));
    s.on('connect_error', (err) => setStatus('Socket error: ' + err.message));
    s.on('new_message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });
    setSocket(s);
    return () => s.disconnect();
  }, [auth?.access_token]);

  const join = () => {
    if (!socket) return;
    socket.emit('join_room', { roomId: Number(roomId) }, (res) => {
      setStatus(res.success ? 'Joined room' : res.error);
    });
  };

  const send = () => {
    if (!socket) return;
    socket.emit('send_message', { roomId: Number(roomId), content: message }, (res) => {
      if (res.success) {
        setMessage('');
      } else {
        setStatus(res.error);
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xl font-bold text-teal-300">Chatspace</div>
            <div className="text-slate-300 text-xs">Welcome, {auth.user.username}</div>
          </div>
          <div className="space-x-2">
            <button onClick={onLogout} className="px-3 py-1 bg-slate-700 rounded">Logout</button>
          </div>
        </div>

        <div className="glass p-4 rounded-lg">
          <div className="flex gap-2 mb-3">
            <input value={roomId} onChange={(e) => setRoomId(e.target.value)} className="bg-slate-900 rounded p-2 flex-1 border border-slate-700" placeholder="Room ID" />
            <button onClick={join} className="bg-teal-500 px-3 rounded hover:bg-teal-400">Join</button>
          </div>
          <div className="text-slate-300 text-xs mb-2">{status}</div>

          <div className="h-72 overflow-y-auto bg-slate-900 p-3 rounded-md border border-slate-700">
            {messages.length === 0 ? <div className="text-slate-400">No messages yet.</div> : messages.map((msg, idx) => (
              <div key={idx} className={`mb-2 p-2 rounded-md ${msg.user?.id === auth.user.id ? 'bg-teal-700/40 ml-auto max-w-[85%]' : 'bg-slate-700/60 max-w-[85%]'}`}>
                <div className="text-xs text-teal-200">{msg.user?.username || 'Unknown'}</div>
                <div>{msg.content}</div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <input value={message} onChange={(e) => setMessage(e.target.value)} className="bg-slate-900 border border-slate-700 rounded p-2 flex-1" placeholder="Type your message..." />
            <button onClick={send} className="bg-teal-500 px-3 rounded hover:bg-teal-400">Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [auth, setAuth] = useState(null);

  // Keep the interceptor state references in sync with React state.
  useEffect(() => {
    authState = auth;
    setAuthState = setAuth;
  }, [auth]);

  useEffect(() => {
    if (auth?.access_token) {
      API.defaults.headers.common.Authorization = `Bearer ${auth.access_token}`;
    } else {
      delete API.defaults.headers.common.Authorization;
    }
  }, [auth]);

  const onAuth = (data) => {
    const payload = {
      user: data.user,
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    };
    API.defaults.headers.common.Authorization = `Bearer ${payload.access_token}`;
    setAuth(payload);
  };

  const onLogout = async () => {
    try {
      await API.post('/auth/logout', null, { headers: { Authorization: `Bearer ${auth.access_token}` } });
    } catch (e) {
      // ignore
    }
    setAuth(null);
  };

  const authRoutes = useMemo(() => (
    <Routes>
      <Route path="/" element={<Navigate to={auth ? '/chat' : '/login'} />} />
      <Route path="/login" element={<Login onAuth={onAuth} />} />
      <Route path="/register" element={<Register onAuth={onAuth} />} />
      <Route path="/chat" element={auth ? <Chat auth={auth} onLogout={onLogout} /> : <Navigate to="/login" />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  ), [auth]);

  return (
    <Router>
      {authRoutes}
    </Router>
  );
}

export default App;
