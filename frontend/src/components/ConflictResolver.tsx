import React, { useState } from 'react';
import { CellConflict } from '../types';

interface ConflictResolveProps {
  conflict: CellConflict;
  onResolve: (keepLocal: boolean, mergeValue?: string | number) => void;
  onCancel?: () => void;
}

export function ConflictResolver({ conflict, onResolve, onCancel }: ConflictResolveProps) {
  const [showMerge, setShowMerge] = useState(false);
  const [mergeValue, setMergeValue] = useState('');
  const cellId = `${String.fromCharCode(65 + conflict.col)}${conflict.row + 1}`;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 9999
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '24px',
        maxWidth: '600px',
        width: '90%',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
      }}>
        <h2 style={{
          margin: '0 0 16px 0',
          color: '#d32f2f',
          fontSize: '20px',
          fontWeight: 'bold'
        }}>
          编辑冲突检测 - 单元格 {cellId}
        </h2>

        <p style={{
          margin: '0 0 24px 0',
          color: '#666',
          fontSize: '14px'
        }}>
          多人同时编辑了相同单元格，请选择保留哪个值：
        </p>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <div style={{
            flex: 1,
            padding: '16px',
            border: '2px solid #1976d2',
            borderRadius: '8px',
            backgroundColor: '#e3f2fd'
          }}>
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#1976d2'
            }}>
              当前服务器值
            </h3>
            <p style={{
              margin: 0,
              fontSize: '18px',
              fontFamily: 'monospace',
              color: '#333',
              minHeight: '28px'
            }}>
              {String(conflict.currentValue.value || '')}
            </p>
            {conflict.currentValue.lastModifiedBy && (
              <p style={{
                margin: '8px 0 0 0',
                fontSize: '12px',
                color: '#999'
              }}>
                最后修改: {conflict.currentValue.lastModifiedBy}
              </p>
            )}
          </div>

          <div style={{
            flex: 1,
            padding: '16px',
            border: '2px solid #4caf50',
            borderRadius: '8px',
            backgroundColor: '#e8f5e9'
          }}>
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#4caf50'
            }}>
              您的编辑
            </h3>
            <p style={{
              margin: 0,
              fontSize: '18px',
              fontFamily: 'monospace',
              color: '#333',
              minHeight: '28px'
            }}>
              {String(conflict.pendingEdit.value || '')}
            </p>
            <p style={{
              margin: '8px 0 0 0',
              fontSize: '12px',
              color: '#999'
            }}>
              编辑人: {conflict.pendingEdit.userName}
            </p>
          </div>
        </div>

        {showMerge && (
          <div style={{
            marginBottom: '24px',
            padding: '16px',
            border: '1px solid #ddd',
            borderRadius: '8px'
          }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              合并值
            </label>
            <input
              type="text"
              value={mergeValue}
              onChange={(e) => setMergeValue(e.target.value)}
              placeholder="输入合并后的值"
              autoFocus
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
        )}

        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          {onCancel && (
            <button
              onClick={onCancel}
              style={{
                padding: '10px 20px',
                border: '1px solid #ddd',
                backgroundColor: 'white',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              稍后处理
            </button>
          )}
          
          {!showMerge && (
            <>
              <button
                onClick={() => setShowMerge(true)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#ff9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                自定义合并
              </button>
              
              <button
                onClick={() => onResolve(true)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#1976d2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                保留服务器值
              </button>
              
              <button
                onClick={() => onResolve(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#4caf50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                保留我的编辑
              </button>
            </>
          )}
          
          {showMerge && (
            <>
              <button
                onClick={() => setShowMerge(false)}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #ddd',
                  backgroundColor: 'white',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                返回
              </button>
              
              <button
                onClick={() => onResolve(false, mergeValue)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#4caf50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}
              >
                应用合并值
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
