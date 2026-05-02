import WebSocket, { WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { roomManager, Room, User, PendingEdit } from './room';
import axios from 'axios';

const JAVA_SERVICE_URL = process.env.JAVA_SERVICE_URL || 'http://localhost:8080';

interface WSMessage {
  type: string;
  roomId?: string;
  userId?: string;
  payload: any;
}

interface ClientInfo {
  ws: WebSocket;
  userId?: string;
  roomId?: string;
}

const clients: Map<WebSocket, ClientInfo> = new Map();

export function setupWebSocket(wss: WebSocketServer): void {
  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    const clientInfo: ClientInfo = { ws };
    clients.set(ws, clientInfo);

    ws.on('message', async (data: Buffer) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());
        await handleMessage(ws, message, clientInfo);
      } catch (error) {
        sendError(ws, 'Invalid message format');
      }
    });

    ws.on('close', () => {
      handleDisconnect(clientInfo);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
}

async function handleMessage(ws: WebSocket, message: WSMessage, clientInfo: ClientInfo): Promise<void> {
  switch (message.type) {
    case 'create-room':
      handleCreateRoom(ws, message, clientInfo);
      break;
    case 'join-room':
      handleJoinRoom(ws, message, clientInfo);
      break;
    case 'leave-room':
      handleLeaveRoom(clientInfo);
      break;
    case 'cursor-move':
      handleCursorMove(message, clientInfo);
      break;
    case 'cell-update':
      await handleCellUpdate(ws, message, clientInfo);
      break;
    case 'kick-user':
      handleKickUser(message, clientInfo);
      break;
    case 'resolve-conflict':
      await handleResolveConflict(ws, message, clientInfo);
      break;
  }
}

function handleCreateRoom(ws: WebSocket, message: WSMessage, clientInfo: ClientInfo): void {
  const { roomName, userName } = message.payload;
  const room = roomManager.createRoom(roomName, userName, getSocketId(ws));

  const user = room.users.values().next().value;
  clientInfo.userId = user.id;
  clientInfo.roomId = room.id;

  send(ws, {
    type: 'room-created',
    payload: {
      room: serializeRoom(room),
      userId: user.id
    }
  });

  broadcastToRoom(room.id, {
    type: 'user-joined',
    payload: {
      user: serializeUser(user)
    }
  }, ws);
}

function handleJoinRoom(ws: WebSocket, message: WSMessage, clientInfo: ClientInfo): void {
  const { roomId, userName } = message.payload;
  const result = roomManager.joinRoom(roomId, userName, getSocketId(ws));

  if (!result) {
    sendError(ws, 'Room not found');
    return;
  }

  const { room, user } = result;
  clientInfo.userId = user.id;
  clientInfo.roomId = room.id;

  send(ws, {
    type: 'room-joined',
    payload: {
      room: serializeRoom(room),
      userId: user.id
    }
  });

  broadcastToRoom(room.id, {
    type: 'user-joined',
    payload: {
      user: serializeUser(user)
    }
  }, ws);
}

function handleLeaveRoom(clientInfo: ClientInfo): void {
  if (!clientInfo.userId || !clientInfo.roomId) return;

  const { room, isOwner } = roomManager.leaveRoom(clientInfo.roomId, clientInfo.userId);

  broadcastToRoom(clientInfo.roomId, {
    type: 'user-left',
    payload: {
      userId: clientInfo.userId,
      isOwner
    }
  });

  clientInfo.userId = undefined;
  clientInfo.roomId = undefined;
}

function handleCursorMove(message: WSMessage, clientInfo: ClientInfo): void {
  if (!clientInfo.userId || !clientInfo.roomId) return;

  const { row, col } = message.payload;
  const position = row !== null && col !== null ? { row, col } : null;

  roomManager.updateCursor(clientInfo.roomId, clientInfo.userId, position);

  broadcastToRoom(clientInfo.roomId, {
    type: 'cursor-update',
    payload: {
      userId: clientInfo.userId,
      position
    }
  }, clientInfo.ws);
}

async function handleCellUpdate(ws: WebSocket, message: WSMessage, clientInfo: ClientInfo): Promise<void> {
  if (!clientInfo.userId || !clientInfo.roomId) {
    sendError(ws, 'Not in a room');
    return;
  }

  const { row, col, value, expectVersion, timestamp } = message.payload;
  const formula = typeof value === 'string' && value.startsWith('=') ? value : undefined;
  const room = roomManager.getRoom(clientInfo.roomId);
  const user = room?.users.get(clientInfo.userId);

  if (!room || !user) {
    sendError(ws, 'Room or user not found');
    return;
  }

  // 检测冲突
  const conflictCheck = roomManager.checkAndDetectConflict(
    clientInfo.roomId,
    row,
    col,
    clientInfo.userId,
    timestamp || Date.now(),
    expectVersion
  );

  if (conflictCheck.hasConflict) {
    // 发现冲突，存储待处理编辑并发送冲突提示
    const pendingEdit = roomManager.storePendingEdit(
      clientInfo.roomId,
      row,
      col,
      value,
      formula,
      clientInfo.userId,
      user.name
    );

    send(ws, {
      type: 'cell-conflict',
      payload: {
        row,
        col,
        pendingEdit,
        currentValue: conflictCheck.currentCell,
        existingPendingEdit: conflictCheck.pendingEdit
      }
    });

    return;
  }

  // 没有冲突，正常更新
  let calculatedValue: string | number | undefined;
  if (formula) {
    try {
      const cellValues = roomManager.getCellValues(clientInfo.roomId);
      const response = await axios.post(`${JAVA_SERVICE_URL}/api/evaluate`, {
        expression: formula,
        cells: cellValues
      });
      calculatedValue = response.data.result;
      roomManager.setCellCalculatedValue(clientInfo.roomId, row, col, calculatedValue);
    } catch (error) {
      console.error('Failed to evaluate formula:', error);
      calculatedValue = 0;
    }
  }

  const cellData = roomManager.updateCell(clientInfo.roomId, row, col, value, formula, clientInfo.userId);

  broadcastToRoom(clientInfo.roomId, {
    type: 'cell-change',
    payload: {
      row,
      col,
      value,
      formula,
      calculatedValue,
      userId: clientInfo.userId,
      version: cellData?.version
    }
  }, ws);
}

async function handleResolveConflict(ws: WebSocket, message: WSMessage, clientInfo: ClientInfo): Promise<void> {
  if (!clientInfo.userId || !clientInfo.roomId) {
    sendError(ws, 'Not in a room');
    return;
  }

  const { row, col, keepLocal, mergeValue } = message.payload;
  
  const resolvedCell = roomManager.resolveConflict(
    clientInfo.roomId,
    row,
    col,
    keepLocal,
    mergeValue
  );

  if (resolvedCell) {
    let calculatedValue: string | number | undefined;
    if (resolvedCell.formula) {
      try {
        const cellValues = roomManager.getCellValues(clientInfo.roomId);
        const response = await axios.post(`${JAVA_SERVICE_URL}/api/evaluate`, {
          expression: resolvedCell.formula,
          cells: cellValues
        });
        calculatedValue = response.data.result;
        roomManager.setCellCalculatedValue(clientInfo.roomId, row, col, calculatedValue);
      } catch (error) {
        console.error('Failed to evaluate formula:', error);
        calculatedValue = 0;
      }
    }

    // 向房间内所有用户广播最终结果
    broadcastToRoom(clientInfo.roomId, {
      type: 'cell-change',
      payload: {
        row,
        col,
        value: resolvedCell.value,
        formula: resolvedCell.formula,
        calculatedValue,
        userId: clientInfo.userId,
        version: resolvedCell.version,
        isConflictResolve: true
      }
    });
  }
}

function handleKickUser(message: WSMessage, clientInfo: ClientInfo): void {
  if (!clientInfo.userId || !clientInfo.roomId) return;

  const { targetUserId } = message.payload;
  const success = roomManager.kickUser(clientInfo.roomId, clientInfo.userId, targetUserId);

  if (success) {
    const targetWs = findClientByUserId(targetUserId);
    if (targetWs) {
      send(targetWs, {
        type: 'kicked',
        payload: {
          reason: 'You have been removed from the room'
        }
      });
      clients.delete(targetWs);
      targetWs.close();
    }

    broadcastToRoom(clientInfo.roomId, {
      type: 'user-kicked',
      payload: {
        userId: targetUserId
      }
    }, clientInfo.ws);
  }
}

function handleDisconnect(clientInfo: ClientInfo): void {
  if (clientInfo.userId && clientInfo.roomId) {
    const { room } = roomManager.leaveRoom(clientInfo.roomId, clientInfo.userId);

    broadcastToRoom(clientInfo.roomId, {
      type: 'user-left',
      payload: {
        userId: clientInfo.userId,
        isOwner: false
      }
    });
  }

  clients.delete(clientInfo.ws);
}

function send(ws: WebSocket, message: WSMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function sendError(ws: WebSocket, error: string): void {
  send(ws, {
    type: 'error',
    payload: { error }
  });
}

function broadcastToRoom(roomId: string, message: WSMessage, excludeWs?: WebSocket): void {
  clients.forEach((info, ws) => {
    if (info.roomId === roomId && ws !== excludeWs && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  });
}

function findClientByUserId(userId: string): WebSocket | undefined {
  for (const [ws, info] of clients) {
    if (info.userId === userId) return ws;
  }
  return undefined;
}

function getSocketId(ws: WebSocket): string {
  return clients.get(ws)?.ws?.toString() || '';
}

function serializeRoom(room: Room): any {
  return {
    id: room.id,
    name: room.name,
    ownerId: room.ownerId,
    users: Array.from(room.users.values()).map(serializeUser),
    createdAt: room.createdAt
  };
}

function serializeUser(user: User): any {
  return {
    id: user.id,
    name: user.name,
    color: user.color,
    cursorPosition: user.cursorPosition
  };
}
