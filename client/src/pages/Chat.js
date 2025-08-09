import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { connectChatWebsocket, disconnectChatWebsocket } from '../utils/chatWebsocket';
import { toast } from 'react-toastify';
import { 
  MessageCircle, 
  Plus, 
  Send, 
  Pin, 
  Hash, 
  ArrowDown, 
  User,
  X,
  Settings,
  UserPlus,
  LogOut,
  Trash2
} from 'lucide-react';
import axios from 'axios';
import './Chat.css';
import Profile from './Profile';

const Chat = () => {
  const { user, isAuthenticated, token } = useAuth();
  const { markThreadAsRead } = useChat();

  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [showNewThreadModal, setShowNewThreadModal] = useState(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState(null);
  const [newThreadForm, setNewThreadForm] = useState({
    title: '',
    description: ''
  });
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const fetchThreads = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const response = await axios.get('/api/chat/threads');
      setThreads(response.data.threads);
      
      // Auto-select global thread if none selected
      if (!selectedThread && response.data.threads.length > 0) {
        const globalThread = response.data.threads.find(t => t.type === 'global');
        if (globalThread) {
          setSelectedThread(globalThread);
          fetchMessages(globalThread._id);
        }
      }
    } catch (error) {
      if (showLoading) {
        toast.error('Failed to fetch chat threads');
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [selectedThread]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleNewMessage = useCallback((threadId, message) => {
    console.log('handleNewMessage called:', threadId, message);
    // Update messages if this is the currently selected thread
    if (selectedThread && selectedThread._id === threadId) {
      setMessages(prev => {
        // Check if message already exists to prevent duplicates
        const exists = prev.some(m => m._id === message._id);
        if (exists) return prev;
        
        return [...prev, message];
      });
      
      // Auto-scroll to bottom if user is near bottom
      setTimeout(() => {
        const container = messagesContainerRef.current;
        if (container) {
          const { scrollTop, scrollHeight, clientHeight } = container;
          const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
          if (isNearBottom) {
            scrollToBottom();
          }
        }
      }, 100);
    }
    
    // Refresh threads to update unread counts and last message
    fetchThreads(false);
  }, [selectedThread, fetchThreads, scrollToBottom]);

  const handleThreadUpdate = useCallback((updateData) => {
    console.log('handleThreadUpdate called:', updateData);
    // Refresh threads when there are updates
    fetchThreads(false);
  }, [fetchThreads]);

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchThreads();
      
      // Connect to WebSocket for real-time updates
      try {
        const ws = connectChatWebsocket(
          token,
          handleNewMessage,
          handleThreadUpdate,
          (connected) => {
            console.log('WebSocket connection status:', connected ? 'Connected' : 'Disconnected');
            setWsConnected(connected);
          }
        );
        console.log('WebSocket connection initiated');
        
        return () => {
          console.log('Cleaning up WebSocket connection');
          disconnectChatWebsocket();
          setWsConnected(false);
        };
      } catch (error) {
        console.error('Error connecting to WebSocket:', error);
      }
    }
  }, [isAuthenticated, token, fetchThreads, handleNewMessage, handleThreadUpdate]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      const handleScroll = () => {
        const { scrollTop, scrollHeight, clientHeight } = container;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
        setShowScrollToBottom(!isNearBottom);
      };

      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const fetchMessages = async (threadId, showLoading = true) => {
    try {
      if (showLoading) setMessagesLoading(true);
      
      const response = await axios.get(`/api/chat/threads/${threadId}/messages`);
      setMessages(response.data.messages);
      
      // Mark thread as read
      await axios.post(`/api/chat/threads/${threadId}/mark-read`);
    } catch (error) {
      if (showLoading) {
        toast.error('Failed to fetch messages');
      }
    } finally {
      if (showLoading) setMessagesLoading(false);
    }
  };

  const debouncedSelectThread = async (thread) => {
    setSelectedThread(thread);
    await fetchMessages(thread._id);
    
    // Mark thread as read when selected
    if (markThreadAsRead) {
      markThreadAsRead(thread._id);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedThread) return;

    try {
      const response = await axios.post(`/api/chat/threads/${selectedThread._id}/messages`, {
        content: newMessage.trim()
      });

      setMessages(prev => [...prev, response.data.message]);
      setNewMessage('');
      
      // Update thread list to reflect new last message
      fetchThreads(false);
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

   // Delete message handler
  const handleDeleteMessage = async (messageId) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      await axios.delete(`/api/chat/messages/${messageId}`);
      setMessages(prev => prev.map(m => m._id === messageId ? { ...m, isDeleted: true } : m));
      toast.success('Message deleted');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete message');
    }
  };

  const createThread = async (e) => {
    e.preventDefault();
    if (!newThreadForm.title.trim()) return;

    try {
      const response = await axios.post('/api/chat/threads', newThreadForm);
      setThreads(prev => [response.data.thread, ...prev]);
      setShowNewThreadModal(false);
      setNewThreadForm({ title: '', description: '' });
      toast.success('Thread created successfully');
    } catch (error) {
      toast.error('Failed to create thread');
    }
  };

  const joinThread = async (threadId) => {
    try {
      await axios.post(`/api/chat/threads/${threadId}/join`);
      fetchThreads(false);
      toast.success('Joined thread successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to join thread');
    }
  };

  const leaveThread = async (threadId) => {
    try {
      await axios.post(`/api/chat/threads/${threadId}/leave`);
      fetchThreads(false);
      if (selectedThread?._id === threadId) {
        setSelectedThread(null);
        setMessages([]);
      }
      toast.success('Left thread successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to leave thread');
    }
  };

  const startPrivateChat = async (otherUserId) => {
    try {
      const response = await axios.get(`/api/chat/private/${otherUserId}`);
      const privateThread = response.data.thread;
      
      // Add to threads list if not already there
      const exists = threads.find(t => t._id === privateThread._id);
      if (!exists) {
        setThreads(prev => [privateThread, ...prev]);
      }
      
      setSelectedThread(privateThread);
      fetchMessages(privateThread._id);
      setShowUserProfileModal(null);
      toast.success('Private chat opened');
    } catch (error) {
      toast.error('Failed to start private chat');
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date) => {
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return messageDate.toLocaleDateString();
    }
  };

  const isUserInThread = (thread) => {
    if (thread.type === 'global') return true;
    return thread.participants?.some(p => p.user._id === user?.id || p.user === user?.id);
  };

  const getThreadIcon = (thread) => {
    switch (thread.type) {
      case 'global':
        return <Hash size={16} />;
      case 'event':
        return <Pin size={16} />;
      case 'private':
        // For private chats, try to show the other participant's profile picture
        const otherParticipant = thread.participants?.find(p => {
          const participantId = p.user._id || p.user;
          const currentUserId = user?.id || user?._id;
          return participantId.toString() !== currentUserId.toString();
        });
        
        if (otherParticipant?.user?.profilePicture) {
          return (
            <img 
              src={`data:${otherParticipant.user.profilePicture.mimeType};base64,${otherParticipant.user.profilePicture.imageData}`}
              alt={otherParticipant.user.username}
              className="thread-avatar"
              style={{ width: '16px', height: '16px', borderRadius: '50%' }}
            />
          );
        }
        return <User size={16} />;
      default:
        return <MessageCircle size={16} />;
    }
  };

  const getThreadDisplayName = (thread) => {
    if (thread.type === 'private') {
      // For private chats, show the other participant's name
      const otherParticipant = thread.participants?.find(p => {
        const participantId = p.user._id || p.user;
        const currentUserId = user?.id || user?._id;
        return participantId.toString() !== currentUserId.toString();
      });
      
      if (otherParticipant) {
        const participantName = otherParticipant.user.username || otherParticipant.user;
        return `${participantName}`;
      }
      return 'Private Chat';
    }
    
    if (thread.type === 'event' && thread.eventId) {
      return `${thread.eventId.title} - Chat`;
    }
    
    return thread.title;
  };

  // Helper to render Tenor GIFs as <img> tags
function renderMessageContent(content) {
  if (!content) return null;
  // Regex to match Tenor GIF links (e.g., https://media.tenor.com/...)
  const tenorRegex = /(https?:\/\/(?:media1\.)?tenor\.com\/[\w\-\.\/?=&%#]+\.(?:gif|mp4|webp))/gi;
  const parts = [];
  let lastIndex = 0;
  let match;
  let key = 0;
  while ((match = tenorRegex.exec(content)) !== null) {
    // Push text before the match
    if (match.index > lastIndex) {
      parts.push(React.createElement('span', { key: key++ }, content.slice(lastIndex, match.index)));
    }
    // Push the GIF as an image
    parts.push(
      React.createElement('img', {
        key: key++,
        src: match[1],
        alt: 'GIF',
        className: 'chat-gif',
        style: { maxWidth: '220px', maxHeight: '220px', borderRadius: '10px', margin: '8px 0', display: 'block' }
      })
    );
    lastIndex = match.index + match[0].length;
  }
  // Push any remaining text
  if (lastIndex < content.length) {
    parts.push(React.createElement('span', { key: key++ }, content.slice(lastIndex)));
  }
  return parts.length > 0 ? parts : content;
}


  if (!isAuthenticated) {
    return (
      <div className="chat-container">
        <div className="container">
          <div className="auth-required">
            <MessageCircle size={64} />
            <h2>Authentication Required</h2>
            <p>Please sign in to access the chat.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="chat-container">
        <div className="container">
          <div className="loading-state">
            <div className="loading"></div>
            <p>Loading chat...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-layout">
        {/* Threads Sidebar */}
        <div className="chat-sidebar">
          <div className="sidebar-header">
            <h2>Chat Threads</h2>
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => setShowNewThreadModal(true)}
            >
              <Plus size={16} />
            </button>
          </div>

          <div className="threads-list">
            {threads.map(thread => (
              <div
                key={thread._id}
                className={`thread-item ${selectedThread?._id === thread._id ? 'active' : ''}`}
                onClick={() => debouncedSelectThread(thread)}
              >
                <div className="thread-icon">
                  {getThreadIcon(thread)}
                </div>
                <div className="thread-info">
                  <div className="thread-title">
                    {getThreadDisplayName(thread)}
                    {thread.isPinned && <Pin size={12} className="pinned-icon" />}
                  </div>
                  <div className="thread-meta">
                    <span className="thread-type">{thread.type}</span>
                    {thread.unreadCount > 0 && (
                      <span className="unread-badge">{thread.unreadCount}</span>
                    )}
                  </div>
                </div>
                <div className="thread-actions">
                  {thread.type !== 'global' && (
                    <>
                      {!isUserInThread(thread) ? (
                        <button 
                          className="btn btn-sm btn-success"
                          onClick={(e) => {
                            e.stopPropagation();
                            joinThread(thread._id);
                          }}
                        >
                          <UserPlus size={12} />
                        </button>
                      ) : thread.type !== 'private' && (
                        <button 
                          className="btn btn-sm btn-danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            leaveThread(thread._id);
                          }}
                        >
                          <LogOut size={12} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Main Area */}
        <div className="chat-main">
          {selectedThread ? (
            <>
              {/* Chat Header */}
              <div className="chat-header">
                <div className="chat-header-info">
                  <div className="chat-title">
                    {getThreadIcon(selectedThread)}
                    <span>{getThreadDisplayName(selectedThread)}</span>
                    <div className={`connection-status ${wsConnected ? 'connected' : 'disconnected'}`}>
                      <div className="status-dot"></div>
                      <span className="status-text">
                        {wsConnected ? 'Live' : 'Offline'}
                      </span>
                    </div>
                  </div>
                  {selectedThread.description && (
                    <div className="chat-description">
                      {selectedThread.description}
                    </div>
                  )}
                </div>
              </div>

              {/* Messages Area */}
              <div className="chat-messages" ref={messagesContainerRef}>
                {messagesLoading ? (
                  <div className="loading-state">
                    <div className="loading"></div>
                    <p>Loading messages...</p>
                  </div>
                ) : (
                  <>
                    {messages.map((message, index) => {
                      const showDate = index === 0 || 
                        formatDate(messages[index - 1].createdAt) !== formatDate(message.createdAt);
                      
                      return (
                        <React.Fragment key={message._id}>
                          {showDate && (
                            <div className="date-separator">
                              <span>{formatDate(message.createdAt)}</span>
                            </div>
                          )}
                          <div className={`message ${message.messageType}`}>
                            <div className="message-header">
                              <div className="message-avatar">
                                {message.sender?.profilePicture ? (
                                  <img 
                                    src={`${message.sender.profilePicture.imageData}`}
                                    alt={message.sender.username}
                                    className="avatar-image"
                                  />
                                ) : (
                                  <div 
                                    className="avatar-placeholder"
                                    style={{ 
                                      backgroundColor: message.sender?.nameColor || '#3b82f6',
                                      color: 'white'
                                    }}
                                  >
                                    {message.sender?.username?.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div className={`status-indicator ${wsConnected ? 'online' : 'offline'}`}></div>
                              </div>
                              <span 
                                className="message-author"
                                onClick={() => setShowUserProfileModal(message.sender)}
                                style={{ color: message.sender?.nameColor || '#3b82f6' }}
                              >
                                {message.sender?.username}
                              </span>
                              <span className="message-time">
                                {formatTime(message.createdAt)}
                              </span>
                            </div>
                            <div className="message-text" style={{ display: 'flex', alignItems: 'center' }}>
                              <span style={{ flex: 1 }}>{
                                message.isDeleted
                                  ? <span style={{ color: '#888', fontStyle: 'italic' }}>[deleted]</span>
                                  : renderMessageContent(message.content)
                              }</span>
                              {/* Delete icon for own messages or admin */}
                              {!message.isDeleted && (user?.id === message.sender?._id || user?.id === message.sender?.id || user?.role === 'admin') && (
                                <button
                                  className="delete-message-btn"
                                  title="Delete message"
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 8, color: '#e53e3e' }}
                                  onClick={() => handleDeleteMessage(message._id)}
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Scroll to Bottom Button */}
              {showScrollToBottom && (
                <button 
                  className="scroll-to-bottom"
                  onClick={scrollToBottom}
                >
                  <ArrowDown size={16} />
                  New messages
                </button>
              )}

              {/* Message Input */}
              <form onSubmit={sendMessage} className="message-input-form">
                <div className="message-input-container">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`Message ${getThreadDisplayName(selectedThread)}...`}
                    className="message-input"
                    maxLength={2000}
                  />
                  <button 
                    type="submit" 
                    className="send-button"
                    disabled={!newMessage.trim()}
                  >
                    <Send size={16} />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="no-thread-selected">
              <MessageCircle size={64} />
              <h3>Select a thread to start chatting</h3>
              <p>Choose a thread from the sidebar to view and send messages.</p>
            </div>
          )}
        </div>
      </div>

      {/* New Thread Modal */}
      {showNewThreadModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Create New Thread</h3>
              <button 
                className="close-btn"
                onClick={() => setShowNewThreadModal(false)}
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={createThread} className="modal-form">
              <div className="form-group">
                <label htmlFor="threadTitle">Thread Title</label>
                <input
                  type="text"
                  id="threadTitle"
                  value={newThreadForm.title}
                  onChange={(e) => setNewThreadForm(prev => ({ ...prev, title: e.target.value }))}
                  className="form-control"
                  required
                  maxLength={100}
                />
              </div>
              <div className="form-group">
                <label htmlFor="threadDescription">Description (Optional)</label>
                <textarea
                  id="threadDescription"
                  value={newThreadForm.description}
                  onChange={(e) => setNewThreadForm(prev => ({ ...prev, description: e.target.value }))}
                  className="form-control"
                  rows="3"
                  maxLength={500}
                />
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">
                  Create Thread
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setShowNewThreadModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User Profile Modal */}
      {showUserProfileModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>User Profile</h3>
              <button 
                className="close-btn"
                onClick={() => setShowUserProfileModal(null)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="user-profile-modal">
              <div className="profile-avatar">
                {showUserProfileModal.profilePicture ? (
                  <img 
                    src={`data:${showUserProfileModal.profilePicture.mimeType};base64,${showUserProfileModal.profilePicture.imageData}`}
                    alt={showUserProfileModal.username}
                    className="avatar-image large"
                  />
                ) : (
                  <div 
                    className="avatar-placeholder large"
                    style={{ 
                      backgroundColor: showUserProfileModal.nameColor || '#3b82f6',
                      color: 'white'
                    }}
                  >
                    {showUserProfileModal.username?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <h4 style={{ color: showUserProfileModal.nameColor || '#3b82f6' }}>
                {showUserProfileModal.username}
              </h4>
              {showUserProfileModal._id !== user?.id && (
                <button 
                  className="btn btn-primary"
                  onClick={() => startPrivateChat(showUserProfileModal._id)}
                >
                  <MessageCircle size={16} />
                  Start Private Chat
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
