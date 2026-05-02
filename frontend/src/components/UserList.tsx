import React from 'react';
import { User } from '../types';

interface UserListProps {
  users: User[];
  currentUserId: string | null;
  isOwner: boolean;
  onKick: (userId: string) => void;
}

export function UserList({ users, currentUserId, isOwner, onKick }: UserListProps) {
  return (
    <div
      style={{
        position: 'fixed',
        top: '70px',
        right: '16px',
        width: '200px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        padding: '12px',
        maxHeight: '300px',
        overflowY: 'auto'
      }}
    >
      <h3
        style={{
          margin: '0 0 12px 0',
          fontSize: '14px',
          fontWeight: 'bold',
          color: '#333',
          borderBottom: '1px solid #eee',
          paddingBottom: '8px'
        }}
      >
        Users in Room ({users.length})
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {users.map((user) => (
          <div
            key={user.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 8px',
              backgroundColor: user.color + '20',
              borderRadius: '4px',
              borderLeft: `3px solid ${user.color}`
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: user.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '500', color: '#333' }}>
                  {user.name}
                </div>
                {user.id === currentUserId && (
                  <div style={{ fontSize: '10px', color: '#666' }}>You</div>
                )}
                {user.id === currentUserId && isOwner && (
                  <div style={{ fontSize: '10px', color: '#1976d2' }}>Owner</div>
                )}
              </div>
            </div>

            {isOwner && user.id !== currentUserId && (
              <button
                onClick={() => onKick(user.id)}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#d32f2f',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px'
                }}
              >
                Kick
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
