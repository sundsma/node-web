const express = require('express');
const ChatThread = require('../models/ChatThread');
const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');
const Event = require('../models/Event');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get all threads for user
router.get('/threads', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const threads = await ChatThread.find({
      $or: [
        { type: 'global' },
        { type: 'user-created', isActive: true },
        { 'participants.user': userId }
      ]
    })
    .populate('creator', 'username nameColor')
    .populate('lastMessage')
    .populate('eventId', 'title')
    .populate('participants.user', 'username nameColor')
    .sort({ isPinned: -1, lastActivity: -1 });

    // Calculate unread count for each thread
    const threadsWithUnread = await Promise.all(threads.map(async (thread) => {
      const participant = thread.participants.find(p => p.user.toString() === userId.toString());
      const lastReadAt = participant?.lastReadAt || new Date(0);
      
      const unreadCount = await ChatMessage.countDocuments({
        thread: thread._id,
        createdAt: { $gt: lastReadAt },
        sender: { $ne: userId }
      });

      return {
        ...thread.toObject(),
        unreadCount
      };
    }));

    res.json({ threads: threadsWithUnread });
  } catch (error) {
    console.error('Error fetching threads:', error);
    res.status(500).json({ message: 'Failed to fetch threads' });
  }
});

// Get unread counts for all threads
router.get('/unread-counts', auth, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const threads = await ChatThread.find({
      $or: [
        { type: 'global' },
        { type: 'user-created', isActive: true },
        { 'participants.user': userId }
      ]
    });

    const unreadCounts = await Promise.all(threads.map(async (thread) => {
      const participant = thread.participants.find(p => p.user.toString() === userId.toString());
      const lastReadAt = participant?.lastReadAt || new Date(0);
      
      const unreadCount = await ChatMessage.countDocuments({
        thread: thread._id,
        createdAt: { $gt: lastReadAt },
        sender: { $ne: userId }
      });

      return {
        threadId: thread._id,
        threadType: thread.type,
        unreadCount
      };
    }));

    res.json({ unreadCounts });
  } catch (error) {
    console.error('Error fetching unread counts:', error);
    res.status(500).json({ message: 'Failed to fetch unread counts' });
  }
});

// Create new thread
router.post('/threads', auth, async (req, res) => {
  try {
    const { title, description, type = 'user-created' } = req.body;
    const userId = req.user.userId;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ message: 'Thread title is required' });
    }

    const thread = new ChatThread({
      title: title.trim(),
      description: description?.trim(),
      type,
      creator: userId,
      participants: [{ user: userId }]
    });

    await thread.save();
    await thread.populate('creator', 'username');

    res.status(201).json({ thread });
  } catch (error) {
    console.error('Error creating thread:', error);
    res.status(500).json({ message: 'Failed to create thread' });
  }
});

// Join thread
router.post('/threads/:threadId/join', auth, async (req, res) => {
  try {
    const { threadId } = req.params;
    const userId = req.user.userId;

    const thread = await ChatThread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    // Check if user is already a participant
    const isParticipant = thread.participants.some(p => p.user.toString() === userId.toString());
    if (isParticipant) {
      return res.status(400).json({ message: 'Already a member of this thread' });
    }

    thread.participants.push({ user: userId });
    await thread.save();

    // Create join message
    const joinMessage = new ChatMessage({
      thread: threadId,
      sender: userId,
      content: 'joined the chat',
      messageType: 'join'
    });
    await joinMessage.save();

    res.json({ message: 'Successfully joined thread' });
  } catch (error) {
    console.error('Error joining thread:', error);
    res.status(500).json({ message: 'Failed to join thread' });
  }
});

// Leave thread
router.post('/threads/:threadId/leave', auth, async (req, res) => {
  try {
    const { threadId } = req.params;
    const userId = req.user.userId;

    const thread = await ChatThread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    // Can't leave global threads
    if (thread.type === 'global') {
      return res.status(400).json({ message: 'Cannot leave global threads' });
    }

    thread.participants = thread.participants.filter(p => p.user.toString() !== userId.toString());
    await thread.save();

    // Create leave message
    const leaveMessage = new ChatMessage({
      thread: threadId,
      sender: userId,
      content: 'left the chat',
      messageType: 'leave'
    });
    await leaveMessage.save();

    res.json({ message: 'Successfully left thread' });
  } catch (error) {
    console.error('Error leaving thread:', error);
    res.status(500).json({ message: 'Failed to leave thread' });
  }
});

