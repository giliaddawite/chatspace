function userColor(username = '') {
  const palette = [
    '#14b8a6', '#8b5cf6', '#f59e0b', '#3b82f6',
    '#ec4899', '#10b981', '#f97316', '#6366f1',
  ];
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function MessageItem({ message, currentUser }) {
  const isMine  = message.user?.id === currentUser?.id;
  const color   = userColor(message.user?.username ?? '');
  const initials = (message.user?.username ?? '?').charAt(0).toUpperCase();

  return (
    <div style={{
      display: 'flex',
      flexDirection: isMine ? 'row-reverse' : 'row',
      alignItems: 'flex-end',
      gap: '10px',
      marginBottom: '16px',
      animation: 'msg-in 0.22s ease',
    }}>
      {/* Avatar */}
      <div style={{
        width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
        background: `linear-gradient(135deg, ${color}, ${color}99)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Orbitron, sans-serif', fontWeight: '700', fontSize: '13px',
        color: '#020c18',
        border: `1px solid ${color}50`,
        boxShadow: `0 0 14px ${color}45`,
      }}>
        {initials}
      </div>

      {/* Bubble group */}
      <div style={{ maxWidth: '65%' }}>
        {/* Username + timestamp */}
        <div style={{
          display: 'flex',
          flexDirection: isMine ? 'row-reverse' : 'row',
          alignItems: 'baseline',
          gap: '8px',
          marginBottom: '5px',
        }}>
          <span style={{
            color: isMine ? '#e8b14f' : color,
            fontSize: '11px', fontWeight: '700',
            fontFamily: 'Rajdhani, sans-serif',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            textShadow: isMine ? '0 0 10px rgba(232,177,79,0.4)' : `0 0 10px ${color}50`,
          }}>
            {message.user?.username ?? 'Unknown'}
          </span>
          <span style={{
            color: 'rgba(240,244,255,0.18)',
            fontSize: '9.5px', fontFamily: 'Orbitron, sans-serif',
          }}>
            {formatTime(message.created_at)}
          </span>
        </div>

        {/* Message bubble */}
        <div style={{
          padding: '10px 16px',
          background: isMine
            ? 'linear-gradient(135deg, rgba(232,177,79,0.1), rgba(201,147,42,0.05))'
            : `linear-gradient(135deg, ${color}0d, transparent)`,
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: isMine
            ? '1px solid rgba(232,177,79,0.28)'
            : `1px solid ${color}30`,
          borderRadius: isMine ? '12px 2px 12px 12px' : '2px 12px 12px 12px',
          color: '#f0f4ff',
          fontSize: '14px',
          fontFamily: 'Rajdhani, sans-serif',
          fontWeight: '500',
          lineHeight: '1.6',
          wordBreak: 'break-word',
          letterSpacing: '0.02em',
          boxShadow: isMine
            ? '0 2px 20px rgba(232,177,79,0.08)'
            : `0 2px 20px ${color}15`,
        }}>
          {message.content}
        </div>
      </div>
    </div>
  );
}
