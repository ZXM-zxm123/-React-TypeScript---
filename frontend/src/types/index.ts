export interface User {
  id: string;
  name: string;
  color: string;
  cursorPosition: { row: number; col: number } | null;
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
  users: User[];
  createdAt: Date;
}

export interface WSMessage {
  type: string;
  roomId?: string;
  userId?: string;
  payload: any;
}

export interface EditHistoryEntry {
  cellId: string;
  oldValue: any;
  newValue: any;
  timestamp: number;
  userId: string;
}

export interface GridState {
  cells: Map<string, CellData>;
  users: User[];
  cursors: Map<string, { row: number; col: number; color: string }>;
  selectedCell: { row: number; col: number } | null;
  isEditing: boolean;
}
