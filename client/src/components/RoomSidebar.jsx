import { useEffect, useState } from 'react';
import { API } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { createSocket } from '../services/socket';

/* Auto room-code from numeric ID */
function roomCode(room) {
  return `CH-${String(room.id).padStart(3, '0')}`;
}

/* ── New-room modal ── */
function NewRoomModal({ onClose, onCreated }) {
  const [name, setName]               = useState('');
  const [description, setDescription] = useState('');
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await API.post('/v1/rooms', { name: name.trim(), description: description.trim() });
      onCreated(res.data.data.room ?? res.data.data);
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Failed to create channel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(2,12,24,0.88)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'linear-gradient(145deg, rgba(8,22,46,0.98), rgba(4,12,26,0.98))',
        border: '1px solid rgba(232,177,79,0.4)',
        borderRadius: '18px',
        padding: '30px',
        width: '370px',
        boxShadow: '0 0 50px rgba(232,177,79,0.14), 0 24px 64px rgba(0,0,0,0.7)',
        animation: 'slide-in 0.2s ease',
      }} onClick={(e) => e.stopPropagation()}>

        {/* Modal header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '22px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #e8b14f, #c9932a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', color: '#020c18', fontWeight: '700',
            boxShadow: '0 0 14px rgba(232,177,79,0.4)',
          }}>+</div>
          <div style={{
            color: '#e8b14f', fontFamily: 'Orbitron, sans-serif',
            fontWeight: '700', fontSize: '12px', letterSpacing: '0.18em',
          }}>
            INITIALIZE NEW CHANNEL
          </div>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Channel Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. study-lounge" autoFocus style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>
              Description&nbsp;<span style={{ color: 'rgba(232,177,79,0.25)' }}>(optional)</span>
            </label>
            <input value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this channel for?" style={inputStyle} />
          </div>

          {error && (
            <div style={{ color: '#f87171', fontSize: '12px', fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.05em' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '11px',
              background: 'rgba(240,244,255,0.04)',
              border: '1px solid rgba(240,244,255,0.1)',
              borderRadius: '10px', color: 'rgba(240,244,255,0.35)',
              fontSize: '12px', fontWeight: '700', cursor: 'pointer',
              letterSpacing: '0.1em', textTransform: 'uppercase',
              transition: 'all 0.15s',
            }}>CANCEL</button>
            <button type="submit" disabled={loading || !name.trim()} style={{
              flex: 1, padding: '11px',
              background: loading || !name.trim()
                ? 'rgba(232,177,79,0.12)'
                : 'linear-gradient(135deg, #e8b14f, #c9932a)',
              border: '1px solid rgba(232,177,79,0.4)',
              borderRadius: '10px',
              color: loading || !name.trim() ? 'rgba(232,177,79,0.35)' : '#020c18',
              fontWeight: '700', fontSize: '12px',
              cursor: loading || !name.trim() ? 'not-allowed' : 'pointer',
              letterSpacing: '0.1em', textTransform: 'uppercase',
              boxShadow: name.trim() ? '0 0 18px rgba(232,177,79,0.35)' : 'none',
              transition: 'all 0.15s',
            }}>
              {loading ? 'CREATING…' : 'CREATE'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Sidebar ── */
export default function RoomSidebar({ selectedRoomId, onSelectRoom }) {
  const { user, auth, logout } = useAuth();
  const [rooms, setRooms]           = useState([]);
  const [search, setSearch]         = useState('');
  const [showNewRoom, setShowNewRoom] = useState(false);

  useEffect(() => {
    API.get('/v1/rooms')
      .then((res) => setRooms(res.data.data.rooms ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!auth?.access_token) return;
    const socket = createSocket(auth.access_token);
    socket.on('room_created', (data) => {
      setRooms((prev) => {
        if (prev.some((r) => r.id === data.room.id)) return prev;
        return [data.room, ...prev];
      });
    });
    return () => { socket.disconnect(); };
  }, [auth?.access_token]);

  const filtered = rooms.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  const userInitials = user?.username ? user.username.slice(0, 2).toUpperCase() : 'HU';

  const handleCreated = (room) => {
    setRooms((prev) => [room, ...prev]);
    setShowNewRoom(false);
    onSelectRoom(room);
  };

  return (
    <>
      <div style={{
        width: '272px', minWidth: '272px', height: '100vh',
        background: 'rgba(4, 12, 26, 0.94)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRight: '1px solid rgba(232,177,79,0.14)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '6px 0 40px rgba(0,0,0,0.55)',
      }}>

        {/* ── Howard header ── */}
        <div style={{
          padding: '26px 16px 20px',
          borderBottom: '1px solid rgba(232,177,79,0.1)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          background: 'linear-gradient(180deg, rgba(232,177,79,0.07) 0%, transparent 100%)',
        }}>
          {/* University name */}
          <div style={{
            fontFamily: 'Orbitron, sans-serif', fontWeight: '900',
            fontSize: '12.5px', letterSpacing: '0.22em',
            color: '#e8b14f', textAlign: 'center',
            textShadow: '0 0 22px rgba(232,177,79,0.65)',
            lineHeight: 1.3,
          }}>
            HOWARD UNIVERSITY
          </div>
          <div style={{
            fontFamily: 'Rajdhani, sans-serif', fontWeight: '500',
            fontSize: '9.5px', letterSpacing: '0.32em',
            color: 'rgba(232,177,79,0.42)', marginTop: '4px',
          }}>
            THE MECCA · CHATSPACE
          </div>

          {/* Stats row */}
          <div style={{
            display: 'flex', gap: '20px', marginTop: '16px',
            padding: '8px 20px',
            background: 'rgba(232,177,79,0.04)',
            border: '1px solid rgba(232,177,79,0.1)',
            borderRadius: '20px',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                color: '#00c8ff', fontFamily: 'Orbitron, sans-serif',
                fontSize: '15px', fontWeight: '700',
                textShadow: '0 0 10px rgba(0,200,255,0.5)',
              }}>
                {rooms.length}
              </div>
              <div style={{
                color: 'rgba(240,244,255,0.28)', fontSize: '8.5px',
                letterSpacing: '0.14em', textTransform: 'uppercase',
                fontFamily: 'Rajdhani, sans-serif',
              }}>
                Channels
              </div>
            </div>
            <div style={{ width: '1px', background: 'rgba(232,177,79,0.12)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{
                color: '#4ade80', fontFamily: 'Orbitron, sans-serif',
                fontSize: '13px', fontWeight: '700',
                textShadow: '0 0 10px rgba(74,222,128,0.5)',
              }}>
                LIVE
              </div>
              <div style={{
                color: 'rgba(240,244,255,0.28)', fontSize: '8.5px',
                letterSpacing: '0.14em', textTransform: 'uppercase',
                fontFamily: 'Rajdhani, sans-serif',
              }}>
                Status
              </div>
            </div>
          </div>
        </div>

        {/* ── Search ── */}
        <div style={{ padding: '12px 12px 6px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'rgba(232,177,79,0.04)',
            border: '1px solid rgba(232,177,79,0.14)',
            borderRadius: '10px',
            padding: '8px 12px',
          }}>
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none">
              <circle cx="9" cy="9" r="6" stroke="rgba(232,177,79,0.4)" strokeWidth="2" />
              <path d="M14 14 L18 18" stroke="rgba(232,177,79,0.4)" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search channels…"
              style={{
                flex: 1, background: 'transparent', border: 'none',
                color: '#f0f4ff', fontSize: '13px',
                fontFamily: 'Rajdhani, sans-serif', fontWeight: '500',
              }}
            />
          </div>
        </div>

        {/* ── New channel button ── */}
        <div style={{ padding: '4px 12px 6px' }}>
          <button
            onClick={() => setShowNewRoom(true)}
            style={{
              width: '100%', padding: '10px 12px',
              background: 'linear-gradient(135deg, rgba(232,177,79,0.1), rgba(201,147,42,0.06))',
              border: '1px solid rgba(232,177,79,0.28)',
              borderRadius: '10px',
              color: '#e8b14f',
              fontSize: '11.5px', fontWeight: '700',
              fontFamily: 'Rajdhani, sans-serif',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              letterSpacing: '0.13em', textTransform: 'uppercase',
              boxShadow: '0 0 14px rgba(232,177,79,0.07)',
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: '17px', fontWeight: '300', lineHeight: 1 }}>+</span>
            Create Channel
          </button>
        </div>

        {/* ── Section label ── */}
        <div style={{
          padding: '8px 16px 4px',
          color: 'rgba(232,177,79,0.3)',
          fontSize: '8.5px', fontFamily: 'Orbitron, sans-serif',
          letterSpacing: '0.22em', textTransform: 'uppercase',
        }}>
          Active Channels
        </div>

        {/* ── Room list ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
          {filtered.map((room, idx) => {
            const active = room.id === selectedRoomId;
            return (
              <button
                key={room.id}
                onClick={() => onSelectRoom(room)}
                style={{
                  width: '100%', display: 'block',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: active
                    ? '1px solid rgba(232,177,79,0.38)'
                    : '1px solid transparent',
                  background: active
                    ? 'linear-gradient(135deg, rgba(232,177,79,0.09), rgba(232,177,79,0.03))'
                    : 'transparent',
                  cursor: 'pointer', textAlign: 'left',
                  marginBottom: '3px',
                  transition: 'all 0.15s',
                  boxShadow: active ? '0 0 18px rgba(232,177,79,0.1), inset 0 0 20px rgba(232,177,79,0.03)' : 'none',
                  animation: `slide-in 0.2s ease ${idx * 0.035}s both`,
                }}
              >
                {/* Top row: code + status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                  <span style={{
                    color: active ? '#e8b14f' : 'rgba(232,177,79,0.3)',
                    fontFamily: 'Orbitron, sans-serif',
                    fontSize: '8.5px', fontWeight: '600', letterSpacing: '0.1em',
                  }}>
                    {roomCode(room)}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{
                      width: '5px', height: '5px', borderRadius: '50%',
                      background: active ? '#4ade80' : 'rgba(74,222,128,0.3)',
                      boxShadow: active ? '0 0 7px #4ade80' : 'none',
                    }} />
                    <span style={{
                      color: active ? '#4ade80' : 'rgba(74,222,128,0.4)',
                      fontSize: '8.5px', fontFamily: 'Rajdhani, sans-serif',
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                    }}>
                      {active ? 'ACTIVE' : 'OPEN'}
                    </span>
                  </div>
                </div>

                {/* Room name */}
                <div style={{
                  color: active ? '#f0f4ff' : 'rgba(240,244,255,0.5)',
                  fontSize: '14px', fontWeight: '600',
                  fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.04em',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {room.name}
                </div>

                {/* Description */}
                {room.description && (
                  <div style={{
                    color: active ? 'rgba(232,177,79,0.45)' : 'rgba(240,244,255,0.18)',
                    fontSize: '11px', marginTop: '2px',
                    fontFamily: 'Rajdhani, sans-serif',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {room.description}
                  </div>
                )}
              </button>
            );
          })}

          {filtered.length === 0 && (
            <div style={{
              color: 'rgba(232,177,79,0.22)', fontSize: '11px',
              textAlign: 'center', marginTop: '30px',
              fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.14em',
            }}>
              NO CHANNELS FOUND
            </div>
          )}
        </div>

        {/* ── User strip ── */}
        <div style={{
          padding: '12px 14px',
          borderTop: '1px solid rgba(232,177,79,0.1)',
          display: 'flex', alignItems: 'center', gap: '10px',
          background: 'rgba(232,177,79,0.025)',
        }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
            background: 'linear-gradient(135deg, #e8b14f, #c9932a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Orbitron, sans-serif', fontWeight: '700', fontSize: '12px',
            color: '#020c18',
            boxShadow: '0 0 14px rgba(232,177,79,0.38)',
          }}>
            {userInitials}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{
              color: '#f0f4ff', fontSize: '13px', fontWeight: '600',
              fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.04em',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {user?.username}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 7px #4ade80' }} />
              <span style={{ color: '#4ade80', fontSize: '9.5px', fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.12em' }}>
                ONLINE
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ color: 'rgba(232,177,79,0.28)', fontSize: '18px', cursor: 'pointer' }}>⚙</div>
            <button
              onClick={logout}
              title="Logout"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(232,177,79,0.28)', fontSize: '16px', padding: '2px',
                display: 'flex', alignItems: 'center',
                transition: 'color 0.15s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#f87171'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(232,177,79,0.28)'}
            >
              ⏻
            </button>
          </div>
        </div>
      </div>

      {showNewRoom && (
        <NewRoomModal onClose={() => setShowNewRoom(false)} onCreated={handleCreated} />
      )}
    </>
  );
}

/* ── Shared modal styles ── */
const labelStyle = {
  display: 'block',
  color: 'rgba(232,177,79,0.5)',
  fontSize: '9.5px',
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  marginBottom: '7px',
  fontFamily: 'Rajdhani, sans-serif',
  fontWeight: '600',
};

const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  background: 'rgba(232,177,79,0.04)',
  border: '1px solid rgba(232,177,79,0.2)',
  borderRadius: '10px',
  color: '#f0f4ff',
  fontSize: '14px',
  fontFamily: 'Rajdhani, sans-serif',
  fontWeight: '500',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
};
