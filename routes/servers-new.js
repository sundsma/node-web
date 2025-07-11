const express = require('express');
const database = require('../db/database');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get all servers
router.get('/', async (req, res) => {
  try {
    const servers = await database.getAllServers();
    
    // Filter server data based on user permissions
    const filteredServers = servers.map(server => {
      const hasAccess = req.user && (
        req.user.role === 'admin' || 
        server.adminUsers.includes(req.user.username) ||
        req.user.serverAccess.includes(server.id)
      );

      return {
        id: server.id,
        name: server.name,
        game: server.game,
        status: server.status,
        players: server.players,
        maxPlayers: server.maxPlayers,
        description: server.description,
        connectionInfo: hasAccess ? {
          ip: server.ip,
          port: server.port,
          hasAdminAccess: server.adminUsers.includes(req.user?.username) || req.user?.role === 'admin'
        } : {
          ip: server.ip,
          port: server.port,
          hasAdminAccess: false
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
router.get('/:id', async (req, res) => {
  try {
    const server = await database.getServerById(req.params.id);
    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }

    const hasAccess = req.user && (
      req.user.role === 'admin' || 
      server.adminUsers.includes(req.user.username) ||
      req.user.serverAccess.includes(server.id)
    );

    const filteredServer = {
      id: server.id,
      name: server.name,
      game: server.game,
      status: server.status,
      players: server.players,
      maxPlayers: server.maxPlayers,
      description: server.description,
      connectionInfo: {
        ip: server.ip,
        port: server.port,
        hasAdminAccess: hasAccess && (server.adminUsers.includes(req.user?.username) || req.user?.role === 'admin')
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

    const server = await database.createServer(serverData);
    res.status(201).json({ message: 'Server created successfully', server });
  } catch (error) {
    console.error('Create server error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update server
router.put('/:id', auth, async (req, res) => {
  try {
    const server = await database.getServerById(req.params.id);
    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }

    // Check if user has admin access to this server
    const hasAdminAccess = req.user.role === 'admin' || server.adminUsers.includes(req.user.username);
    if (!hasAdminAccess) {
      return res.status(403).json({ message: 'Admin access required for this server' });
    }

    const updatedServer = await database.updateServer(req.params.id, req.body);
    res.json({ message: 'Server updated successfully', server: updatedServer });
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

    const deletedServer = await database.deleteServer(req.params.id);
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
    const server = await database.getServerById(req.params.id);
    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }

    // Check if user has admin access to this server
    const hasAdminAccess = req.user.role === 'admin' || server.adminUsers.includes(req.user.username);
    if (!hasAdminAccess) {
      return res.status(403).json({ message: 'Admin access required for this server' });
    }

    const { action } = req.body;
    let newStatus = server.status;

    switch (action) {
      case 'start':
        newStatus = 'online';
        break;
      case 'stop':
        newStatus = 'offline';
        break;
      case 'restart':
        newStatus = 'restarting';
        // In a real implementation, you would set it back to 'online' after restart
        setTimeout(async () => {
          await database.updateServer(req.params.id, { status: 'online' });
        }, 5000);
        break;
      default:
        return res.status(400).json({ message: 'Invalid action' });
    }

    const updatedServer = await database.updateServer(req.params.id, { status: newStatus });
    res.json({ message: `Server ${action} initiated`, server: updatedServer });
  } catch (error) {
    console.error('Server control error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
