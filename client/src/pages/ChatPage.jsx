import { useState, useMemo } from 'react';
import RoomSidebar from '../components/RoomSidebar';
import ChatArea from '../components/ChatArea';

function StarField() {
  const stars = useMemo(() => Array.from({ length: 110 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2.2 + 0.3,
    delay: Math.random() * 6,
    duration: Math.random() * 3 + 2.5,
    gold: Math.random() < 0.12,
  })), []);

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      {stars.map(s => (
        <div
          key={s.id}
          style={{
            position: 'absolute',
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            borderRadius: '50%',
            background: s.gold ? '#e8b14f' : '#ffffff',
            animation: `twinkle ${s.duration}s ${s.delay}s infinite ease-in-out`,
          }}
        />
      ))}
    </div>
  );
}

export default function ChatPage() {
  const [selectedRoom, setSelectedRoom] = useState(null);

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: 'radial-gradient(ellipse at 20% 0%, #031428 0%, #020c18 45%, #010810 100%)',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Animated stars */}
      <StarField />

      {/* Gold grid overlay */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(232,177,79,0.022) 1px, transparent 1px),
          linear-gradient(90deg, rgba(232,177,79,0.022) 1px, transparent 1px)
        `,
        backgroundSize: '64px 64px',
      }} />

      {/* Horizontal scan line */}
      <div style={{
        position: 'fixed',
        left: 0, right: 0, height: '1px',
        background: 'linear-gradient(90deg, transparent 0%, rgba(232,177,79,0.14) 30%, rgba(0,200,255,0.08) 70%, transparent 100%)',
        animation: 'scan-line 12s linear infinite',
        zIndex: 1, pointerEvents: 'none',
      }} />

      {/* App content */}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', width: '100%', height: '100vh' }}>
        <RoomSidebar
          selectedRoomId={selectedRoom?.id ?? null}
          onSelectRoom={setSelectedRoom}
        />
        <ChatArea selectedRoom={selectedRoom} />
      </div>
    </div>
  );
}
