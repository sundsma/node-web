const express = require('express');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Subscribe to newsletter
router.post('/subscribe', async (req, res) => {
  try {
    const { email } = req.body;
    
    let user = await User.findOne({ email });
    
    if (user) {
      user.newsletter = true;
      await user.save();
    } else {
      // Create a basic user for newsletter subscription
      user = new User({
        username: email.split('@')[0],
        email,
        password: Math.random().toString(36).slice(-8), // Random password
        newsletter: true
      });
      await user.save();
    }

    res.json({ message: 'Successfully subscribed to newsletter' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Unsubscribe from newsletter
router.post('/unsubscribe', async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    
    if (user) {
      user.newsletter = false;
      await user.save();
    }

    res.json({ message: 'Successfully unsubscribed from newsletter' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get newsletter subscribers (admin only)
router.get('/subscribers', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const subscribers = await User.find({ newsletter: true })
      .select('username email createdAt');

    res.json(subscribers);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
