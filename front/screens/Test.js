import React, { useEffect, useState } from 'react';
import { View, Text, Button } from 'react-native';

const WebSocketTest = () => {
  const [messages, setMessages] = useState([]);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // WebSocket 연결
    const ws = new WebSocket('ws://110.11.192.148:1818/ws');
    
    ws.onopen = () => {
      console.log('WebSocket 연결 성공');
      setSocket(ws);
    };

    ws.onmessage = (event) => {
      setMessages(prev => [...prev, event.data]);
    };

    ws.onerror = (error) => {
      console.error('WebSocket 오류:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket 연결 종료');
    };

    // 컴포넌트 언마운트 시 연결 종료
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const sendMessage = () => {
    if (socket) {
      socket.send('안녕하세요, 서버!');
    }
  };

  return (
    <View>
      <Button title="메시지 보내기" onPress={sendMessage} />
      {messages.map((msg, index) => (
        <Text key={index}>{msg}</Text>
      ))}
    </View>
  );
};

export default WebSocketTest;