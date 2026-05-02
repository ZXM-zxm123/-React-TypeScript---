import React, { useRef, useEffect, useState, useCallback } from 'react';
import { User } from '../types';

interface CursorLayerProps {
  gridRef: React.RefObject<HTMLDivElement>;
  users: User[];
  currentUserId: string | null;
  gridSize: number;
}

interface CellMeasurement {
  cellWidth: number;
  cellHeight: number;
  headerWidth: number;
  headerHeight: number;
  totalWidth: number;
  totalHeight: number;
}

export function CursorLayer({ gridRef, users, currentUserId, gridSize }: CursorLayerProps) {
  const [measurements, setMeasurements] = useState<CellMeasurement | null>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  
  const measureGrid = useCallback(() => {
    if (!gridRef.current) return;
    
    const grid = gridRef.current;
    const rect = grid.getBoundingClientRect();
    
    const totalWidth = rect.width;
    const totalHeight = rect.height;
    
    const headerWidth = 60; // 固定值，与 Grid 组件一致
    const headerHeight = 30; // 固定值，与 Grid 组件一致
    
    const availableWidth = totalWidth - headerWidth;
    const availableHeight = totalHeight - headerHeight;
    
    const cellWidth = availableWidth / gridSize;
    const cellHeight = availableHeight / gridSize;
    
    setMeasurements({
      cellWidth,
      cellHeight,
      headerWidth,
      headerHeight,
      totalWidth,
      totalHeight
    });
  }, [gridSize, gridRef]);
  
  useEffect(() => {
    measureGrid();
    
    const resizeObserver = new ResizeObserver(() => {
      measureGrid();
    });
    
    if (gridRef.current) {
      resizeObserver.observe(gridRef.current);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [measureGrid, gridRef]);
  
  const calculateCursorPosition = (row: number, col: number) => {
    if (!measurements) return { left: 0, top: 0, width: 0, height: 0 };
    
    const left = measurements.headerWidth + col * measurements.cellWidth;
    const top = measurements.headerHeight + row * measurements.cellHeight;
    
    return {
      left,
      top,
      width: measurements.cellWidth,
      height: measurements.cellHeight
    };
  };
  
  const otherUsers = users.filter(u => u.id !== currentUserId && u.cursorPosition !== null);
  
  return (
    <div
      ref={layerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        overflow: 'hidden'
      }}
    >
      {otherUsers.map(user => {
        if (!user.cursorPosition) return null;
        
        const { row, col } = user.cursorPosition;
        const pos = calculateCursorPosition(row, col);
        
        return (
          <React.Fragment key={user.id}>
            {/* 单元格高亮边框 */}
            <div
              style={{
                position: 'absolute',
                left: pos.left,
                top: pos.top,
                width: pos.width,
                height: pos.height,
                border: `2px solid ${user.color}`,
                borderRadius: '2px',
                pointerEvents: 'none',
                boxSizing: 'border-box'
              }}
            />
            
            {/* 用户标签 */}
            <div
              style={{
                position: 'absolute',
                left: pos.left,
                top: pos.top - 22,
                backgroundColor: user.color,
                color: 'white',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 'bold',
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }}
            >
              {user.name}
            </div>
            
            {/* 单元格角落标记 */}
            <div
              style={{
                position: 'absolute',
                left: pos.left + pos.width - 8,
                top: pos.top + pos.height - 8,
                width: 16,
                height: 16,
                backgroundColor: user.color,
                borderRadius: '50%',
                border: '2px solid white',
                boxShadow: '0 0 4px rgba(0,0,0,0.3)'
              }}
            />
          </React.Fragment>
        );
      })}
    </div>
  );
}
