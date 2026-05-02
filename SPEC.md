# Collaborative Spreadsheet Application Specification

## 1. Architecture Overview

```
┌─────────────────┐     WebSocket      ┌─────────────────┐
│   Frontend      │◄──────────────────►│   Node.js       │
│   (React+TS)    │                    │   Server        │
│   20×20 Grid    │                    │   (Room Mgmt)   │
└─────────────────┘                    └────────┬────────┘
                                                 │
                                        REST/gRPC│
                                                 ▼
                                        ┌─────────────────┐
                                        │   Java          │
                                        │   Service       │
                                        │   (Aviator)     │
                                        └─────────────────┘
```

## 2. Component Specifications

### 2.1 Frontend (React + TypeScript)

**Grid System:**
- 20×20 cell grid (A1:T20)
- Cell selection with click
- Multi-select with Shift+Click for ranges
- Cell editing on double-click or typing
- Formula input with `=` prefix (e.g., `=SUM(A1:A5)`)

**State Management:**
- Local cell data state
- Other users' cursor positions
- Room connection state
- Edit history (localStorage)

**WebSocket Events:**
- `join-room`: Join a room with username
- `leave-room`: Leave current room
- `cursor-move`: Broadcast cursor position
- `cell-update`: Update cell value
- `cell-change`: Receive cell changes from others
- `user-joined`: User joined notification
- `user-left`: User left notification
- `kicked`: User was kicked from room

### 2.2 Node.js Server

**Room Management:**
- Create room (first user becomes owner)
- Join existing room
- Track users in each room
- Broadcast messages to room members

**WebSocket Message Types:**
```typescript
interface WSMessage {
  type: string;
  roomId: string;
  userId: string;
  payload: any;
}
```

**Endpoints:**
- `POST /api/rooms` - Create room
- `GET /api/rooms/:id` - Get room info
- `DELETE /api/rooms/:id` - Delete room (owner only)
- `POST /api/rooms/:id/kick` - Kick user (owner only)

**Formula Calculation:**
- When cell value starts with `=`, send to Java service
- Use REST call to Java endpoint
- Return calculated result

### 2.3 Java Service

**Formula Evaluation:**
- Use Aviator expression evaluator
- Support functions: SUM, AVG, MAX, MIN, COUNT
- Support cell references: A1, B2, etc.
- Support ranges: A1:A5

**REST Endpoints:**
```
POST /api/evaluate
Body: { "expression": "=SUM(A1:A5)", "cells": {...} }
Response: { "result": 100 }
```

## 3. Data Models

### 3.1 Room
```typescript
interface Room {
  id: string;
  name: string;
  ownerId: string;
  users: User[];
  cells: CellData[][]; // 20×20 grid
  createdAt: Date;
}
```

### 3.2 User
```typescript
interface User {
  id: string;
  name: string;
  color: string; // cursor color
  cursorPosition: { row: number; col: number } | null;
  socketId: string;
}
```

### 3.3 Cell
```typescript
interface CellData {
  value: string | number;
  formula?: string;
  calculatedValue?: string | number;
}
```

## 4. Formula Syntax

```
=SUM(A1:A5)     // Sum of range
=AVG(A1,B1:C3)  // Average of multiple ranges
=MAX(A1:A10)    // Maximum value
=MIN(A1:A10)    // Minimum value
=COUNT(A1:A10)  // Count of numeric values
=A1+B1          // Arithmetic with cell references
```

## 5. Local Storage

Edit history stored in localStorage:
```typescript
interface EditHistoryEntry {
  cellId: string;
  oldValue: any;
  newValue: any;
  timestamp: number;
  userId: string;
}
// Store last 100 edits per room
```

## 6. Permission Model

- **Owner**: Can kick users, delete room
- **User**: Can edit cells, see others' cursors

## 7. Port Configuration

| Service | Port |
|---------|------|
| Frontend (Vite) | 5173 |
| Node.js Server | 3001 |
| Java Service | 8080 |

## 8. File Structure

```
/d:\训练文件夹\-React-TypeScript---/
├── SPEC.md
├── frontend/          # React + TypeScript
│   ├── src/
│   │   ├── components/
│   │   │   ├── Grid.tsx
│   │   │   ├── Cell.tsx
│   │   │   ├── Toolbar.tsx
│   │   │   └── UserList.tsx
│   │   ├── hooks/
│   │   │   ├── useWebSocket.ts
│   │   │   └── useLocalStorage.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   └── formulaParser.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
├── server/            # Node.js
│   ├── src/
│   │   ├── index.ts
│   │   ├── room.ts
│   │   └── websocket.ts
│   └── package.json
└── java-service/      # Java
    ├── src/main/java/
    │   └── com/spreadsheet/
    │       ├── SpreadsheetApplication.java
    │       └── FormulaController.java
    └── pom.xml
```
