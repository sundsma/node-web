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

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Copied to clipboard!');
    }).catch(() => {
      toast.error('Failed to copy to clipboard');
    });
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
    const connectionString = `${server.connectionInfo?.ip || ''}:${server.connectionInfo?.port || ''}`;

    // Real-time stats and console for Pterodactyl servers
    const [pteroStats, setPteroStats] = useState(null);
    const [consoleLogs, setConsoleLogs] = useState([]);
    const [consoleInput, setConsoleInput] = useState('');
    const wsRef = useRef(null);
    const consoleOutputRef = useRef(null);
    // Track popup window for live updates
    const popupRef = useRef(null);

    useEffect(() => {
      if (server.tag === 'green' && isExpanded) {
        axios.get(`/api/servers/pterodactyl/${serverId.replace('ptero-', '')}/websocket`).then(res => {
          const { data } = res;
          // replace the ip in the data socket to remote address //PLACEHOLDER
          if (data && data.data && data.data.token && data.data.socket) {
            wsRef.current = connectPterodactylWebsocket(data.data.socket.replace('192.168.0.129', '10.0.0.2'), data.data.token, (msg) => {
              if (msg.event === 'stats' && msg.args && msg.args[0]) {
                try {
                  setPteroStats(JSON.parse(msg.args[0]));
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
            <\/script>
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
            </div>
          </div>
          
      <div className="server-actions">
        {server.tag === 'green' && (
          <span className="server-tag green">Pterodactyl</span>
        )}
            <div className="connection-info">
              <span className="connection-address">{connectionString}</span>
              <button 
                className="btn btn-secondary copy-btn"
                onClick={() => copyToClipboard(connectionString)}
                title="Copy connection address"
              >
                <Copy size={16} />
              </button>
            </div>
            
            {hasAccess && (
              <button
                className="btn btn-primary expand-btn"
                onClick={() => toggleServerExpansion(serverId)}
              >
                <Settings size={16} />
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
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
                <button className="btn btn-outline">
                  <BarChart3 size={16} />
                  Analytics
                </button>
                <button className="btn btn-outline">
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

        {!user && (
          <div className="auth-prompt">
            <div className="auth-prompt-content">
              <h3>Want to manage servers?</h3>
              <p>Sign in to access server management features and control panels.</p>
              <p className="contact-us">
                Contact Us for access to your very own server!
              </p>
              <button
                className="btn btn-outline"
                type="button"
                onClick={() => {
                  // This will open the user's email client with a pre-filled subject and body
                  window.location.href = "mailto:team@example.com?subject=Server%20Access%20Request&body=Hi%20Team,%0A%0AI%20would%20like%20to%20request%20access%20to%20a%20server.%20Please%20contact%20me%20with%20more%20info.%0A%0AThanks!";
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
