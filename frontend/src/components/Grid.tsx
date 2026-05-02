import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Cell } from './Cell';
import { CursorLayer } from './CursorLayer';
import { CellData, User } from '../types';
import { getCellId } from '../utils/formulaParser';

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
  
  // 当选中单元格变化时，发送光标位置
  useEffect(() => {
    if (selectedCell) {
      onCursorMove(selectedCell.row, selectedCell.col);
    } else {
      onCursorMove(null, null);
    }
  }, [selectedCell, onCursorMove]);

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
      style={{
        position: 'relative'
      }}
    >
      <div
        ref={gridRef}
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

              return (
                <Cell
                  key={`cell-${row}-${col}`}
                  row={row}
                  col={col}
                  data={cellData}
                  isSelected={isSelected}
                  isEditing={isEditing}
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
      
      {/* 光标显示层 */}
      <CursorLayer
        gridRef={gridRef}
        users={users}
        currentUserId={currentUserId}
        gridSize={GRID_SIZE}
      />
    </div>
  );
}
