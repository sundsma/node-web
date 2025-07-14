const express = require('express');
const Newsletter = require('../models/Newsletter');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Subscribe to newsletter
router.post('/subscribe', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    let subscription = await Newsletter.findOne({ email });
    if (!subscription) {
      subscription = new Newsletter({ email });
      await subscription.save();
    } else if (!subscription.active) {
      subscription.active = true;
      await subscription.save();
    }
    res.json({ message: 'Successfully subscribed to newsletter', subscription });
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Unsubscribe from newsletter
router.post('/unsubscribe', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const subscription = await Newsletter.findOne({ email });
    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }
    subscription.active = false;
    await subscription.save();
    res.json({ message: 'Successfully unsubscribed from newsletter' });
  } catch (error) {
    console.error('Newsletter unsubscription error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all newsletter subscriptions (admin only)
router.get('/subscriptions', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const subscriptions = await Newsletter.find({ active: true });
    res.json({ subscriptions });
  } catch (error) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
