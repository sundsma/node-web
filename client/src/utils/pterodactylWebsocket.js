// Utility for connecting to Pterodactyl websocket and handling events
export function connectPterodactylWebsocket(socketUrl, token, onData) {
  let ws;
  let currentToken = token;

  function sendAuth() {
    ws.send(JSON.stringify({ event: 'auth', args: [currentToken] }));
  }

  function sendStatsRequest() {
    ws.send(JSON.stringify({ event: 'send stats', args: [null] }));
  }

  ws = new window.WebSocket(socketUrl);

  ws.onopen = () => {
    sendAuth();
    sendStatsRequest();
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.event === 'token expiring' || msg.event === 'token expired') {
        // Token renewal logic should be handled here
        // You may want to call your backend to get a new token and send it
      }
      if (onData) onData(msg);
    } catch (err) {
      // Ignore parse errors
    }
  };

  ws.onerror = (err) => {
    // Optionally handle errors
  };

  ws.onclose = () => {
    // Optionally handle close
  };

  return ws;
}
