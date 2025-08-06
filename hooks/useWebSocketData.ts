// hooks/useWebSocketData.ts
import { useState, useEffect, useRef } from 'react';
import { EnergyDataRow } from '../store/energyStore';

export const useWebSocketData = () => {
  const [data, setData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(`wss://your-websocket-server.com/energy`);
      
      ws.onopen = () => {
        console.log('🔗 WebSocket connected');
        setIsConnected(true);
        wsRef.current = ws;
      };

      ws.onmessage = (event) => {
        const newData = JSON.parse(event.data);
        setData(newData);
        console.log('📡 Real-time data received');
      };

      ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        setIsConnected(false);
        
        // Auto-reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  return { data, isConnected };
};
