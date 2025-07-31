const mongoose = require('mongoose');

const profilePictureSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  imageData: {
    type: String, // Base64 encoded image data
    required: true
  },
  mimeType: {
    type: String,
    enum: ['image/png', 'image/jpeg', 'image/jpg'],
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true,
    max: 2097152 // 2MB limit in bytes
  },
  dimensions: {
    width: {
      type: Number,
      default: 400
    },
    height: {
      type: Number,
      default: 400
    }
  }
}, {
  timestamps: true
});

// Index for faster user lookups
profilePictureSchema.index({ userId: 1 });

module.exports = mongoose.model('ProfilePicture', profilePictureSchema);
