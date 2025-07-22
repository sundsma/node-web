import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { 
  Server, 
  Users, 
  Copy, 
  Settings, 
  Play, 
  Pause, 
  BarChart3, 
  Shield,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import axios from 'axios';
import './Servers.css';
import { connectPterodactylWebsocket } from '../utils/pterodactylWebsocket';

const Servers = () => {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedServer, setExpandedServer] = useState(null);
  const { user, hasServerAccess, isAdmin } = useAuth();
  const UserIsAdmin = isAdmin();
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    description: '',
    address: '',
    port: '',
    gameType: '',
    maxPlayers: 0
  });
  // Overlay state for settings and analytics
  const [settingsOverlay, setSettingsOverlay] = useState({ open: false, server: null });
  const [analyticsOverlay, setAnalyticsOverlay] = useState({ open: false, serverId: null });
  const handleAddFormChange = (e) => {
    setAddForm({
      ...addForm,
      [e.target.name]: e.target.value
    });
  };

  const handleAddServer = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/servers', {
        name: addForm.name,
        description: addForm.description,
        address: addForm.address,
        port: Number(addForm.port),
        gameType: addForm.gameType,
        maxPlayers: Number(addForm.maxPlayers)
      });
      toast.success('Server added successfully');
      setShowAddForm(false);
      setAddForm({ name: '', description: '', address: '', port: '', gameType: '', maxPlayers: 0 });
      fetchServers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add server');
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  const fetchServers = async () => {
    try {
      // Fetch local servers
      const [localRes, pteroRes] = await Promise.all([
        axios.get('/api/servers'),
        axios.get('/api/servers/pterodactyl')
      ]);
      // Merge servers, tag Pterodactyl servers as green
      const localServers = localRes.data.servers || [];
      const pteroServers = (pteroRes.data.servers || []).map(s => ({ ...s, tag: 'green' }));
      setServers([...localServers, ...pteroServers]);
    } catch (error) {
      toast.error('Failed to fetch servers');
    } finally {
      setLoading(false);
    }
  };

  // TrafficGraph component for analytics overlay
  const TrafficGraph = ({ trafficStats }) => {
    // Simple SVG line graph for incoming/outgoing bytes
    if (!trafficStats || trafficStats.length === 0) return <div style={{ color:'#888', textAlign:'center', marginTop:80 }}>No traffic data</div>;
    const width = 440, height = 180, pad = 24;
    const times = trafficStats.map(t => t.time);
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const incoming = trafficStats.map(t => t.incoming);
    const outgoing = trafficStats.map(t => t.outgoing);
    const maxVal = Math.max(...incoming, ...outgoing, 1);
    // Map points to SVG coords
    const x = t => pad + ((t.time - minTime) / (maxTime - minTime || 1)) * (width - 2*pad);
    const yIn = v => height - pad - (v / maxVal) * (height - 2*pad);
    const yOut = v => height - pad - (v / maxVal) * (height - 2*pad);
    return (
      <svg width={width} height={height} style={{ background:'#111', borderRadius:8 }}>
        {/* Axes */}
        <line x1={pad} y1={height-pad} x2={width-pad} y2={height-pad} stroke="#888" />
        <line x1={pad} y1={pad} x2={pad} y2={height-pad} stroke="#888" />
        {/* Incoming traffic (blue) */}
        <polyline
          fill="none"
          stroke="#4fc3f7"
          strokeWidth="2"
          points={trafficStats.map(t => `${x(t)},${yIn(t.incoming)}`).join(' ')}
        />
        {/* Outgoing traffic (orange) */}
        <polyline
          fill="none"
          stroke="#ffb74d"
          strokeWidth="2"
          points={trafficStats.map(t => `${x(t)},${yOut(t.outgoing)}`).join(' ')}
        />
        {/* Labels */}
        <text x={pad} y={pad-6} fill="#4fc3f7" fontSize="12">Incoming</text>
        <text x={pad+80} y={pad-6} fill="#ffb74d" fontSize="12">Outgoing</text>
        <text x={width-pad-60} y={height-pad+16} fill="#888" fontSize="12">Time (last 1 min)</text>
        <text x={pad-20} y={height-pad-60} fill="#888" fontSize="12" transform={`rotate(-90,${pad-20},${height-pad-60})`}>Bytes</text>
      </svg>
    );
  };

  const copyToClipboard = (text) => {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(text).then(() => {
        toast.success('Copied to clipboard!');
      }).catch(() => {
        toast.error('Failed to copy to clipboard');
      });
    } else {
      // Fallback for older browsers or insecure context
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        toast.success('Copied to clipboard!');
      } catch {
        toast.error('Failed to copy to clipboard');
      }
      document.body.removeChild(textarea);
    }
  };

  const toggleServerExpansion = (serverId) => {
    setExpandedServer(expandedServer === serverId ? null : serverId);
  };

  const updateServerStatus = async (serverId, isActive) => {
    try {
      await axios.put(`/api/servers/${serverId}`, { isActive });
      toast.success(`Server ${isActive ? 'started' : 'stopped'} successfully`);
      fetchServers();
    } catch (error) {
      toast.error('Failed to update server status');
    }
  };

  const ServerCard = ({ server }) => {
    // Support both _id and id for local and Pterodactyl servers
    const serverId = server._id || server.id;
    const hasAccess = hasServerAccess(serverId);
    const isExpanded = expandedServer === serverId;
    
    // Create connection string - don't show port if it's empty
    const serverIp = server.connectionInfo?.ip || server.address || '';
    const serverPort = server.connectionInfo?.port || server.port || '';
    const connectionString = serverPort ? `${serverIp}:${serverPort}` : serverIp;

    // Real-time stats and console for Pterodactyl servers
    const [pteroStats, setPteroStats] = useState(null);
    const [consoleLogs, setConsoleLogs] = useState([]);
    const [consoleInput, setConsoleInput] = useState('');
    const [trafficStats, setTrafficStats] = useState([]); // [{time, incoming, outgoing}]
    const wsRef = useRef(null);
    const consoleOutputRef = useRef(null);
    // Track popup window for live updates
    const popupRef = useRef(null);

    useEffect(() => {
      if (server.tag === 'green' && isExpanded) {
        let traffic = [];
        axios.get(`/api/servers/pterodactyl/${serverId.replace('ptero-', '')}/websocket`).then(res => {
          const { data } = res;
          if (data && data.data && data.data.token && data.data.socket) {
            wsRef.current = connectPterodactylWebsocket(data.data.socket.replace('192.168.0.129', '10.0.0.2'), data.data.token, (msg) => {   //FOR REMOTE
            //wsRef.current = connectPterodactylWebsocket(data.data.socket, data.data.token, (msg) => { //PLACEHOLDER for local connection
              if (msg.event === 'stats' && msg.args && msg.args[0]) {
                try {
                  const stats = JSON.parse(msg.args[0]);
                  setPteroStats(stats);
                  const now = Date.now();
                  // Use rx_bytes/tx_bytes if available, else fallback to network_rx_bytes/network_tx_bytes
                  const incoming = stats.network.rx_bytes ?? 0;
                  const outgoing = stats.network.tx_bytes ?? 0;
                  traffic.push({ time: now, incoming, outgoing });
                  // Keep only last minute
                  traffic = traffic.filter(t => now - t.time < 60000);
                  setTrafficStats([...traffic]);
                  console.log('WebSocket stats:', { incoming, outgoing, traffic });
                } catch {}
              }
              if (msg.event === 'status' && msg.args) {
                setPteroStats((prev) => ({ ...prev, state: msg.args[0] }));
              }
              if (msg.event === 'console output' && msg.args && msg.args[0]) {
                setConsoleLogs((prev) => [...prev, msg.args[0]]);
              }
            });
          }
        });
        return () => {
          if (wsRef.current) wsRef.current.close();
        };
      }
    }, [serverId, isExpanded, server.tag]);

    // Auto-scroll console output to bottom when new logs arrive
    useEffect(() => {
      if (consoleOutputRef.current) {
        consoleOutputRef.current.scrollTop = consoleOutputRef.current.scrollHeight;
      }
      // Send new logs to popup window if open
      if (popupRef.current && !popupRef.current.closed) {
        const lastLine = consoleLogs[consoleLogs.length - 1];
        if (lastLine) {
          popupRef.current.postMessage({ type: 'console-log', line: lastLine }, '*');
        }
      }
    }, [consoleLogs]);

    // Open console in new window
    const openConsoleWindow = () => {
      const win = window.open('', '_blank', 'width=600,height=400');
      if (win) {
        popupRef.current = win;
        win.document.write(`
          <html>
          <head>
            <title>${server.name} Console</title>
            <link rel="icon" href="data:image/png;base64,iVBORw0KGgo=" />
            <style>
              body { background:#222; color:#eee; font-family:monospace; font-size:13px; padding:8px; margin:0; }
              #console-output { position: absolute; top: 48px; left: 8px; right: 8px; bottom: 56px; overflow-y: auto; border-radius: 4px; background: #222; padding: 8px; border: 1px solid #444; margin-bottom: 0; word-break: break-all; }
              #console-form { position: absolute; left: 8px; right: 8px; bottom: 8px; display: flex; gap: 8px; }
              #console-input { flex: 1; padding: 6px; border-radius: 4px; border: 1px solid #444; background: #111; color: #eee; }
              #console-form button { width: 80px; }
              h2 { margin-top: 0; margin-bottom: 4px; }
              .console-desc { margin-bottom: 8px; color: #aaa; font-size: 12px; }
            </style>
          </head>
          <body>
            <h2>${server.name} Console</h2>
            <div id="console-output"></div>
            <form id="console-form">
              <input id="console-input" type="text" placeholder="Type command..." />
              <button type="submit">Send</button>
            </form>
            <script>
              const input = document.getElementById('console-input');
              const form = document.getElementById('console-form');
              const out = document.getElementById('console-output');
              form.addEventListener('submit', function(e) {
                e.preventDefault();
                window.opener.postMessage({ type: 'send-console-command', serverId: '${serverId}', command: input.value }, '*');
                input.value = '';
              });
              window.addEventListener('message', function(e) {
                if (e.data && e.data.type === 'console-log') {
                  out.innerHTML += '<div>' + e.data.line + '</div>';
                  out.scrollTop = out.scrollHeight;
                }
                if (e.data && e.data.type === 'console-init') {
                  out.innerHTML = e.data.lines.map(line => '<div>' + line + '</div>').join('');
                  out.scrollTop = out.scrollHeight;
                }
              });
            </script>
          </body></html>
        `);
        // Send initial logs
        setTimeout(() => {
          win.postMessage({ type: 'console-init', lines: consoleLogs }, '*');
        }, 200);
      }
    };

    // Listen for console command from popup
    useEffect(() => {
      const handler = (e) => {
        if (e.data && e.data.type === 'send-console-command' && e.data.serverId === serverId) {
          if (wsRef.current) {
            wsRef.current.send(JSON.stringify({ event: 'send command', args: [e.data.command] }));
          }
        }
      };
      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
    }, [serverId]);

    // Send command to server console
    const sendConsoleCommand = (e) => {
      e.preventDefault();
      if (wsRef.current && consoleInput.trim()) {
        wsRef.current.send(JSON.stringify({ event: 'send command', args: [consoleInput] }));
        setConsoleInput('');
      }
    };

    // Send power action (start/stop)
    const sendPowerAction = (action) => {
      if (wsRef.current) {
        wsRef.current.send(JSON.stringify({ event: 'set state', args: [action] }));
      }
    };

    return (
      <div>
        <div className="server-header">
          <div className="server-info">
            <div className="server-icon">
              <Server size={24} />
            </div>
            <div className="server-details">
              <h3 className="server-name">{server.name}</h3>
              <p className="server-description">{server.description}</p>
              <div className="server-meta">
                <span className="server-game">{server.gameType || server.game}</span>
                {/*
                This is commented out to avoid showing player count for now //TO BE IMPLEMENTED
                <span className="server-players">
                  <Users size={16} />
                  {(server.currentPlayers ?? server.players)}/{server.maxPlayers ?? server.maxPlayers ?? 0}
                </span>*/}
              </div>
              {UserIsAdmin && (
                <div className="server-id" style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                  <strong>ID:</strong> {serverId}
                </div>
              )}
            </div>
          </div>
          <div className="server-actions">
            {server.tag === 'green' && (
              <span className="server-tag green"></span>
            )}
            <div className="connection-info">
              <span className="connection-address">{connectionString}</span>
              <button 
                className="btn btn-secondary copy-btn"
                onClick={() => { copyToClipboard(connectionString); console.log(connectionString); }}
                title="Copy connection address"
              >
                <Copy size={16} />
              </button>
            </div>
            {hasAccess && (
              <>
                <button
                  className="btn btn-primary expand-btn"
                  onClick={() => toggleServerExpansion(serverId)}
                >
                  <Settings size={16} />
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </>
            )}
          </div>
        </div>

        {hasAccess && isExpanded && (
          <div className="server-controls">
            <div className="control-section">
              <h4>Server Management</h4>
              <div className="control-buttons">
                {server.tag === 'green' ? (
                  <>
                    <button
                      className="btn btn-success"
                      onClick={() => sendPowerAction('start')}
                      disabled={pteroStats?.state === 'running'}
                    >
                      <Play size={16} />
                      Start Server
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => sendPowerAction('stop')}
                      disabled={pteroStats?.state !== 'running'}
                    >
                      <Pause size={16} />
                      Stop Server
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="btn btn-success"
                      onClick={() => updateServerStatus(serverId, true)}
                      disabled={server.isActive}
                    >
                      <Play size={16} />
                      Start Server
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => updateServerStatus(serverId, false)}
                      disabled={!server.isActive}
                    >
                      <Pause size={16} />
                      Stop Server
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="control-section">
              <h4>Server Statistics</h4>
              <div className="stats-grid">
                <div className="stat-item">
                  <BarChart3 size={20} />
                  <div>
                    <span className="stat-label">CPU Usage</span>
                    <span className="stat-value">
                      {server.tag === 'green' && pteroStats ? `${(pteroStats.cpu_absolute ?? 0).toFixed(2)}%` : '45%'}
                    </span>
                  </div>
                </div>
                <div className="stat-item">
                  <Users size={20} />
                  <div>
                    <span className="stat-label">Memory Usage</span>
                    <span className="stat-value">
                      {server.tag === 'green' && pteroStats ? `${Math.round((pteroStats.memory_bytes ?? 0) / 1024 / 1024)} MB` : (server.currentPlayers ?? 0)}
                    </span>
                  </div>
                </div>
                <div className="stat-item">
                  <Shield size={20} />
                  <div>
                    <span className="stat-label">Status</span>
                    <span className={`stat-value ${server.tag === 'green' && pteroStats ? pteroStats.state : (server.isActive ? 'online' : 'offline')}`}>
                      {server.tag === 'green' && pteroStats ? pteroStats.state : (server.isActive ? 'Online' : 'Offline')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {server.tag === 'green' && (
              <div className="control-section">
                <h4>Console</h4>
                <div ref={consoleOutputRef} className="console-output" style={{ background: '#222', color: '#eee', padding: '8px', height: '180px', width: '100%', overflowY: 'auto', fontFamily: 'monospace', fontSize: '13px', borderRadius: '4px', marginBottom: '8px', wordBreak: 'break-all' }}>
                  {consoleLogs.length === 0 ? (
                    <div style={{ color: '#888' }}>No logs yet.</div>
                  ) : (
                    consoleLogs.map((line, idx) => <div key={idx}>{line}</div>)
                  )}
                </div>
                <form onSubmit={sendConsoleCommand} style={{ display: 'flex', gap: '8px', width: '100%' }}>
                  <input
                    type="text"
                    value={consoleInput}
                    onChange={e => setConsoleInput(e.target.value)}
                    placeholder="Type command..."
                    style={{ flex: 1, padding: '6px', borderRadius: '4px', border: '1px solid #444', background: '#111', color: '#eee' }}
                  />
                  <button className="btn btn-outline" type="submit" disabled={!consoleInput.trim()} style={{ width: 80 }}>
                    Send
                  </button>
                </form>
              </div>
            )}

            <div className="control-section">
              <h4>Quick Actions</h4>
            <div className="quick-actions">
              <button className="btn btn-outline" onClick={server.tag === 'green' ? openConsoleWindow : undefined}>
                <ExternalLink size={16} />
                Console
              </button>
              <button className="btn btn-outline" onClick={() => setAnalyticsOverlay({ open: true, serverId: server._id || server.id })}>
                <BarChart3 size={16} />
                Analytics
              </button>
              <button className="btn btn-outline" onClick={() => setSettingsOverlay({ open: true, server, trafficStats })}>
                <Settings size={16} />
                Settings
              </button>
            </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    try {
      const serverToUpdate = settingsOverlay.server;
      const updateData = {
        name: e.target.name.value,
        description: e.target.description.value,
        address: e.target.address.value,
        port: e.target.port.value
      };

      let serverId;
      let endpoint;

      if (serverToUpdate.tag === 'green') {
        // For Pterodactyl servers, extract the actual ID and add pterodactylId
        serverId = serverToUpdate.id.replace('ptero-', '');
        endpoint = `/api/servers/${serverId}`;
        updateData.pterodactylId = serverId;
      } else {
        // For local servers, update directly
        serverId = serverToUpdate._id;
        endpoint = `/api/servers/${serverId}`;
      }
      
      await axios.put(endpoint, updateData);
      
      // Update local state
      setServers(prev => prev.map(server => {
        const currentServerId = server._id || server.id;
        if (currentServerId === (serverToUpdate.tag === 'green' ? serverToUpdate.id : serverId)) {
          return { 
            ...server, 
            name: updateData.name,
            description: updateData.description,
            connectionInfo: {
              ...server.connectionInfo,
              ip: updateData.address,
              port: updateData.port
            }
          };
        }
        return server;
      }));
      
      setSettingsOverlay({ open: false, server: null });
      toast.success('Server settings updated successfully');
      fetchServers(); // Refresh to get updated data from server
    } catch (error) {
      console.error('Error updating server:', error);
      toast.error('Failed to update server settings');
    }
  };

  if (loading) {
    return (
      <div className="servers-container">
        <div className="container">
          <div className="loading-state">
            <div className="loading"></div>
            <p>Loading servers...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="servers-container">
      <div className="container">
        <div className="servers-header">
          <h1>Game Servers</h1>
          <p>
            {user ? 
              `Welcome back, ${user.username}! Here are the available game servers.` :
              'Browse our available game servers. Sign in to access server management features.'
            }
          </p>
          {UserIsAdmin && (
            <button className="btn btn-success" onClick={() => setShowAddForm(!showAddForm)}>
              {showAddForm ? 'Cancel' : 'Add Server'}
            </button>
          )}
        </div>

        {showAddForm && UserIsAdmin && (
          <form className="add-server-form" onSubmit={handleAddServer} style={{ marginBottom: 24 }}>
            <h3>Add New Server</h3>
            <div className="form-group">
              <input type="text" name="name" value={addForm.name} onChange={handleAddFormChange} placeholder="Server Name" required />
            </div>
            <div className="form-group">
              <input type="text" name="description" value={addForm.description} onChange={handleAddFormChange} placeholder="Description" />
            </div>
            <div className="form-group">
              <input type="text" name="address" value={addForm.address} onChange={handleAddFormChange} placeholder="IP Address or Hostname" required />
            </div>
            <div className="form-group">
              <input type="number" name="port" value={addForm.port} onChange={handleAddFormChange} placeholder="Port" required />
            </div>
            <div className="form-group">
              <input type="text" name="gameType" value={addForm.gameType} onChange={handleAddFormChange} placeholder="Game Type" required />
            </div>
            <div className="form-group">
              <input type="number" name="maxPlayers" value={addForm.maxPlayers} onChange={handleAddFormChange} placeholder="Max Players" required />
            </div>
            <button className="btn btn-primary" type="submit">Add Server</button>
          </form>
        )}
        {!servers || servers.length === 0 ? (
          <div className="empty-state">
            <Server size={64} />
            <h3>No Servers Available</h3>
            <p>There are currently no game servers available. Check back later!</p>
          </div>
        ) : (
          <div className="servers-grid">
            {servers.map(server => (
              <ServerCard key={server.id} server={server} />
            ))}
          </div>
        )}
        {/* Settings Overlay */}
        {settingsOverlay.open && settingsOverlay.server && (
          <div className="overlay settings-overlay" style={{ position: 'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ background:'#222', color:'#eee', padding:32, borderRadius:8, minWidth:320, maxWidth:400 }}>
              <h2>Edit Server Settings</h2>
              <form onSubmit={handleSettingsSubmit}>
                <div className="form-group">
                  <label>Name</label>
                  <input name="name" defaultValue={settingsOverlay.server.name} required />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <input name="description" defaultValue={settingsOverlay.server.description} />
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <input name="address" defaultValue={settingsOverlay.server.connectionInfo?.ip || settingsOverlay.server.address || ''} required />
                </div>
                <div className="form-group">
                  <label>Port</label>
                  <input name="port" defaultValue={settingsOverlay.server.connectionInfo?.port || settingsOverlay.server.port || ''} />
                </div>
                <div style={{ display:'flex', gap:12, marginTop:16 }}>
                  <button className="btn btn-primary" type="submit">Save</button>
                  <button className="btn btn-outline" type="button" onClick={() => setSettingsOverlay({ open: false, server: null })}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Analytics Overlay */}
        {analyticsOverlay.open && analyticsOverlay.serverId && (() => {
          // Find the currently expanded server card
          const selectedServer = servers.find(s => (s._id || s.id) === analyticsOverlay.serverId);
          // Only show live trafficStats if the server is expanded and is a Pterodactyl server
          let trafficStats = [];
          if (selectedServer && selectedServer.tag === 'green' && expandedServer === analyticsOverlay.serverId) {
            // We need to get the live trafficStats from the expanded ServerCard
            // Since ServerCard is a function component, we can't directly access its state
            // For now, show a message to expand the server for live data
            // For a full solution, trafficStats should be managed at parent level
          }
          return (
            <div className="overlay analytics-overlay" style={{ position: 'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.7)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ background:'#222', color:'#eee', padding:32, borderRadius:8, minWidth:320, maxWidth:500 }}>
                <h2>Network Traffic (Last 1 Minute)</h2>
                <div style={{ height:220, width:'100%', background:'#111', borderRadius:8, padding:8, marginBottom:16 }}>
                  {selectedServer && selectedServer.tag === 'green' && expandedServer === analyticsOverlay.serverId ? (
                    <TrafficGraph trafficStats={trafficStats} />
                  ) : (
                    <div style={{ color:'#888', textAlign:'center', marginTop:80 }}>Expand the server to view live traffic data.</div>
                  )}
                </div>
                <button className="btn btn-outline" type="button" onClick={() => setAnalyticsOverlay({ open: false, serverId: null })}>Close</button>
              </div>
            </div>
          );
        })()}

        {/* Contact section for non-logged-in users */}
        {!user && (
          <div className="auth-prompt">
            <div className="auth-prompt-content">
              <h3>Want to manage servers?</h3>
              <p>Sign in to access server management features and control panels.</p>
              <p className="contact-us">
                Contact us for access to your very own server!
              </p>
              <button
                className="btn btn-outline"
                type="button"
                onClick={() => {
                  // This will open the user's email client with a pre-filled subject and body
                  window.location.href = "mailto:team@example.com?subject=Server%20Access%20Request&body=Hi%20Team,%0A%0AI%20would%20like%20to%20request%20access%20to%20a%20server.%0A%0AThanks!";
                }}
              >
                Contact Team
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Servers;
