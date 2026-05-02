import { useCallback, useEffect, useState } from 'react';
import { EditHistoryEntry } from '../types';

const HISTORY_KEY_PREFIX = 'spreadsheet_history_';
const MAX_HISTORY_SIZE = 100;

export function useLocalStorage(roomId: string | null) {
  const [history, setHistory] = useState<EditHistoryEntry[]>([]);

  useEffect(() => {
    if (!roomId) {
      setHistory([]);
      return;
    }

    const key = HISTORY_KEY_PREFIX + roomId;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        setHistory(JSON.parse(stored));
      } catch {
        setHistory([]);
      }
    } else {
      setHistory([]);
    }
  }, [roomId]);

  const addEntry = useCallback((cellId: string, oldValue: any, newValue: any, userId: string) => {
    if (!roomId) return;

    const entry: EditHistoryEntry = {
      cellId,
      oldValue,
      newValue,
      timestamp: Date.now(),
      userId
    };

    setHistory((prev) => {
      const newHistory = [entry, ...prev].slice(0, MAX_HISTORY_SIZE);
      const key = HISTORY_KEY_PREFIX + roomId;
      localStorage.setItem(key, JSON.stringify(newHistory));
      return newHistory;
    });
  }, [roomId]);

  const clearHistory = useCallback(() => {
    if (!roomId) return;
    const key = HISTORY_KEY_PREFIX + roomId;
    localStorage.removeItem(key);
    setHistory([]);
  }, [roomId]);

  const undoLast = useCallback((): EditHistoryEntry | null => {
    if (history.length === 0) return null;

    const [last, ...rest] = history;
    if (roomId) {
      const key = HISTORY_KEY_PREFIX + roomId;
      localStorage.setItem(key, JSON.stringify(rest));
    }
    setHistory(rest);
    return last;
  }, [history, roomId]);

  return {
    history,
    addEntry,
    clearHistory,
    undoLast
  };
}
