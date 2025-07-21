const mongoose = require('mongoose');

const serverSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    required: function() {
      // Only require address if this is not a Pterodactyl override
      return !this.pterodactylId;
    },
    trim: true
  },
  port: {
    type: Number,
    required: function() {
      // Only require port if this is not a Pterodactyl override
      return !this.pterodactylId;
    }
  },
  gameType: {
    type: String,
    required: true,
    trim: true
  },
  maxPlayers: {
    type: Number,
    default: 0
  },
  currentPlayers: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  adminUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  pterodactylId: {
    type: String,
    trim: true,
    index: true  // Add index for faster lookups
  },
  settings: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Server', serverSchema);
