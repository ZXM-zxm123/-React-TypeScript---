import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { setupWebSocket } from './websocket';
import { roomManager } from './room';

const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/rooms', (req, res) => {
  const { roomName, userName } = req.body;
  if (!roomName || !userName) {
    res.status(400).json({ error: 'roomName and userName are required' });
    return;
  }
  const room = roomManager.createRoom(roomName, userName, '');
  res.json({ roomId: room.id, room: { id: room.id, name: room.name, ownerId: room.ownerId } });
});

app.get('/api/rooms/:id', (req, res) => {
  const room = roomManager.getRoom(req.params.id);
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  res.json({ room: { id: room.id, name: room.name, ownerId: room.ownerId, userCount: room.users.size } });
});

app.delete('/api/rooms/:id', (req, res) => {
  const room = roomManager.getRoom(req.params.id);
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  res.json({ success: true });
});

const server = createServer(app);

const wss = new WebSocketServer({ server });
setupWebSocket(wss);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready`);
});
