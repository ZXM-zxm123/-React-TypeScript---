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
  version?: number;
  lastModified?: number;
  lastModifiedBy?: string;
}

export interface Room {
  id: string;
  name: string;
  ownerId: string;
  users: Map<string, User>;
  cells: Map<string, CellData>;
  createdAt: Date;
}

export interface PendingEdit {
  id: string;
  roomId: string;
  row: number;
  col: number;
  value: string | number;
  formula?: string;
  userId: string;
  userName: string;
  timestamp: number;
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
  private pendingEdits: Map<string, Map<string, PendingEdit>> = new Map(); // roomId -> cellKey -> pendingEdit

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
        cells.set(key, { value: '', version: 0, lastModified: Date.now() });
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
    this.pendingEdits.set(roomId, new Map());
    return room;
  }

  joinRoom(roomId: string, userName: string, socketId: string): { room: Room; user: User } | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    // 确保该房间有 pendingEdits 条目
    if (!this.pendingEdits.has(roomId)) {
      this.pendingEdits.set(roomId, new Map());
    }

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
      this.pendingEdits.delete(roomId);
      return { room: null, isOwner };
    }

    return { room, isOwner: false };
  }

  // 冲突检测方法
  checkAndDetectConflict(
    roomId: string,
    row: number,
    col: number,
    userId: string,
    timestamp: number,
    expectVersion?: number
  ): { hasConflict: boolean; currentCell?: CellData; pendingEdit?: PendingEdit } {
    const room = this.rooms.get(roomId);
    if (!room) return { hasConflict: false };

    const cellKey = getCellKey(row, col);
    const cell = room.cells.get(cellKey);
    if (!cell) return { hasConflict: false };

    // 检查是否有悬而未决的冲突
    const pendingEditsForRoom = this.pendingEdits.get(roomId);
    const pendingEdit = pendingEditsForRoom?.get(cellKey);
    
    if (pendingEdit) {
      return { hasConflict: true, currentCell: cell, pendingEdit };
    }

    // 检查版本不匹配
    if (expectVersion !== undefined && cell.version !== expectVersion) {
      return { hasConflict: true, currentCell: cell };
    }

    return { hasConflict: false };
  }

  // 存储待处理的编辑
  storePendingEdit(
    roomId: string,
    row: number,
    col: number,
    value: string | number,
    formula: string | undefined,
    userId: string,
    userName: string
  ): PendingEdit {
    const cellKey = getCellKey(row, col);
    const pendingEdit: PendingEdit = {
      id: uuidv4(),
      roomId,
      row,
      col,
      value,
      formula,
      userId,
      userName,
      timestamp: Date.now()
    };

    if (!this.pendingEdits.has(roomId)) {
      this.pendingEdits.set(roomId, new Map());
    }

    const pendingEditsForRoom = this.pendingEdits.get(roomId)!;
    pendingEditsForRoom.set(cellKey, pendingEdit);

    return pendingEdit;
  }

  // 解决冲突
  resolveConflict(
    roomId: string,
    row: number,
    col: number,
    keepLocal: boolean,
    mergeValue?: string | number
  ): CellData | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const cellKey = getCellKey(row, col);
    const pendingEditsForRoom = this.pendingEdits.get(roomId);
    const pendingEdit = pendingEditsForRoom?.get(cellKey);

    if (!pendingEdit) return null;

    // 清除待处理编辑
    pendingEditsForRoom?.delete(cellKey);

    let finalValue: string | number;
    let finalFormula: string | undefined;

    if (keepLocal) {
      // 保留服务器端当前值
      const cell = room.cells.get(cellKey);
      finalValue = cell?.value ?? '';
      finalFormula = cell?.formula;
    } else if (mergeValue !== undefined) {
      // 使用合并后的值
      finalValue = mergeValue;
      finalFormula = typeof mergeValue === 'string' && mergeValue.startsWith('=') ? mergeValue : undefined;
    } else {
      // 使用待处理编辑的值
      finalValue = pendingEdit.value;
      finalFormula = pendingEdit.formula;
    }

    // 更新单元格
    return this.updateCell(roomId, row, col, finalValue, finalFormula);
  }

  kickUser(roomId: string, ownerId: string, targetUserId: string): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.ownerId !== ownerId) return false;
    if (targetUserId === ownerId) return false;

    return room.users.delete(targetUserId);
  }

  updateCell(
    roomId: string,
    row: number,
    col: number,
    value: string | number,
    formula?: string,
    lastModifiedBy?: string
  ): CellData | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const key = getCellKey(row, col);
    const existingCell = room.cells.get(key) || { value: '', version: 0 };
    
    const cellData: CellData = {
      value,
      formula,
      version: (existingCell.version || 0) + 1,
      lastModified: Date.now(),
      lastModifiedBy: lastModifiedBy
    };
    
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
