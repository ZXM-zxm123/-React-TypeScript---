import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  name: string;
  color: string;
  cursorPosition: { row: number; col: number } | null;
  socketId: string;
}

export interface CellData {
  value: string | number;
  formula?: string;
  calculatedValue?: string | number;
}

export interface Room {
  id: string;
  name: string;
  ownerId: string;
  users: Map<string, User>;
  cells: Map<string, CellData>;
  createdAt: Date;
}

const GRID_SIZE = 20;

function getCellKey(row: number, col: number): string {
  const colLetter = String.fromCharCode(65 + col);
  return `${colLetter}${row + 1}`;
}

function generateColor(): string {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
  return colors[Math.floor(Math.random() * colors.length)];
}

class RoomManager {
  private rooms: Map<string, Room> = new Map();

  createRoom(name: string, ownerName: string, socketId: string): Room {
    const roomId = uuidv4().substring(0, 8);
    const userId = uuidv4().substring(0, 8);

    const owner: User = {
      id: userId,
      name: ownerName,
      color: generateColor(),
      cursorPosition: null,
      socketId
    };

    const cells = new Map<string, CellData>();
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const key = getCellKey(row, col);
        cells.set(key, { value: '' });
      }
    }

    const room: Room = {
      id: roomId,
      name,
      ownerId: userId,
      users: new Map([[userId, owner]]),
      cells,
      createdAt: new Date()
    };

    this.rooms.set(roomId, room);
    return room;
  }

  joinRoom(roomId: string, userName: string, socketId: string): { room: Room; user: User } | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const userId = uuidv4().substring(0, 8);
    const user: User = {
      id: userId,
      name: userName,
      color: generateColor(),
      cursorPosition: null,
      socketId
    };

    room.users.set(userId, user);
    return { room, user };
  }

  leaveRoom(roomId: string, userId: string): { room: Room | null; isOwner: boolean } {
    const room = this.rooms.get(roomId);
    if (!room) return { room: null, isOwner: false };

    room.users.delete(userId);
    const isOwner = room.ownerId === userId;

    if (isOwner || room.users.size === 0) {
      this.rooms.delete(roomId);
      return { room: null, isOwner };
    }

    return { room, isOwner: false };
  }

  kickUser(roomId: string, ownerId: string, targetUserId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.ownerId !== ownerId) return false;
    if (targetUserId === ownerId) return false;

    return room.users.delete(targetUserId);
  }

  updateCell(roomId: string, row: number, col: number, value: string | number, formula?: string): CellData | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const key = getCellKey(row, col);
    const cellData: CellData = { value, formula };
    room.cells.set(key, cellData);
    return cellData;
  }

  updateCursor(roomId: string, userId: string, position: { row: number; col: number } | null): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;

    const user = room.users.get(userId);
    if (!user) return false;

    user.cursorPosition = position;
    return true;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId);
  }

  getRoomUsers(roomId: string): User[] {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.users.values()) : [];
  }

  getCellValues(roomId: string): Record<string, any> {
    const room = this.rooms.get(roomId);
    if (!room) return {};

    const result: Record<string, any> = {};
    room.cells.forEach((cell, key) => {
      result[key] = cell.calculatedValue ?? cell.value;
    });
    return result;
  }

  setCellCalculatedValue(roomId: string, row: number, col: number, calculatedValue: string | number): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const key = getCellKey(row, col);
    const cell = room.cells.get(key);
    if (cell) {
      cell.calculatedValue = calculatedValue;
    }
  }
}

export const roomManager = new RoomManager();
