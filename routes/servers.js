const axios = require('axios');
const express = require('express');
const Server = require('../models/Server');
const User = require('../models/User');
const { auth, optionalAuth } = require('../middleware/auth');
const router = express.Router();

// GET /api/servers/pterodactyl - fetch servers from Pterodactyl
router.get('/pterodactyl', optionalAuth, async (req, res) => {
  try {
    // Replace with your Pterodactyl panel URL
    const panelUrl = 'http://192.168.0.129'; // <-- CHANGE THIS TO YOUR PANEL URL
    const apiKey = process.env.API_KEY;
    console.log('Used key:', apiKey);
    const response = await axios.get(`${panelUrl}/api/application/servers`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'Application/vnd.pterodactyl.v1+json',
        'Content-Type': 'application/json'
      }
    });
    const servers = (response.data.data || []).map(item => {
      const s = item.attributes;
      return {
        id: `ptero-${s.identifier}`,
        name: s.name,
        game: s.node || 'Pterodactyl',
        status: 'online',
        players: 0,
        maxPlayers: 0,
        description: s.description || 'Pterodactyl server',
        connectionInfo: {
          ip: s.sftp_details?.ip || '',
          port: s.sftp_details?.port || '',
          hasAdminAccess: req.user.role === 'admin'
        },
        createdAt: s.created_at,
        tag: 'green'
      };
    });
    res.json({ servers });
  } catch (error) {
    console.error('Pterodactyl API error:', error?.response?.data || error.message);
    res.status(500).json({ message: 'Failed to fetch Pterodactyl servers' });
  }
});

// Get all servers
router.get('/', optionalAuth, async (req, res) => {
  try {
    const servers = await Server.find({});
    // Map to client format
    const filteredServers = servers.map(server => {
      const hasAccess = req.user && (
        req.user.role === 'admin' ||
        (server.adminUsers || []).some(adminId => String(adminId) === String(req.user._id)) ||
        (req.user.serverAccess || []).some(sid => String(sid) === String(server._id))
      );
      return {
        id: server._id,
        name: server.name,
        game: server.gameType,
        status: server.isActive ? 'online' : 'offline',
        players: server.currentPlayers,
        maxPlayers: server.maxPlayers,
        description: server.description,
        connectionInfo: {
          ip: server.address,
          port: server.port,
          hasAdminAccess: hasAccess
        },
        createdAt: server.createdAt
      };
    });
    res.json({ servers: filteredServers });
  } catch (error) {
    console.error('Get servers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get server by ID
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const server = await Server.findById(req.params.id);
    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }
    const hasAccess = req.user && (
      req.user.role === 'admin' ||
      (server.adminUsers || []).some(adminId => String(adminId) === String(req.user._id)) ||
      (req.user.serverAccess || []).some(sid => String(sid) === String(server._id))
    );
    const filteredServer = {
      id: server._id,
      name: server.name,
      game: server.gameType,
      status: server.isActive ? 'online' : 'offline',
      players: server.currentPlayers,
      maxPlayers: server.maxPlayers,
      description: server.description,
      connectionInfo: {
        ip: server.address,
        port: server.port,
        hasAdminAccess: hasAccess
      },
      createdAt: server.createdAt
    };
    res.json({ server: filteredServer });
  } catch (error) {
    console.error('Get server error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new server (admin only)
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const serverData = {
      ...req.body,
      adminUsers: [req.user.username],
      status: 'online',
      players: 0
    };

    const server = new Server({
      ...serverData,
      adminUsers: [req.user._id]
    });
    await server.save();
    res.status(201).json({ message: 'Server created successfully', server });
  } catch (error) {
    console.error('Create server error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update server
router.put('/:id', auth, async (req, res) => {
  try {
    const server = await Server.findById(req.params.id);
    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }
    const hasAdminAccess = req.user.role === 'admin' || (server.adminUsers || []).some(adminId => String(adminId) === String(req.user._id));
    if (!hasAdminAccess) {
      return res.status(403).json({ message: 'Admin access required for this server' });
    }
    Object.assign(server, req.body);
    await server.save();
    res.json({ message: 'Server updated successfully', server });
  } catch (error) {
    console.error('Update server error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete server (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const deletedServer = await Server.findByIdAndDelete(req.params.id);
    if (!deletedServer) {
      return res.status(404).json({ message: 'Server not found' });
    }
    res.json({ message: 'Server deleted successfully' });
  } catch (error) {
    console.error('Delete server error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Server control actions (admin users only)
router.post('/:id/control', auth, async (req, res) => {
  try {
    const server = await Server.findById(req.params.id);
    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }
    const hasAdminAccess = req.user.role === 'admin' || (server.adminUsers || []).some(adminId => String(adminId) === String(req.user._id));
    if (!hasAdminAccess) {
      return res.status(403).json({ message: 'Admin access required for this server' });
    }
    const { action } = req.body;
    let newStatus = server.isActive;
    switch (action) {
      case 'start':
        newStatus = true;
        break;
      case 'stop':
        newStatus = false;
        break;
      case 'restart':
        newStatus = false;
        setTimeout(async () => {
          await Server.findByIdAndUpdate(req.params.id, { isActive: true });
        }, 5000);
        break;
      default:
        return res.status(400).json({ message: 'Invalid action' });
    }
    server.isActive = newStatus;
    await server.save();
    res.json({ message: `Server ${action} initiated`, server });
  } catch (error) {
    console.error('Server control error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
