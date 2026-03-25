import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const switchTab = (t) => {
    setTab(t);
    setError('');
    setEmail('');
    setPassword('');
    setUsername('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'login') {
        await login(email, password);
      } else {
        await register(username, email, password);
      }
      navigate('/chat');
    } catch (err) {
      setError(err?.response?.data?.error?.message || (tab === 'login' ? 'Login failed' : 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#131218', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        background: '#191724',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '16px',
        padding: '32px',
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '12px',
            background: '#14b8a6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '700',
            fontSize: '20px',
            color: '#042f2e',
            flexShrink: 0,
          }}>
            C
          </div>
          <div>
            <div style={{ color: '#e8e4f0', fontWeight: '600', fontSize: '16px', lineHeight: 1.2 }}>Chatspace</div>
            <div style={{ color: '#5b5675', fontSize: '12px' }}>Real-time messaging</div>
          </div>
        </div>

        {/* Tab toggle */}
        <div style={{
          display: 'flex',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '10px',
          padding: '4px',
          marginBottom: '24px',
        }}>
          {['login', 'register'].map((t) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: '7px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '14px',
                transition: 'background 0.15s, color 0.15s',
                background: tab === t ? '#14b8a6' : 'transparent',
                color: tab === t ? '#042f2e' : '#5b5675',
              }}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {tab === 'register' && (
            <div>
              <label style={labelStyle}>Username</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="alice"
                required
                style={inputStyle}
              />
            </div>
          )}
          <div>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={{ color: '#dc2626', fontSize: '13px' }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '11px',
              background: loading ? 'rgba(20,184,166,0.5)' : '#14b8a6',
              color: '#042f2e',
              fontWeight: '600',
              fontSize: '15px',
              borderRadius: '12px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '4px',
              transition: 'background 0.15s',
            }}
          >
            {loading ? '…' : tab === 'login' ? 'Log In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  color: '#5b5675',
  fontSize: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '6px',
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '12px',
  color: '#e8e4f0',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
};
