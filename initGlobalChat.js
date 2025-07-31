const mongoose = require('mongoose');
const ChatThread = require('./models/ChatThread');
const User = require('./models/User');
require('dotenv').config();

async function initializeGlobalChat() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Check if global thread already exists
    const existingGlobalThread = await ChatThread.findOne({ type: 'global' });
    
    if (existingGlobalThread) {
      console.log('Global chat thread already exists');
      return;
    }

    // Find an admin user to be the creator (or create a system user)
    let adminUser = await User.findOne({ role: 'admin' });
    
    if (!adminUser) {
      // Create a system user if no admin exists
      adminUser = new User({
        username: 'System',
        email: 'system@tgsu.com',
        password: 'system123', // This will be hashed
        role: 'admin'
      });
      await adminUser.save();
      console.log('Created system user for global chat');
    }

    // Create global chat thread
    const globalThread = new ChatThread({
      title: 'Global Chat',
      description: 'Welcome to the TGSU global chat! Connect with all community members here.',
      type: 'global',
      creator: adminUser._id,
      participants: [], // Global threads don't need explicit participants
      isPinned: true
    });

    await globalThread.save();
    console.log('Global chat thread created successfully');

  } catch (error) {
    console.error('Error initializing global chat:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the initialization
initializeGlobalChat();
