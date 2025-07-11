const express = require('express');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get all events
router.get('/', async (req, res) => {
  try {
    // Check if MongoDB is connected
    if (mongoose.connection.readyState !== 1) {
      return res.json({
        events: [
          {
            _id: 'demo-event-1',
            title: 'Weekly Gamenight',
            description: 'Join us for our weekly gamenight featuring multiple games!',
            date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            location: 'Online',
            organizer: { username: 'GameMaster' },
            attendees: [{ username: 'Player1' }, { username: 'Player2' }],
            maxAttendees: 50,
            isPublic: true,
            tags: ['competitive', 'prizes']
          },
          {
            _id: 'demo-event-2',
            title: 'Community Meetup',
            description: 'Monthly community meetup to discuss upcoming events and server updates.',
            date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
            location: 'Discord Voice Channel',
            organizer: { username: 'CommunityManager' },
            attendees: [{ username: 'Player3' }],
            maxAttendees: 100,
            isPublic: true,
            tags: ['community', 'meetup', 'discussion']
          }
        ],
        currentPage: 1,
        totalPages: 1,
        total: 2
      });
    }

    const { start, end, limit = 20, page = 1 } = req.query;
    
    let query = { isPublic: true };
    
    if (start || end) {
      query.date = {};
      if (start) query.date.$gte = new Date(start);
      if (end) query.date.$lte = new Date(end);
    }

    const events = await Event.find(query)
      .populate('organizer', 'username')
      .populate('attendees', 'username')
      .sort({ date: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Event.countDocuments(query);

    res.json({
      events,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      total
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new event
router.post('/', auth, async (req, res) => {
  try {
    const { title, description, date, endDate, location, maxAttendees, isPublic, tags } = req.body;
    
    const event = new Event({
      title,
      description,
      date,
      endDate,
      location,
      organizer: req.user.id,
      maxAttendees,
      isPublic,
      tags
    });

    await event.save();
    await event.populate('organizer', 'username');

    res.status(201).json(event);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Join event
router.post('/:id/join', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.attendees.includes(req.user.id)) {
      return res.status(400).json({ message: 'Already joined this event' });
    }

    if (event.maxAttendees > 0 && event.attendees.length >= event.maxAttendees) {
      return res.status(400).json({ message: 'Event is full' });
    }

    event.attendees.push(req.user.id);
    await event.save();

    res.json({ message: 'Successfully joined event' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Leave event
router.post('/:id/leave', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (!event.attendees.includes(req.user.id)) {
      return res.status(400).json({ message: 'Not joined this event' });
    }

    event.attendees = event.attendees.filter(id => !id.equals(req.user.id));
    await event.save();

    res.json({ message: 'Successfully left event' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update event
router.put('/:id', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is organizer or admin
    if (!event.organizer.equals(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { title, description, date, endDate, location, maxAttendees, isPublic, tags } = req.body;

    event.title = title || event.title;
    event.description = description || event.description;
    event.date = date || event.date;
    event.endDate = endDate || event.endDate;
    event.location = location || event.location;
    event.maxAttendees = maxAttendees !== undefined ? maxAttendees : event.maxAttendees;
    event.isPublic = isPublic !== undefined ? isPublic : event.isPublic;
    event.tags = tags || event.tags;

    await event.save();
    await event.populate('organizer', 'username');

    res.json(event);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete event
router.delete('/:id', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is organizer or admin
    if (!event.organizer.equals(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Event.findByIdAndDelete(req.params.id);

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;
