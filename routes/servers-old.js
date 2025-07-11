const express = require('express');
const mongoose = require('mongoose');
const Server = require('../models/Server');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get all servers
router.get('/', async (req, res) => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      return res.json([
        {
          _id: 'demo-1',
          name: 'Demo Gaming Server',
          description: 'A demonstration server for testing purposes',
          address: '192.168.1.100',
          port: 27015,
          gameType: 'Counter-Strike',
          maxPlayers: 32,
          currentPlayers: 12,
          isActive: true,
          adminUsers: []
        },
        {
          _id: 'demo-2',
          name: 'Minecraft Creative Server',
          description: 'Creative building server for Minecraft',
          address: '192.168.1.101',
          port: 25565,
          gameType: 'Minecraft',
          maxPlayers: 50,
          currentPlayers: 8,
          isActive: true,
          adminUsers: []
        }
      ]);
    }

    const servers = await Server.find({ isActive: true })
      .populate('adminUsers', 'username email')
      .select('-settings');
    
    // Filter sensitive information for non-admin users
    const filteredServers = servers.map(server => {
      const serverObj = server.toObject();
      
      // If user is not authenticated or not an admin of this server
      if (!req.user || !server.adminUsers.some(admin => admin._id.equals(req.user.id))) {
        delete serverObj.settings;
        delete serverObj.adminUsers;
      }
      
      return serverObj;
    });

    res.json(filteredServers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get servers with admin access for current user
router.get('/admin', auth, async (req, res) => {
  try {
    const servers = await Server.find({ 
      adminUsers: req.user.id,
      isActive: true 
    });
    
    res.json(servers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new server (admin only)
router.post('/', adminAuth, async (req, res) => {
  try {
    const { name, description, address, port, gameType, maxPlayers, adminUsers } = req.body;
    
    const server = new Server({
      name,
      description,
      address,
      port,
      gameType,
      maxPlayers,
      adminUsers: adminUsers || [req.user.id]
    });

    await server.save();
    await server.populate('adminUsers', 'username email');

    res.status(201).json(server);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update server (admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    const server = await Server.findById(req.params.id);
    
    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }

    // Check if user is admin of this server or site admin
    if (!server.adminUsers.includes(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { name, description, address, port, gameType, maxPlayers, currentPlayers, settings } = req.body;

    server.name = name || server.name;
    server.description = description || server.description;
    server.address = address || server.address;
    server.port = port || server.port;
    server.gameType = gameType || server.gameType;
    server.maxPlayers = maxPlayers !== undefined ? maxPlayers : server.maxPlayers;
    server.currentPlayers = currentPlayers !== undefined ? currentPlayers : server.currentPlayers;
    server.settings = settings || server.settings;

    await server.save();
    await server.populate('adminUsers', 'username email');

    res.json(server);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete server (admin only)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const server = await Server.findById(req.params.id);
    
    if (!server) {
      return res.status(404).json({ message: 'Server not found' });
    }

    server.isActive = false;
    await server.save();

    res.json({ message: 'Server deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
