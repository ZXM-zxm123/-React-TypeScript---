import React from 'react';
import { User, EditHistoryEntry } from '../types';

interface ToolbarProps {
  roomName: string;
  users: User[];
  currentUserId: string | null;
  isOwner: boolean;
  history: EditHistoryEntry[];
  onLeave: () => void;
  onKick: (userId: string) => void;
  onUndo: () => void;
}

export function Toolbar({
  roomName,
  users,
  currentUserId,
  isOwner,
  history,
  onLeave,
  onKick,
  onUndo
}: ToolbarProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        backgroundColor: '#1976d2',
        color: 'white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
          {roomName || 'Collaborative Spreadsheet'}
        </h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', opacity: 0.8 }}>
            {users.length} user{users.length !== 1 ? 's' : ''} online
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={onUndo}
          disabled={history.length === 0}
          style={{
            padding: '6px 12px',
            backgroundColor: history.length === 0 ? '#1565c0' : '#42a5f5',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: history.length === 0 ? 'not-allowed' : 'pointer',
            fontSize: '12px'
          }}
        >
          Undo ({history.length})
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {users.map((user) => (
            <div
              key={user.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                backgroundColor: user.color,
                borderRadius: '12px',
                fontSize: '12px',
                color: 'white'
              }}
            >
              <span>{user.name}</span>
              {user.id === currentUserId && <span style={{ opacity: 0.7 }}>(you)</span>}
              {isOwner && user.id !== currentUserId && (
                <button
                  onClick={() => onKick(user.id)}
                  style={{
                    marginLeft: '4px',
                    padding: '2px 6px',
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '10px'
                  }}
                >
                  Kick
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={onLeave}
          style={{
            padding: '6px 12px',
            backgroundColor: '#d32f2f',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          Leave Room
        </button>
      </div>
    </div>
  );
}
