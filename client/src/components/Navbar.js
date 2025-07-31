import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import { useTheme } from '../contexts/ThemeContext';
import { MessageCircle, X } from 'lucide-react';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { totalUnread, notifications, removeNotification } = useChat();
  const { theme, toggleTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [profilePicture, setProfilePicture] = useState('/default-profile.png');
  const navigate = useNavigate();

  // Update profile picture when user data changes
  useEffect(() => {
    if (user?.profilePicture) {
      setProfilePicture(user.profilePicture);
    } else {
      setProfilePicture('/default-profile.png');
    }
  }, [user]);

  // Listen for profile picture updates from upload component
  useEffect(() => {
    const handleProfilePictureUpdate = (event) => {
      setProfilePicture(event.detail);
    };

    window.addEventListener('profilePictureUpdated', handleProfilePictureUpdate);

    return () => {
      window.removeEventListener('profilePictureUpdated', handleProfilePictureUpdate);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsProfileMenuOpen(false);
    setShowNotifications(false);
    setProfilePicture('/default-profile.png'); // Reset profile picture on logout
  };

  const handleNotificationClick = (notification) => {
    if (notification.type === 'private_message') {
      navigate('/chat');
    }
    removeNotification(notification.id);
    setShowNotifications(false);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-brand" onClick={closeMenu}>
          TGSU
        </Link>

        <div className="navbar-menu">
          <div className={`navbar-nav ${isMenuOpen ? 'active' : ''}`}>
            <Link to="/" className="nav-link" onClick={closeMenu}>
              Home
            </Link>
            <Link to="/events" className="nav-link" onClick={closeMenu}>
              Events
            </Link>
            <Link to="/servers" className="nav-link" onClick={closeMenu}>
              Servers
            </Link>
            <Link to="/chat" className="nav-link" onClick={closeMenu}>
              Chat
            </Link>
            <Link to="/newsletter" className="nav-link" onClick={closeMenu}>
              Newsletter
            </Link>
          </div>

          <div className="navbar-actions">
            <button 
              className="theme-toggle" 
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>

            {isAuthenticated ? (
              <div className="profile-dropdown">
                {/* Message Notifications */}
                <div className="message-notifications">
                  <button 
                    className="message-button"
                    onClick={() => setShowNotifications(!showNotifications)}
                  >
                    <MessageCircle size={20} />
                    {totalUnread > 0 && (
                      <span className="message-badge">{totalUnread > 99 ? '99+' : totalUnread}</span>
                    )}
                  </button>
                  
                  {showNotifications && (
                    <div className="notifications-dropdown">
                      <div className="notifications-header">
                        <h4>Notifications</h4>
                        <button 
                          className="close-notifications"
                          onClick={() => setShowNotifications(false)}
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <div className="notifications-list">
                        {notifications.length > 0 ? (
                          notifications.map(notification => (
                            <div 
                              key={notification.id}
                              className="notification-item"
                              onClick={() => handleNotificationClick(notification)}
                            >
                              <div className="notification-title">{notification.title}</div>
                              <div className="notification-message">{notification.message}</div>
                              <div className="notification-time">
                                {notification.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="no-notifications">
                            <p>No new notifications</p>
                          </div>
                        )}
                      </div>
                      {totalUnread > 0 && (
                        <div className="notifications-footer">
                          <Link 
                            to="/chat" 
                            className="view-all-messages"
                            onClick={() => setShowNotifications(false)}
                          >
                            View all messages ({totalUnread})
                          </Link>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <button 
                  className="profile-button"
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                >
                  <img src={profilePicture} alt="Profile" className="profile-picture" />
                  <span>{user?.username}</span>
                </button>
                {isProfileMenuOpen && (
                  <div className="profile-menu">
                    <Link 
                      to="/profile" 
                      className="profile-menu-item"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      <img src={profilePicture} alt="Profile" className="profile-picture" /> Profile
                    </Link>
                    <button 
                      className="profile-menu-item logout-btn"
                      onClick={handleLogout}
                    >
                      🚪 Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="auth-buttons">
                <Link to="/login" className="btn btn-outline" onClick={closeMenu}>
                  Login
                </Link>
                <Link to="/register" className="btn btn-primary" onClick={closeMenu}>
                  Sign Up
                </Link>
              </div>
            )}

            <button 
              className="mobile-menu-toggle"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? '✕' : '☰'}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
