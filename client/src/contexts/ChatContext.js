import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { connectChatWebsocket, disconnectChatWebsocket } from '../utils/chatWebsocket';
import axios from 'axios';

const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const { user, isAuthenticated, token } = useAuth();
  const [unreadCounts, setUnreadCounts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);

  useEffect(() => {
    if (isAuthenticated && token) {
      // Initial fetch of unread counts
      fetchUnreadCounts();
      
      // Connect to WebSocket for real-time updates
      const ws = connectChatWebsocket(
        token,
        handleNewMessage,
        handleThreadUpdate
      );
      
      return () => {
        disconnectChatWebsocket();
        setWsConnected(false);
      };
    } else {
      setUnreadCounts([]);
      setNotifications([]);
      setTotalUnread(0);
      setWsConnected(false);
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    // Calculate total unread messages
    const total = unreadCounts.reduce((sum, count) => sum + count.unreadCount, 0);
    setTotalUnread(total);
  }, [unreadCounts]);

  const handleNewMessage = (threadId, message) => {
    // Update unread counts when new message arrives
    setUnreadCounts(prev => {
      const updatedCounts = [...prev];
      const existingIndex = updatedCounts.findIndex(c => c.threadId === threadId);
      
      if (existingIndex >= 0) {
        // Only increment if message is from someone else
        if (message.sender._id !== user?.id && message.sender._id !== user?._id) {
          updatedCounts[existingIndex] = {
            ...updatedCounts[existingIndex],
            unreadCount: updatedCounts[existingIndex].unreadCount + 1
          };
        }
      } else {
        // New thread with unread message
        if (message.sender._id !== user?.id && message.sender._id !== user?._id) {
          updatedCounts.push({
            threadId,
            unreadCount: 1,
            threadType: 'unknown' // Will be updated by fetchUnreadCounts
          });
        }
      }
      
      return updatedCounts;
    });

    // Show notification for private messages
    if (message.sender._id !== user?.id && message.sender._id !== user?._id) {
      // Check if it's a private message or important thread
      fetchUnreadCounts(); // Refresh to get accurate counts and types
      
      addNotification({
        id: Date.now(),
        type: 'new_message',
        title: `New message from ${message.sender.username}`,
        message: message.content.substring(0, 50) + (message.content.length > 50 ? '...' : ''),
        timestamp: new Date()
      });
    }
  };

  const handleThreadUpdate = (updateData) => {
    // Handle thread updates (join, leave, etc.)
    console.log('Thread update:', updateData);
    // Refresh unread counts when threads are updated
    fetchUnreadCounts();
  };

  const fetchUnreadCounts = async () => {
    try {
      const response = await axios.get('/api/chat/unread-counts');
      const newUnreadCounts = response.data.unreadCounts;
      setUnreadCounts(newUnreadCounts);
    } catch (error) {
      console.error('Error fetching unread counts:', error);
    }
  };

  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev].slice(0, 5)); // Keep only last 5 notifications
    
    // Auto remove notification after 5 seconds
    setTimeout(() => {
      removeNotification(notification.id);
    }, 5000);
  };

  const removeNotification = (notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const markThreadAsRead = async (threadId) => {
    try {
      await axios.post(`/api/chat/threads/${threadId}/mark-read`);
      fetchUnreadCounts();
    } catch (error) {
      console.error('Error marking thread as read:', error);
    }
  };

  const getUnreadCountForThread = (threadId) => {
    const count = unreadCounts.find(c => c.threadId === threadId);
    return count ? count.unreadCount : 0;
  };

  const getUnreadCountByType = (type) => {
    return unreadCounts
      .filter(c => c.threadType === type)
      .reduce((sum, c) => sum + c.unreadCount, 0);
  };

  const value = {
    unreadCounts,
    notifications,
    totalUnread,
    wsConnected,
    addNotification,
    removeNotification,
    markThreadAsRead,
    getUnreadCountForThread,
    getUnreadCountByType,
    fetchUnreadCounts
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export default ChatContext;
