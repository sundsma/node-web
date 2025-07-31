// Utility for connecting to chat websocket and handling real-time updates
let ws = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 3000;
let connectionCallbacks = [];

export function connectChatWebsocket(token, onMessage, onThreadUpdate, onConnectionChange) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  // Connect to the backend server on port 5000, not the React dev server
  const wsUrl = `${protocol}//localhost:5000`;
  
  console.log('Connecting to WebSocket:', wsUrl);
  
  if (ws && ws.readyState === WebSocket.OPEN) {
    if (onConnectionChange) onConnectionChange(true);
    return ws;
  }

  try {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      reconnectAttempts = 0;
      if (onConnectionChange) onConnectionChange(true);
      
      // Send authentication - check if ws is still valid
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ 
          event: 'auth', 
          args: [token] 
        }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.event) {
          case 'authenticated':
            console.log('WebSocket authenticated');
            break;
            
          case 'new_message':
            console.log('New message received:', data.data.message.content);
            if (onMessage) {
              onMessage(data.data.threadId, data.data.message);
            }
            break;
            
          case 'thread_update':
            if (onThreadUpdate) {
              onThreadUpdate(data.data);
            }
            break;
            
          case 'error':
            console.error('WebSocket error:', data.data);
            break;
            
          default:
            console.log('Unknown WebSocket event:', data.event);
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (onConnectionChange) onConnectionChange(false);
    };

    ws.onclose = (event) => {
      console.log('WebSocket disconnected');
      ws = null;
      if (onConnectionChange) onConnectionChange(false);
      
      // Attempt to reconnect if not a normal closure
      if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        console.log(`Reconnecting... (${reconnectAttempts}/${maxReconnectAttempts})`);
        
        setTimeout(() => {
          connectChatWebsocket(token, onMessage, onThreadUpdate, onConnectionChange);
        }, reconnectDelay);
      }
    };

    return ws;
  } catch (error) {
    console.error('Failed to create chat WebSocket connection:', error);
    return null;
  }
}

export function disconnectChatWebsocket() {
  if (ws) {
    ws.close(1000); // Normal closure
    ws = null;
  }
}

export function getChatWebsocketState() {
  return ws ? ws.readyState : WebSocket.CLOSED;
}
