import { io } from 'socket.io-client';

export function createSocket(token) {
  return io('http://localhost:3000', {
    auth: { token },
    transports: ['websocket', 'polling'],
  });
}
