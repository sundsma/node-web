
const axios = require('axios');
const express = require('express');
const Server = require('../models/Server');
const User = require('../models/User');
const { auth, optionalAuth } = require('../middleware/auth');
const router = express.Router();

// GET /api/servers/pterodactyl - fetch servers from Pterodactyl
router.get('/pterodactyl', optionalAuth, async (req, res) => {
  try {
    const panelUrl = 'http://10.0.0.2';
    const apiKey = process.env.API_KEY;
    const response = await axios.get(`${panelUrl}/api/application/servers`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'Application/vnd.pterodactyl.v1+json',
        'Content-Type': 'application/json'
      }
    });
    // Get all custom servers from MongoDB that have pterodactylId
    const customServers = await Server.find({ pterodactylId: { $exists: true } });
    // Map by pterodactyl identifier for quick lookup
    const customServerMap = {};
    customServers.forEach(cs => {
      if (cs.pterodactylId) {
        customServerMap[cs.pterodactylId] = cs;
      }
    });
    const servers = (response.data.data || []).map(item => {
      const s = item.attributes;
      const custom = customServerMap[s.identifier];
      // Use custom connection info if present
      const ip = custom?.address || s.sftp_details?.ip || '';
      const port = custom?.port || s.sftp_details?.port || '';
      return {
        id: `ptero-${s.identifier}`,
        name: custom?.name || s.name,
        game: s.node || 'Pterodactyl',
        status: 'online',
        players: 0,
        maxPlayers: 0,
        description: custom?.description || s.description || 'Pterodactyl server',
        connectionInfo: {
          ip,
          port,
          hasAdminAccess: req.user && req.user.role === 'admin'
        },
        createdAt: s.created_at,
        tag: 'green',
        customConnection: !!custom // flag for UI
      };
    });
    res.json({ servers });
  } catch (error) {
    console.error('Pterodactyl API error:', error?.response?.data || error.message);
    res.status(500).json({ message: 'Failed to fetch Pterodactyl servers' });
  }
});

// GET /api/servers/pterodactyl/:id/websocket - fetch websocket credentials for a Pterodactyl server
router.get('/pterodactyl/:id/websocket', optionalAuth, async (req, res) => {
  try {
    //const panelUrl = 'http://192.168.0.129'; // <-- CHANGE THIS TO YOUR PANEL URL
    const panelUrl = 'http://10.0.0.2'; // <-- CHANGE THIS TO YOUR REMOTEPANEL URL //PLACEHOLDER
    const apiKey = process.env.API_KEY;
    const serverId = req.params.id;
    const response = await axios.get(`${panelUrl}/api/client/servers/${serverId}/websocket`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Pterodactyl websocket error:', error?.response?.data || error.message);
    res.status(500).json({ message: 'Failed to fetch websocket credentials' });
  }
});

// Get all servers
router.get('/', optionalAuth, async (req, res) => {
  try {
    // Only get servers that are NOT Pterodactyl overrides (exclude servers with pterodactylId)
    const servers = await Server.find({ pterodactylId: { $exists: false } });
    // Map to client format
    const filteredServers = servers.map(server => {
      const hasAccess = req.user && (
        req.user?.role === 'admin' ||
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
// Update server (also supports updating custom connection info for Pterodactyl servers)
router.put('/:id', auth, async (req, res) => {
  try {
    let server;
    
    // Check if this is a Pterodactyl server ID or if pterodactylId is provided
    if (req.body.pterodactylId) {
      // For Pterodactyl servers, find by pterodactylId first
      server = await Server.findOne({ pterodactylId: req.body.pterodactylId });
    } else {
      // For regular servers, try to find by MongoDB _id
      // Only attempt findById if the ID looks like a valid ObjectId (24 hex chars)
      if (/^[0-9a-fA-F]{24}$/.test(req.params.id)) {
        server = await Server.findById(req.params.id);
      }
    }
    
    // If not found and this looks like a Pterodactyl ID, create a new override record
    if (!server && req.body.pterodactylId) {
      server = new Server({
        pterodactylId: req.body.pterodactylId,
        name: req.body.name,
        description: req.body.description,
        address: req.body.address,
        port: req.body.port,
        adminUsers: [req.user._id], // Add current user as admin
        gameType: 'Pterodactyl',
        isActive: true,
        currentPlayers: 0,
        maxPlayers: 0
      });
    }
    
    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }
    const hasAdminAccess = req.user.role === 'admin' || (server.adminUsers || []).some(adminId => String(adminId) === String(req.user._id));
    if (!hasAdminAccess) {
      return res.status(403).json({ message: 'Admin access required for this server' });
    }
    
    // Update server properties
    if (req.body.name) server.name = req.body.name;
    if (req.body.description) server.description = req.body.description;
    if (req.body.address) server.address = req.body.address;
    if (req.body.port) server.port = req.body.port;
    
    // Apply any other fields from request body (excluding sensitive fields)
    const allowedFields = ['gameType', 'maxPlayers', 'isActive'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        server[field] = req.body[field];
      }
    });
    
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
