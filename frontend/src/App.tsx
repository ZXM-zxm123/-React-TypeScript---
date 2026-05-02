import React, { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Grid } from './components/Grid';
import { Toolbar } from './components/Toolbar';
import { ConflictResolver } from './components/ConflictResolver';
import { useWebSocket } from './hooks/useWebSocket';
import { useLocalStorage } from './hooks/useLocalStorage';
import { CellData, Room, User, WSMessage, CellConflict } from './types';
import { getCellId } from './utils/formulaParser';

type AppView = 'join' | 'room';

function App() {
  const [view, setView] = useState<AppView>('join');
  const [userName, setUserName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const [cells, setCells] = useState<Map<string, CellData>>(new Map());
  const [users, setUsers] = useState<User[]>([]);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentConflict, setCurrentConflict] = useState<CellConflict | null>(null);
  const [localCellVersions, setLocalCellVersions] = useState<Map<string, number>>(new Map());

  const { history, addEntry } = useLocalStorage(view === 'room' ? room?.id ?? null : null);

  const handleMessage = useCallback((message: WSMessage) => {
    switch (message.type) {
      case 'room-created':
      case 'room-joined': {
        const { room: roomData, userId } = message.payload;
        setRoom(roomData);
        setCurrentUserId(userId);
        setView('room');

        const cellsMap = new Map<string, CellData>();
        const versionsMap = new Map<string, number>();
        for (let row = 0; row < 20; row++) {
          for (let col = 0; col < 20; col++) {
            const cellId = getCellId(col, row);
            cellsMap.set(cellId, { value: '', version: 0 });
            versionsMap.set(cellId, 0);
          }
        }
        setCells(cellsMap);
        setLocalCellVersions(versionsMap);
        setUsers(roomData.users);
        break;
      }
      
      case 'user-joined': {
        const { user } = message.payload;
        setUsers((prev) => [...prev.filter((u) => u.id !== user.id), user]);
        break;
      }

      case 'user-left': {
        const { userId } = message.payload;
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        if (userId === currentUserId) {
          setView('join');
          setRoom(null);
          setRoomId('');
        }
        break;
      }

      case 'user-kicked': {
        const { userId } = message.payload;
        if (userId === currentUserId) {
          alert('You have been removed from the room');
          setView('join');
          setRoom(null);
          setRoomId('');
        }
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        break;
      }

      case 'kicked': {
        alert(message.payload.reason);
        setView('join');
        setRoom(null);
        setRoomId('');
        break;
      }

      case 'cursor-update': {
        const { userId, position } = message.payload;
        setUsers((prev) =>
          prev.map((u) => u.id === userId ? { ...u, cursorPosition: position } : u)
        );
        break;
      }

      case 'cell-change': {
        const { row, col, value, formula, calculatedValue, version } = message.payload;
        const cellId = getCellId(col, row);
        setCells((prev) => {
          const newCells = new Map(prev);
          newCells.set(cellId, { value, formula, calculatedValue, version });
          return newCells;
        });
        setLocalCellVersions((prev) => {
          const newVersions = new Map(prev);
          newVersions.set(cellId, version ?? (prev.get(cellId) || 0));
          return newVersions;
        });
        break;
      }

      case 'cell-conflict': {
        const conflict: CellConflict = message.payload;
        setCurrentConflict(conflict);
        break;
      }

      case 'error': {
        setError(message.payload.error);
        setTimeout(() => setError(null), 3000);
        break;
      }
    }
  }, [currentUserId]);

  const {
    isConnected,
    connect,
    disconnect,
    createRoom,
    joinRoom,
    leaveRoom,
    updateCursor,
    updateCell,
    updateCellWithVersion,
    resolveConflict,
    kickUser
  } = useWebSocket({
    onMessage: handleMessage,
    onConnect: () => console.log('Connected'),
    onDisconnect: () => console.log('Disconnected')
  });

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  const handleCreateRoom = useCallback(() => {
    if (!userName.trim() || !roomName.trim()) {
      setError('Please enter your name and room name');
      return;
    }
    createRoom(roomName.trim(), userName.trim());
  }, [userName, roomName, createRoom]);

  const handleJoinRoom = useCallback(() => {
    if (!userName.trim() || !roomId.trim()) {
      setError('Please enter your name and room ID');
      return;
    }
    joinRoom(roomId.trim(), userName.trim());
  }, [userName, roomId, joinRoom]);

  const handleLeaveRoom = useCallback(() => {
    leaveRoom();
    setView('join');
    setRoom(null);
    setRoomId('');
    setSelectedCell(null);
    setEditingCell(null);
  }, [leaveRoom]);

  const handleKickUser = useCallback(
    (userId: string) => {
      if (confirm('Are you sure you want to kick this user?')) {
        kickUser(userId);
      }
    },
    [kickUser]
  );

  const handleCellSelect = useCallback((row: number, col: number) => {
    setSelectedCell({ row, col });
    setEditingCell(null);
  }, []);

  const handleCellEdit = useCallback((row: number, col: number) => {
    setSelectedCell({ row, col });
    setEditingCell({ row, col });
  }, []);

  const handleCellValueChange = useCallback(
    (row: number, col: number, value: string) => {
      if (!currentUserId) return;

      const cellId = getCellId(col, row);
      const oldCell = cells.get(cellId) || { value: '' };
      const expectVersion = localCellVersions.get(cellId) || 0;

      setCells((prev) => {
        const newCells = new Map(prev);
        newCells.set(cellId, { value });
        return newCells;
      });

      addEntry(cellId, oldCell.value, value, currentUserId);
      updateCellWithVersion(row, col, value, expectVersion);
      setEditingCell(null);
    },
    [currentUserId, cells, localCellVersions, addEntry, updateCellWithVersion]
  );

  const handleResolveConflict = useCallback((keepLocal: boolean, mergeValue?: string | number) => {
    if (!currentConflict) return;
    
    resolveConflict(currentConflict.row, currentConflict.col, keepLocal, mergeValue);
    setCurrentConflict(null);
  }, [currentConflict, resolveConflict]);

  const handleCellBlur = useCallback(() => {
    setEditingCell(null);
  }, []);

  const handleCursorMove = useCallback(
    (row: number | null, col: number | null) => {
      updateCursor(row, col);
    },
    [updateCursor]
  );

  const handleUndo = useCallback(() => {
    const lastEntry = history[0];
    if (!lastEntry || !currentUserId) return;

    const { col, row } = getCellId(lastEntry.cellId).replace(/(\d+)/, (_, num) => {
      return `,${parseInt(num) - 1}`;
    }).split(',').reduce(
      (acc, val, idx) => ({ ...acc, [idx === 0 ? 'col' : 'row']: parseInt(val) }),
      {} as { col: number; row: number }
    );

    const cellIdParts = lastEntry.cellId.match(/([A-Z]+)(\d+)/);
    if (!cellIdParts) return;

    const colLetter = cellIdParts[1];
    const rowNum = parseInt(cellIdParts[2]);
    const colNum = colLetter.charCodeAt(0) - 65;

    updateCell(rowNum - 1, colNum, lastEntry.oldValue);
    setCells((prev) => {
      const newCells = new Map(prev);
      newCells.set(lastEntry.cellId, { value: lastEntry.oldValue });
      return newCells;
    });
  }, [history, currentUserId, updateCell]);

  if (view === 'join') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#f5f5f5'
        }}
      >
        <div
          style={{
            backgroundColor: 'white',
            padding: '32px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            width: '400px'
          }}
        >
          <h1
            style={{
              margin: '0 0 24px 0',
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#1976d2',
              textAlign: 'center'
            }}
          >
            Collaborative Spreadsheet
          </h1>

          {error && (
            <div
              style={{
                padding: '12px',
                backgroundColor: '#ffebee',
                color: '#c62828',
                borderRadius: '4px',
                marginBottom: '16px',
                fontSize: '14px'
              }}
            >
              {error}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#666' }}>
              Your Name
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Enter your name"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#666' }}>
              Room Name (for new room)
            </label>
            <input
              type="text"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Enter room name"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', color: '#666' }}>
              Room ID (for existing room)
            </label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter room ID"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleCreateRoom}
              disabled={!isConnected}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: isConnected ? '#1976d2' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: isConnected ? 'pointer' : 'not-allowed'
              }}
            >
              Create Room
            </button>
            <button
              onClick={handleJoinRoom}
              disabled={!isConnected}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: isConnected ? '#388e3c' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: isConnected ? 'pointer' : 'not-allowed'
              }}
            >
              Join Room
            </button>
          </div>

          {!isConnected && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: '#fff3e0',
                color: '#e65100',
                borderRadius: '4px',
                fontSize: '12px',
                textAlign: 'center'
              }}
            >
              Connecting to server...
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Toolbar
        roomName={room?.name || ''}
        users={users}
        currentUserId={currentUserId}
        isOwner={room?.ownerId === currentUserId}
        history={history}
        onLeave={handleLeaveRoom}
        onKick={handleKickUser}
        onUndo={handleUndo}
      />

      <div
        style={{
          padding: '16px',
          overflowX: 'auto'
        }}
      >
        <Grid
          cells={cells}
          users={users}
          selectedCell={selectedCell}
          editingCell={editingCell}
          currentUserId={currentUserId}
          onCellSelect={handleCellSelect}
          onCellEdit={handleCellEdit}
          onCellValueChange={handleCellValueChange}
          onCellBlur={handleCellBlur}
          onCursorMove={handleCursorMove}
        />
      </div>

      {selectedCell && (
        <div
          style={{
            position: 'fixed',
            bottom: '16px',
            left: '16px',
            padding: '12px 16px',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            fontSize: '12px',
            color: '#666'
          }}
        >
          Selected: <strong>{getCellId(selectedCell.col, selectedCell.row)}</strong>
          {editingCell && <span style={{ marginLeft: '8px', color: '#1976d2' }}>Editing...</span>}
        </div>
      )}

      <div
        style={{
          position: 'fixed',
          bottom: '16px',
          right: '16px',
          padding: '8px 12px',
          backgroundColor: '#1976d2',
          color: 'white',
          borderRadius: '4px',
          fontSize: '11px'
        }}
      >
        Room ID: {room?.id}
      </div>

      {currentConflict && (
        <ConflictResolver
          conflict={currentConflict}
          onResolve={handleResolveConflict}
        />
      )}
    </div>
  );
}

export default App;
