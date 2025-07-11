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
  const { user, hasServerAccess } = useAuth();

  useEffect(() => {
    fetchServers();
  }, []);

  const fetchServers = async () => {
    try {
      const response = await axios.get('/api/servers');
      setServers(response.data.servers || []);
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
    const hasAccess = hasServerAccess(server._id);
    const isExpanded = expandedServer === server._id;
    const connectionString = `${server.address}:${server.port}`;

    return (
      <div className="server-card">
        <div className="server-header">
          <div className="server-info">
            <div className="server-icon">
              <Server size={24} />
            </div>
            <div className="server-details">
              <h3 className="server-name">{server.name}</h3>
              <p className="server-description">{server.description}</p>
              <div className="server-meta">
                <span className="server-game">{server.gameType}</span>
                <span className="server-players">
                  <Users size={16} />
                  {server.currentPlayers}/{server.maxPlayers}
                </span>
              </div>
            </div>
          </div>
          
          <div className="server-actions">
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
        </div>

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
