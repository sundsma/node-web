const express = require('express');
const Event = require('../models/Event');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get all events
router.get('/', async (req, res) => {
  try {
    const events = await Event.find({}).populate('organizer', 'username email').populate('attendees', 'username email');
    res.json({ events });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new event
router.post('/', auth, async (req, res) => {
  try {
    const event = new Event({
      ...req.body,
      organizer: req.user.userId
    });
    await event.save();
    await event.populate('organizer', 'username email');
    res.status(201).json({ message: 'Event created successfully', event });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Join event
router.post('/:id/join', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    if (!event.attendees.includes(req.user.userId)) {
      event.attendees.push(req.user.userId);
      await event.save();
    }
    await event.populate('organizer', 'username email');
    await event.populate('attendees', 'username email');
    res.json({ message: 'Successfully joined event', event });
  } catch (error) {
    console.error('Join event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Leave event
router.post('/:id/leave', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    event.attendees = event.attendees.filter(uid => String(uid) !== String(req.user.userId));
    await event.save();
    await event.populate('organizer', 'username email');
    await event.populate('attendees', 'username email');
    res.json({ message: 'Successfully left event', event });
  } catch (error) {
    console.error('Leave event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update event
router.put('/:id', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    if (String(event.organizer) !== String(req.user.userId)) {
      return res.status(403).json({ message: 'Not authorized to update this event' });
    }
    Object.assign(event, req.body);
    await event.save();
    await event.populate('organizer', 'username email');
    await event.populate('attendees', 'username email');
    res.json({ message: 'Event updated successfully', event });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete event
router.delete('/:id', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }
    if (String(event.organizer) !== String(req.user.userId)) {
      return res.status(403).json({ message: 'Not authorized to delete this event' });
    }
    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
