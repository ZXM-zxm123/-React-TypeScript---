import React, { memo } from 'react';
import { CellData } from '../types';
import { getCellDisplayValue } from '../utils/formulaParser';

interface CellProps {
  row: number;
  col: number;
  data: CellData;
  isSelected: boolean;
  isEditing: boolean;
  otherUserCursor?: { color: string; name: string };
  onClick: (row: number, col: number) => void;
  onDoubleClick: (row: number, col: number) => void;
  onChange: (value: string) => void;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export const Cell = memo(function Cell({
  row,
  col,
  data,
  isSelected,
  isEditing,
  otherUserCursor,
  onClick,
  onDoubleClick,
  onChange,
  onBlur,
  onKeyDown
}: CellProps) {
  const cellId = `${String.fromCharCode(65 + col)}${row + 1}`;
  const displayValue = getCellDisplayValue(data);
  const hasFormula = data.formula !== undefined;

  return (
    <div
      className={`cell ${isSelected ? 'selected' : ''} ${hasFormula ? 'has-formula' : ''}`}
      onClick={() => onClick(row, col)}
      onDoubleClick={() => onDoubleClick(row, col)}
      style={{
        position: 'relative',
        border: '1px solid #ddd',
        padding: '4px 8px',
        minHeight: '24px',
        backgroundColor: isSelected ? '#e3f2fd' : 'white',
        cursor: 'cell'
      }}
    >
      {isEditing ? (
        <input
          type="text"
          value={data.value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          autoFocus
          style={{
            width: '100%',
            border: 'none',
            outline: 'none',
            padding: 0,
            fontSize: 'inherit',
            fontFamily: 'inherit',
            backgroundColor: 'transparent'
          }}
        />
      ) : (
        <span
          style={{
            display: 'block',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {displayValue}
        </span>
      )}

      {otherUserCursor && (
        <div
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: otherUserCursor.color,
            border: '1px solid white'
          }}
          title={otherUserCursor.name}
        />
      )}
    </div>
  );
});
