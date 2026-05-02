import { useEffect, useRef, useCallback, useState } from 'react';
import { WSMessage, Room, User } from '../types';

const WS_URL = process.env.VITE_WS_URL || 'ws://localhost:3001';

interface UseWebSocketProps {
  onMessage: (message: WSMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function useWebSocket({ onMessage, onConnect, onDisconnect }: UseWebSocketProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      onConnect?.();
    };

    ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        onMessage(message);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      onDisconnect?.();
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, [onMessage, onConnect, onDisconnect]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  const send = useCallback((message: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const createRoom = useCallback((roomName: string, userName: string) => {
    send({
      type: 'create-room',
      payload: { roomName, userName }
    });
  }, [send]);

  const joinRoom = useCallback((roomId: string, userName: string) => {
    send({
      type: 'join-room',
      payload: { roomId, userName }
    });
  }, [send]);

  const leaveRoom = useCallback(() => {
    send({ type: 'leave-room', payload: {} });
  }, [send]);

  const updateCursor = useCallback((row: number | null, col: number | null) => {
    send({
      type: 'cursor-move',
      payload: { row, col }
    });
  }, [send]);

  const updateCell = useCallback((row: number, col: number, value: string | number) => {
    send({
      type: 'cell-update',
      payload: { row, col, value }
    });
  }, [send]);

  const kickUser = useCallback((targetUserId: string) => {
    send({
      type: 'kick-user',
      payload: { targetUserId }
    });
  }, [send]);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  return {
    isConnected,
    connect,
    disconnect,
    createRoom,
    joinRoom,
    leaveRoom,
    updateCursor,
    updateCell,
    kickUser
  };
}
