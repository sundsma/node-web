const mongoose = require('mongoose');
require('dotenv').config();

// Simple migration script to add nameColor field to existing users
async function addNameColorToUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    const User = require('../models/User');
    
    // Update all users without nameColor to have the default blue color
    const result = await User.updateMany(
      { nameColor: { $exists: false } },
      { $set: { nameColor: '#3b82f6' } }
    );

    console.log(`Updated ${result.modifiedCount} users with default name color`);
    
    await mongoose.disconnect();
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

addNameColorToUsers();
