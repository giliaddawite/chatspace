import { io } from 'socket.io-client';

export function createSocket(token) {
  return io(process.env.REACT_APP_API_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });
}
