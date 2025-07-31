const express = require('express');
const ProfilePicture = require('../models/ProfilePicture');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Default profile picture as a small, optimized Base64 image
const DEFAULT_PROFILE_PICTURE = {
  imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAZAAAAGQCAYAAACAvzbMAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAASXSURBVHgB7doxAQAAAMKg9U9tCF8gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAeAMlJgABjsLKDAAAAAElFTkSuQmCC',
  mimeType: 'image/png',
  filename: 'default.png',
  fileSize: 1024
};

// Upload/Update profile picture
router.post('/upload', auth, async (req, res) => {
  try {
    const { imageData, mimeType, filename, fileSize } = req.body;
    
    // Validate input
    if (!imageData || !mimeType || !filename) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: imageData, mimeType, filename'
      });
    }

    // Validate file size (8MB limit for Base64 data)
    const maxBase64Size = 8 * 1024 * 1024; // 8MB
    if (imageData.length > maxBase64Size) {
      return res.status(400).json({
        success: false,
        message: 'Image data too large. Maximum size is 8MB for Base64 encoded images.'
      });
    }

    // Validate file size (2MB limit for original file size estimation)
    if (fileSize > 2097152) {
      return res.status(400).json({
        success: false,
        message: 'File size exceeds 2MB limit'
      });
    }

    // Validate MIME type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(mimeType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file type. Only PNG and JPEG files are allowed'
      });
    }

    // Validate Base64 format
    if (!imageData.startsWith('data:image/')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid image data format'
      });
    }

    const userId = req.user.userId || req.user._id;

    // Check if user already has a profile picture
    let profilePicture = await ProfilePicture.findOne({ userId });

    if (profilePicture) {
      // Update existing profile picture
      profilePicture.imageData = imageData;
      profilePicture.mimeType = mimeType;
      profilePicture.filename = filename;
      profilePicture.fileSize = fileSize;
      profilePicture.dimensions = { width: 400, height: 400 };
      await profilePicture.save();
    } else {
      // Create new profile picture
      profilePicture = new ProfilePicture({
        userId,
        imageData,
        mimeType,
        filename,
        fileSize,
        dimensions: { width: 400, height: 400 }
      });
      await profilePicture.save();

      // Update user reference
      await User.findByIdAndUpdate(userId, { profilePicture: profilePicture._id });
    }

    res.json({
      success: true,
      message: 'Profile picture uploaded successfully',
      profilePicture: {
        id: profilePicture._id,
        imageData: profilePicture.imageData,
        mimeType: profilePicture.mimeType,
        filename: profilePicture.filename,
        fileSize: profilePicture.fileSize,
        dimensions: profilePicture.dimensions
      }
    });

  } catch (error) {
    console.error('Profile picture upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload profile picture'
    });
  }
});

// Get profile picture
router.get('/:userId?', async (req, res) => {
  try {
    const userId = req.params.userId || (req.user ? (req.user.userId || req.user._id) : null);
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }

    const profilePicture = await ProfilePicture.findOne({ userId });
    
    if (!profilePicture) {
      // Return default profile picture
      return res.json({
        success: true,
        profilePicture: {
          id: null,
          imageData: DEFAULT_PROFILE_PICTURE.imageData,
          mimeType: DEFAULT_PROFILE_PICTURE.mimeType,
          filename: DEFAULT_PROFILE_PICTURE.filename,
          fileSize: DEFAULT_PROFILE_PICTURE.fileSize,
          dimensions: { width: 400, height: 400 },
          isDefault: true
        }
      });
    }

    res.json({
      success: true,
      profilePicture: {
        id: profilePicture._id,
        imageData: profilePicture.imageData,
        mimeType: profilePicture.mimeType,
        filename: profilePicture.filename,
        fileSize: profilePicture.fileSize,
        dimensions: profilePicture.dimensions,
        isDefault: false
      }
    });

  } catch (error) {
    console.error('Get profile picture error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile picture'
    });
  }
});

// Delete profile picture
router.delete('/', auth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user._id;
    
    const profilePicture = await ProfilePicture.findOneAndDelete({ userId });
    
    if (!profilePicture) {
      return res.status(404).json({
        success: false,
        message: 'No profile picture found'
      });
    }

    // Remove reference from user
    await User.findByIdAndUpdate(userId, { profilePicture: null });

    res.json({
      success: true,
      message: 'Profile picture deleted successfully'
    });

  } catch (error) {
    console.error('Delete profile picture error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete profile picture'
    });
  }
});

module.exports = router;
