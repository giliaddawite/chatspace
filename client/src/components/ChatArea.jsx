import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API } from '../services/api';
import { createSocket } from '../services/socket';
import MessageItem from './MessageItem';

function userColor(username = '') {
  const palette = [
    '#14b8a6', '#8b5cf6', '#f59e0b', '#3b82f6',
    '#ec4899', '#10b981', '#f97316', '#6366f1',
  ];
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

/* Empty-state bison placeholder */
function EmptyState() {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '18px',
    }}>
      {/* Glowing bison icon */}
      <div style={{
        width: '88px', height: '88px', borderRadius: '22px',
        border: '1px solid rgba(232,177,79,0.28)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(232,177,79,0.04)',
        animation: 'gold-pulse 3.5s ease-in-out infinite',
        fontSize: '42px',
      }}>🦬</div>

      <div style={{ textAlign: 'center', lineHeight: '1.7' }}>
        <div style={{
          fontFamily: 'Orbitron, sans-serif', fontSize: '12px',
          color: 'rgba(232,177,79,0.55)', letterSpacing: '0.2em',
          textTransform: 'uppercase', marginBottom: '6px',
        }}>
          Select a Channel
        </div>
        <div style={{
          color: 'rgba(240,244,255,0.18)', fontSize: '11px',
          fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          Howard University · The Mecca
        </div>
      </div>

      {/* Decorative line */}
      <div style={{
        width: '120px', height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(232,177,79,0.3), transparent)',
      }} />
    </div>
  );
}

