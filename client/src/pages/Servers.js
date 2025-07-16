import React, { useState, useEffect } from 'react';
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

const Servers = () => {
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedServer, setExpandedServer] = useState(null);
  const { user, hasServerAccess, isAdmin } = useAuth();
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

    return (
      <div className={`server-card${server.tag === 'green' ? ' ptero-server' : ''}`}>
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
                <span className="server-players">
                  <Users size={16} />
                  {(server.currentPlayers ?? server.players)}/{server.maxPlayers ?? server.maxPlayers ?? 0}
                </span>
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
                onClick={() => toggleServerExpansion(server._id)}
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
                <button
                  className="btn btn-success"
                  onClick={() => updateServerStatus(server._id, true)}
                  disabled={server.isActive}
                >
                  <Play size={16} />
                  Start Server
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => updateServerStatus(server._id, false)}
                  disabled={!server.isActive}
                >
                  <Pause size={16} />
                  Stop Server
                </button>
              </div>
            </div>

            <div className="control-section">
              <h4>Server Statistics</h4>
              <div className="stats-grid">
                <div className="stat-item">
                  <BarChart3 size={20} />
                  <div>
                    <span className="stat-label">CPU Usage</span>
                    <span className="stat-value">45%</span>
                  </div>
                </div>
                <div className="stat-item">
                  <Users size={20} />
                  <div>
                    <span className="stat-label">Active Players</span>
                    <span className="stat-value">{server.currentPlayers}</span>
                  </div>
                </div>
                <div className="stat-item">
                  <Shield size={20} />
                  <div>
                    <span className="stat-label">Status</span>
                    <span className={`stat-value ${server.isActive ? 'online' : 'offline'}`}>
                      {server.isActive ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="control-section">
              <h4>Quick Actions</h4>
              <div className="quick-actions">
                <button className="btn btn-outline">
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
          {isAdmin && (
            <button className="btn btn-success" onClick={() => setShowAddForm(!showAddForm)}>
              {showAddForm ? 'Cancel' : 'Add Server'}
            </button>
          )}
        </div>

        {showAddForm && isAdmin && (
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
              <div className="auth-prompt-actions">
                <a href="/login" className="btn btn-primary">Sign In</a>
                <a href="/register" className="btn btn-outline">Create Account</a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Servers;
