import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Cell } from './Cell';
import { CellData, User } from '../types';
import { getCellId, getCellDisplayValue } from '../utils/formulaParser';

const GRID_SIZE = 20;

interface GridProps {
  cells: Map<string, CellData>;
  users: User[];
  selectedCell: { row: number; col: number } | null;
  editingCell: { row: number; col: number } | null;
  currentUserId: string | null;
  onCellSelect: (row: number, col: number) => void;
  onCellEdit: (row: number, col: number) => void;
  onCellValueChange: (row: number, col: number, value: string) => void;
  onCellBlur: () => void;
  onCursorMove: (row: number | null, col: number | null) => void;
}

export function Grid({
  cells,
  users,
  selectedCell,
  editingCell,
  currentUserId,
  onCellSelect,
  onCellEdit,
  onCellValueChange,
  onCellBlur,
  onCursorMove
}: GridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);

  const getOtherUserCursor = useCallback(
    (row: number, col: number): { color: string; name: string } | undefined => {
      const cellId = getCellId(col, row);
      const otherUser = users.find(
        (u) => u.id !== currentUserId && u.cursorPosition?.row === row && u.cursorPosition?.col === col
      );
      if (otherUser) {
        return { color: otherUser.color, name: otherUser.name };
      }
      return undefined;
    },
    [users, currentUserId]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!gridRef.current) return;

      const rect = gridRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const colWidth = rect.width / GRID_SIZE;
      const rowHeight = rect.height / GRID_SIZE;

      const col = Math.floor(x / colWidth);
      const row = Math.floor(y / rowHeight);

      if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
        if (!hoveredCell || hoveredCell.row !== row || hoveredCell.col !== col) {
          setHoveredCell({ row, col });
          onCursorMove(row, col);
        }
      }
    },
    [hoveredCell, onCursorMove]
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredCell(null);
    onCursorMove(null, null);
  }, [onCursorMove]);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      onCellSelect(row, col);
    },
    [onCellSelect]
  );

  const handleCellDoubleClick = useCallback(
    (row: number, col: number) => {
      onCellEdit(row, col);
    },
    [onCellEdit]
  );

  const handleCellChange = useCallback(
    (row: number, col: number, value: string) => {
      onCellValueChange(row, col, value);
    },
    [onCellValueChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        onCellBlur();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        if (selectedCell) {
          const newCol = e.shiftKey
            ? Math.max(0, selectedCell.col - 1)
            : Math.min(GRID_SIZE - 1, selectedCell.col + 1);
          onCellSelect(selectedCell.row, newCol);
        }
      } else if (e.key === 'ArrowUp' && selectedCell) {
        e.preventDefault();
        onCellSelect(Math.max(0, selectedCell.row - 1), selectedCell.col);
      } else if (e.key === 'ArrowDown' && selectedCell) {
        e.preventDefault();
        onCellSelect(Math.min(GRID_SIZE - 1, selectedCell.row + 1), selectedCell.col);
      } else if (e.key === 'Escape') {
        onCellBlur();
      }
    },
    [selectedCell, onCellSelect, onCellBlur]
  );

  const getCellData = useCallback(
    (row: number, col: number): CellData => {
      const cellId = getCellId(col, row);
      return cells.get(cellId) || { value: '' };
    },
    [cells]
  );

  return (
    <div
      ref={gridRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        display: 'grid',
        gridTemplateColumns: `60px repeat(${GRID_SIZE}, 1fr)`,
        gridTemplateRows: `30px repeat(${GRID_SIZE}, 1fr)`,
        border: '1px solid #999',
        backgroundColor: '#f5f5f5',
        userSelect: 'none'
      }}
    >
      <div
        style={{
          gridColumn: 1,
          gridRow: 1,
          backgroundColor: '#e0e0e0',
          border: '1px solid #999',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 'bold',
          fontSize: '12px'
        }}
      />

      {Array.from({ length: GRID_SIZE }, (_, i) => (
        <div
          key={`header-col-${i}`}
          style={{
            gridColumn: i + 2,
            gridRow: 1,
            backgroundColor: '#e0e0e0',
            border: '1px solid #999',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '12px'
          }}
        >
          {String.fromCharCode(65 + i)}
        </div>
      ))}

      {Array.from({ length: GRID_SIZE }, (_, row) => (
        <React.Fragment key={`row-${row}`}>
          <div
            style={{
              gridColumn: 1,
              gridRow: row + 2,
              backgroundColor: '#e0e0e0',
              border: '1px solid #999',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '12px'
            }}
          >
            {row + 1}
          </div>

          {Array.from({ length: GRID_SIZE }, (_, col) => {
            const cellData = getCellData(row, col);
            const isSelected = selectedCell?.row === row && selectedCell?.col === col;
            const isEditing = editingCell?.row === row && editingCell?.col === col;
            const otherCursor = getOtherUserCursor(row, col);

            return (
              <Cell
                key={`cell-${row}-${col}`}
                row={row}
                col={col}
                data={cellData}
                isSelected={isSelected}
                isEditing={isEditing}
                otherUserCursor={otherCursor}
                onClick={handleCellClick}
                onDoubleClick={handleCellDoubleClick}
                onChange={(value) => handleCellChange(row, col, value)}
                onBlur={onCellBlur}
                onKeyDown={handleKeyDown}
              />
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
}