export default function ChatArea({ selectedRoom }) {
  const { user, auth } = useAuth();

  const socketRef        = useRef(null);
  const prevRoomIdRef    = useRef(null);
  const selectedRoomRef  = useRef(selectedRoom);
  const bottomRef        = useRef(null);

  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [sending, setSending]   = useState(false);

  useEffect(() => { selectedRoomRef.current = selectedRoom; }, [selectedRoom]);

  useEffect(() => {
    if (!auth?.access_token) return;
    const s = createSocket(auth.access_token);
    socketRef.current = s;
    s.on('connect', () => {
      const room = selectedRoomRef.current;
      if (room) s.emit('join_room', { roomId: room.id }, () => {});
    });
    s.on('new_message', (msg) => {
      setMessages((prev) => {
        const updated = [...prev, msg];
        return updated.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      });
    });
    return () => { s.disconnect(); socketRef.current = null; };
  }, [auth?.access_token]);

  useEffect(() => {
    const socket = socketRef.current;
    if (prevRoomIdRef.current && socket) {
      socket.emit('leave_room', { roomId: prevRoomIdRef.current }, () => {});
    }
    setMessages([]);
    setInput('');
    if (!selectedRoom) { prevRoomIdRef.current = null; return; }
    prevRoomIdRef.current = selectedRoom.id;
    if (socket?.connected) socket.emit('join_room', { roomId: selectedRoom.id }, () => {});
    API.get(`/v1/rooms/${selectedRoom.id}/messages`)
      .then((res) => {
        const msgs = res.data.data.messages ?? [];
        setMessages(msgs.slice().reverse());
      })
      .catch(() => {});
  }, [selectedRoom?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = () => {
    const content = input.trim();
    if (!content || !socketRef.current || !selectedRoom) return;
    setSending(true);
    socketRef.current.emit('send_message', { roomId: selectedRoom.id, content }, (res) => {
      setSending(false);
      if (res.success) setInput('');
    });
  };

  if (!selectedRoom) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <EmptyState />
      </div>
    );
  }

  const members = selectedRoom.members ?? [];
  const canSend = !sending && !!input.trim();

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div style={{
        padding: '14px 26px',
        borderBottom: '1px solid rgba(232,177,79,0.12)',
        background: 'rgba(4,12,26,0.72)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0,
        boxShadow: '0 2px 24px rgba(0,0,0,0.35)',
      }}>
        {/* Room icon */}
        <div style={{
          width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
          background: 'linear-gradient(135deg, #e8b14f, #c9932a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Orbitron, sans-serif', fontWeight: '900', fontSize: '16px',
          color: '#020c18',
          boxShadow: '0 0 18px rgba(232,177,79,0.4)',
        }}>
          {selectedRoom.name.charAt(0).toUpperCase()}
        </div>

        {/* Room info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            color: '#f0f4ff', fontFamily: 'Rajdhani, sans-serif',
            fontWeight: '700', fontSize: '16px', letterSpacing: '0.06em',
            lineHeight: 1.2,
          }}>
            {selectedRoom.name}
          </div>
          {selectedRoom.description && (
            <div style={{
              color: 'rgba(232,177,79,0.4)', fontSize: '11px',
              fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.06em',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              marginTop: '2px',
            }}>
              {selectedRoom.description}
            </div>
          )}
        </div>

        {/* Live badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '4px 11px',
          background: 'rgba(74,222,128,0.07)',
          border: '1px solid rgba(74,222,128,0.2)',
          borderRadius: '20px', flexShrink: 0,
        }}>
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: '#4ade80', boxShadow: '0 0 8px #4ade80',
          }} />
          <span style={{
            color: '#4ade80', fontSize: '9.5px',
            fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.12em',
          }}>LIVE</span>
        </div>

        {/* Stacked member avatars */}
        {members.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            {members.slice(0, 5).map((m, i) => (
              <div key={m.id ?? i} style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: userColor(m.username ?? ''),
                border: '2px solid rgba(4,12,26,0.95)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '10px', fontWeight: '700', color: '#020c18',
                fontFamily: 'Orbitron, sans-serif',
                marginLeft: i === 0 ? 0 : '-8px',
                zIndex: 10 - i, position: 'relative',
                boxShadow: `0 0 8px ${userColor(m.username ?? '')}55`,
              }}>
                {(m.username ?? '?').charAt(0).toUpperCase()}
              </div>
            ))}
            {members.length > 5 && (
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: 'rgba(232,177,79,0.1)',
                border: '2px solid rgba(4,12,26,0.95)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '9px', color: 'rgba(232,177,79,0.55)',
                fontFamily: 'Orbitron, sans-serif',
                marginLeft: '-8px', position: 'relative', zIndex: 4,
              }}>
                +{members.length - 5}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Message list ── */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '22px 28px',
        display: 'flex', flexDirection: 'column',
      }}>
        {messages.length === 0 ? (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '12px',
          }}>
            <div style={{ fontSize: '30px', opacity: 0.25 }}>📡</div>
            <div style={{
              color: 'rgba(232,177,79,0.22)', fontSize: '11px',
              fontFamily: 'Orbitron, sans-serif', letterSpacing: '0.16em',
              textAlign: 'center',
            }}>
              CHANNEL INITIALIZED — TRANSMIT FIRST MESSAGE
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageItem key={msg.id} message={msg} currentUser={user} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ── */}
      <div style={{
        padding: '14px 26px',
        borderTop: '1px solid rgba(232,177,79,0.1)',
        background: 'rgba(4,12,26,0.82)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex', gap: '10px', alignItems: 'center',
          background: 'rgba(232,177,79,0.04)',
          border: `1px solid ${canSend ? 'rgba(232,177,79,0.32)' : 'rgba(232,177,79,0.12)'}`,
          borderRadius: '14px',
          padding: '6px 6px 6px 18px',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          boxShadow: canSend ? '0 0 18px rgba(232,177,79,0.07)' : 'none',
        }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={`Transmit to #${selectedRoom.name}…`}
            style={{
              flex: 1, background: 'transparent', border: 'none',
              color: '#f0f4ff', fontSize: '14px',
              fontFamily: 'Rajdhani, sans-serif', fontWeight: '500',
              padding: '7px 0', letterSpacing: '0.03em',
            }}
          />
          <button
            onClick={send}
            disabled={!canSend}
            style={{
              padding: '9px 22px',
              background: canSend
                ? 'linear-gradient(135deg, #e8b14f, #c9932a)'
                : 'rgba(232,177,79,0.09)',
              color: canSend ? '#020c18' : 'rgba(232,177,79,0.28)',
              fontWeight: '700', fontSize: '11.5px',
              fontFamily: 'Orbitron, sans-serif',
              letterSpacing: '0.12em',
              borderRadius: '10px', border: 'none',
              cursor: canSend ? 'pointer' : 'not-allowed',
              transition: 'all 0.15s',
              flexShrink: 0,
              boxShadow: canSend ? '0 0 18px rgba(232,177,79,0.4)' : 'none',
              textTransform: 'uppercase',
            }}
          >
            SEND
          </button>
        </div>

        {/* Footer brand line */}
        <div style={{
          textAlign: 'center', marginTop: '8px',
          color: 'rgba(232,177,79,0.16)',
          fontSize: '8.5px', fontFamily: 'Orbitron, sans-serif',
          letterSpacing: '0.2em',
        }}>
          HOWARD UNIVERSITY · THE MECCA
        </div>
      </div>
    </div>
  );
}