// Get messages for a thread
router.get('/threads/:threadId/messages', auth, async (req, res) => {
  try {
    const { threadId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = req.user.userId;

    // Check if user has access to thread
    const thread = await ChatThread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    const hasAccess = thread.type === 'global' || 
                     thread.participants.some(p => p.user.toString() === userId.toString());
    
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied to this thread' });
    }

    const messages = await ChatMessage.find({ 
      thread: threadId,
      isDeleted: false 
    })
    .populate('sender', 'username nameColor')
    .populate('replyTo')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    // Get profile pictures for message senders
    const ProfilePicture = require('../models/ProfilePicture');
    const senderIds = [...new Set(messages.map(m => m.sender._id))];
    const profilePictures = await ProfilePicture.find({ userId: { $in: senderIds } });
    
    // Add profile pictures to messages
    const messagesWithProfiles = messages.map(message => {
      const profilePic = profilePictures.find(p => p.userId.toString() === message.sender._id.toString());
      return {
        ...message.toObject(),
        sender: {
          ...message.sender.toObject(),
          profilePicture: profilePic ? {
            imageData: profilePic.imageData,
            mimeType: profilePic.mimeType
          } : null
        }
      };
    });

    // Update last read time for user
    const participant = thread.participants.find(p => p.user.toString() === userId.toString());
    if (participant) {
      participant.lastReadAt = new Date();
      await thread.save();
    }

    res.json({ messages: messagesWithProfiles.reverse() });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
});

// Send message to thread
router.post('/threads/:threadId/messages', auth, async (req, res) => {
  try {
    const { threadId } = req.params;
    const { content, replyTo } = req.body;
    const userId = req.user.userId;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    // Check if user has access to thread
    const thread = await ChatThread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    const hasAccess = thread.type === 'global' || 
                     thread.participants.some(p => p.user.toString() === userId.toString());
    
    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied to this thread' });
    }

    const message = new ChatMessage({
      thread: threadId,
      sender: userId,
      content: content.trim(),
      replyTo: replyTo || null
    });

    await message.save();
    await message.populate('sender', 'username nameColor');

    // Add profile picture to the message
    const ProfilePicture = require('../models/ProfilePicture');
    const profilePic = await ProfilePicture.findOne({ userId });
    const messageWithProfile = {
      ...message.toObject(),
      sender: {
        ...message.sender.toObject(),
        profilePicture: profilePic ? {
          imageData: profilePic.imageData,
          mimeType: profilePic.mimeType
        } : null
      }
    };

    // Update thread last activity and message count
    thread.lastMessage = message._id;
    thread.lastActivity = new Date();
    thread.messageCount += 1;
    await thread.save();

    // Broadcast new message via WebSocket
    if (req.app.locals.broadcastToThread) {
      req.app.locals.broadcastToThread(threadId, messageWithProfile, userId);
    }

    res.status(201).json({ message: messageWithProfile });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Failed to send message' });
  }
});

// Get private chat with another user
router.get('/private/:otherUserId', auth, async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const userId = req.user.userId;

    if (userId === otherUserId) {
      return res.status(400).json({ message: 'Cannot chat with yourself' });
    }

    // Find existing private thread between these users
    let thread = await ChatThread.findOne({
      type: 'private',
      'participants.user': { $all: [userId, otherUserId] }
    }).populate('participants.user', 'username');

    if (!thread) {
      // Create new private thread
      const otherUser = await User.findById(otherUserId);
      if (!otherUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      thread = new ChatThread({
        title: `Private Chat`,
        type: 'private',
        creator: userId,
        participants: [
          { user: userId },
          { user: otherUserId }
        ]
      });
      await thread.save();
      await thread.populate('participants.user', 'username');
    }

    res.json({ thread });
  } catch (error) {
    console.error('Error getting private chat:', error);
    res.status(500).json({ message: 'Failed to get private chat' });
  }
});

// Get unread message counts
router.get('/unread-counts', auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get all threads user participates in
    const threads = await ChatThread.find({
      $or: [
        { type: 'global' },
        { 'participants.user': userId }
      ]
    });

    const unreadCounts = await Promise.all(threads.map(async (thread) => {
      const participant = thread.participants.find(p => p.user.toString() === userId.toString());
      const lastReadAt = participant?.lastReadAt || new Date(0);
      
      const unreadCount = await ChatMessage.countDocuments({
        thread: thread._id,
        createdAt: { $gt: lastReadAt },
        sender: { $ne: userId }
      });

      return {
        threadId: thread._id,
        threadType: thread.type,
        eventId: thread.eventId,
        unreadCount
      };
    }));

    res.json({ unreadCounts });
  } catch (error) {
    console.error('Error fetching unread counts:', error);
    res.status(500).json({ message: 'Failed to fetch unread counts' });
  }
});

// Create event thread
router.post('/events/:eventId/thread', auth, async (req, res) => {
  try {
    const { eventId } = req.params;
    const userId = req.user.userId;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is organizer or admin
    const userIdString = userId.toString();
    const organizerIdString = event.organizer.toString();
    const user = await User.findById(userId);
    
    if (userIdString !== organizerIdString && user.role !== 'admin') {
      return res.status(403).json({ message: 'Only event organizers and admins can create event threads' });
    }

    // Check if thread already exists for this event
    let existingThread = await ChatThread.findOne({ eventId, type: 'event' });
    if (existingThread) {
      // Thread exists, just return it
      await existingThread.populate('creator', 'username');
      return res.json({ 
        thread: existingThread, 
        message: 'Event thread already exists' 
      });
    }

    const thread = new ChatThread({
      title: `${event.title} - Event Chat`,
      description: `Chat for event: ${event.title}`,
      type: 'event',
      creator: userId,
      eventId,
      participants: [{ user: userId }],
      isPinned: true
    });

    await thread.save();
    await thread.populate('creator', 'username');

    res.status(201).json({ thread });
  } catch (error) {
    console.error('Error creating event thread:', error);
    res.status(500).json({ message: 'Failed to create event thread' });
  }
});

// Mark messages as read
router.post('/threads/:threadId/mark-read', auth, async (req, res) => {
  try {
    const { threadId } = req.params;
    const userId = req.user.userId;

    const thread = await ChatThread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ message: 'Thread not found' });
    }

    // Update last read time for user
    const participant = thread.participants.find(p => p.user.toString() === userId.toString());
    if (participant) {
      participant.lastReadAt = new Date();
      await thread.save();
    }

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ message: 'Failed to mark messages as read' });
  }
});

module.exports = router;
