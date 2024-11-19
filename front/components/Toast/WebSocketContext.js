// WebSocketContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const [connections, setConnections] = useState({});

  const connect = (endpoint) => {
    if (!connections[endpoint]) {
      const newWs = new WebSocket(endpoint);
      setConnections(prev => ({ ...prev, [endpoint]: newWs }));
      return newWs;
    }
    return connections[endpoint];
  };

  const disconnect = (endpoint) => {
    if (connections[endpoint]) {
      connections[endpoint].close();
      setConnections(prev => {
        const newConnections = { ...prev };
        delete newConnections[endpoint];
        return newConnections;
      });
    }
  };

  useEffect(() => {
    return () => {
      Object.values(connections).forEach(ws => ws.close());
    };
  }, []);

  return (
    <WebSocketContext.Provider value={{ connections, connect, disconnect }}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => useContext(WebSocketContext);
