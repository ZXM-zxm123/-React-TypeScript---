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
  version?: number;
  lastModified?: number;
  lastModifiedBy?: string;
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
  cursors: Map<string, { row: number; col: number }>;
  selectedCell: { row: number; col: number } | null;
  isEditing: boolean;
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

export interface CellConflict {
  row: number;
  col: number;
  pendingEdit: PendingEdit;
  currentValue: CellData;
  existingPendingEdit?: PendingEdit;
}

export interface LocalCellState {
  row: number;
  col: number;
  value: string | number;
  localVersion?: number;
}
