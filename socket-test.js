const io = require('socket.io-client');
const axios = require('axios');

const SERVER_URL = 'http://localhost:3000';

async function run() {
  try {
    // Create a user and login via REST API to get token
    const email = `socket-test-${Date.now()}@test.com`;
    const username = `socketuser${Math.floor(Math.random() * 10000)}`;
    const password = 'password123';

    await axios.post(`${SERVER_URL}/api/auth/register`, { email, username, password });
    const loginRes = await axios.post(`${SERVER_URL}/api/auth/login`, { email, password });
    const token = loginRes.data.data.access_token;

    console.log('Logged in; token length', token.length);

    const socket = io(SERVER_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      socket.emit('join_room', { roomId: 1 }, (resp) => {
        console.log('join_room resp:', resp);
        socket.emit('send_message', { roomId: 1, content: 'Hello from test script' }, (msgResp) => {
          console.log('send_message resp:', msgResp);
          socket.disconnect();
          process.exit(0);
        });
      });
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connect error:', err.message);
      process.exit(1);
    });

  } catch (err) {
    console.error('Test script error:', err.response?.data || err.message);
    process.exit(1);
  }
}

run();
