
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const mongoose = require('mongoose');
const http = require('http');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Only apply rate limiting in production
if (process.env.NODE_ENV === 'production') {
  // General rate limiting
  const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests from this IP, please try again later.'
    }
  });

  // More lenient rate limiting for chat routes
  const chatLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // higher limit for chat functionality
    message: {
      error: 'Too many chat requests, please slow down a bit.'
    }
  });

  // Middleware
  app.use('/api/chat', chatLimiter); // Apply lenient limiter to chat routes first
  app.use(generalLimiter); // Apply general limiter to all other routes
}
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Increased limit for Base64 images
app.use(express.urlencoded({ limit: '10mb', extended: true })); // Also increase URL-encoded limit


// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });

// Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'Server is running',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected (MongoDB)' : 'Not connected'
  });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/servers', require('./routes/servers'));
app.use('/api/events', require('./routes/events'));
app.use('/api/newsletter', require('./routes/newsletter'));
app.use('/api/profile-picture', require('./routes/profilePicture'));
app.use('/api/chat', require('./routes/chat'));

// Serve static files from the React app
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
  });
}

// Error handling middleware
app.use((error, req, res, next) => {
  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Request payload too large. Please use a smaller image (max 8MB).'
    });
  }
  next(error);
});

const port = process.env.PORT || 5000;

// Create WebSocket server
const wss = new WebSocket.Server({ server });

// Store connected clients with their user info
const clients = new Map();

wss.on('connection', (ws, req) => {
  console.log('🔌 New WebSocket connection from:', req.connection.remoteAddress);
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      
      if (data.event === 'auth') {
        // Authenticate the user
        const token = data.args[0];
        if (!token) {
          console.log('❌ No token provided');
          ws.send(JSON.stringify({ event: 'error', data: 'No token provided' }));
          return;
        }
        
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const User = require('./models/User');
          const user = await User.findById(decoded.userId).select('-password');
          
          if (!user) {
            console.log('❌ Authentication failed: User not found');
            ws.send(JSON.stringify({ event: 'error', data: 'User not found' }));
            return;
          }
          
          // Store client info
          clients.set(ws, { userId: user._id.toString(), username: user.username });
          console.log('✅ User authenticated:', user.username, '| Total clients:', clients.size);
          ws.send(JSON.stringify({ event: 'authenticated', data: { userId: user._id, username: user.username } }));
          
        } catch (error) {
          console.log('❌ Authentication failed:', error.message);
          ws.send(JSON.stringify({ event: 'error', data: 'Invalid token' }));
        }
      }
    } catch (error) {
      console.error('❌ WebSocket message error:', error);
    }
  });
  
  ws.on('close', () => {
    const clientInfo = clients.get(ws);
    clients.delete(ws);
    if (clientInfo) {
      console.log('🔌 User disconnected:', clientInfo.username, '| Total clients:', clients.size);
    }
  });
  
  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
});

// Function to broadcast new messages to relevant clients
function broadcastToThread(threadId, message, excludeUserId = null) {
  const messageData = {
    event: 'new_message',
    data: {
      threadId,
      message
    }
  };
  
  clients.forEach((clientInfo, ws) => {
    if (ws.readyState === WebSocket.OPEN && clientInfo.userId !== excludeUserId) {
      ws.send(JSON.stringify(messageData));
    }
  });
}

// Function to broadcast thread updates
function broadcastThreadUpdate(threadId, updateType, data) {
  const updateData = {
    event: 'thread_update',
    data: {
      threadId,
      updateType,
      ...data
    }
  };
  
  clients.forEach((clientInfo, ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(updateData));
    }
  });
}

// Make broadcast functions available to routes
app.locals.broadcastToThread = broadcastToThread;
app.locals.broadcastThreadUpdate = broadcastThreadUpdate;

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
