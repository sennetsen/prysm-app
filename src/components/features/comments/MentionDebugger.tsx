import React, { useEffect, useState } from 'react';

interface MentionDebuggerProps {
  isVisible: boolean;
  searchTerm: string;
  position: { top: number; left: number };
}

export const MentionDebugger: React.FC<MentionDebuggerProps> = ({
  isVisible,
  searchTerm,
  position,
}) => {
  const [logs, setLogs] = useState<string[]>([]);

  // Add a log whenever a prop changes
  useEffect(() => {
    const newLog = `[${new Date().toLocaleTimeString()}] Dropdown ${isVisible ? 'SHOWN' : 'HIDDEN'}, Search: "${searchTerm}", Position: (${position.top}, ${position.left})`;
    setLogs(prev => [newLog, ...prev.slice(0, 9)]); // Keep last 10 logs

    // Also log to console
    console.log(newLog);
  }, [isVisible, searchTerm, position]);

  // Only show when debugging is needed
  if (!isVisible && logs.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      width: '300px',
      maxHeight: '200px',
      overflowY: 'auto',
      background: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      zIndex: 2000,
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      fontFamily: 'monospace'
    }}>
      <h4 style={{ margin: '0 0 5px', color: '#ff9cbc' }}>Mention Debugger</h4>
      <button
        onClick={() => setLogs([])}
        style={{
          position: 'absolute',
          top: '5px',
          right: '5px',
          background: 'none',
          border: 'none',
          color: 'white',
          cursor: 'pointer'
        }}
      >
        ×
      </button>
      <div>
        <strong>Current State:</strong>
        <ul style={{ margin: '5px 0', paddingLeft: '15px' }}>
          <li>Visible: {isVisible ? '✅' : '❌'}</li>
          <li>Search: "{searchTerm}"</li>
          <li>Position: Top {position.top}px, Left {position.left}px</li>
        </ul>
      </div>
      <div>
        <strong>Event Log:</strong>
        <ul style={{ margin: '5px 0', paddingLeft: '15px' }}>
          {logs.map((log, i) => (
            <li key={i} style={{ marginBottom: '3px', fontSize: '10px' }}>{log}</li>
          ))}
        </ul>
      </div>

      {/* Render a dot at the current position to help debug */}
      <div style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
        width: '10px',
        height: '10px',
        background: 'red',
        borderRadius: '50%',
        pointerEvents: 'none',
        zIndex: 2000
      }} />
    </div>
  );
}; 