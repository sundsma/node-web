import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { Mail, Send, CheckCircle, Users, Bell, Globe } from 'lucide-react';
import axios from 'axios';
import './Newsletter.css';

const Newsletter = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [subscribers, setSubscribers] = useState([]);
  const [subscribersCount, setSubscribersCount] = useState(0);
  const { user, isAuthenticated, isAdmin } = useAuth();

  useEffect(() => {
    if (isAdmin()) {
      fetchSubscribers();
    }
  }, [isAdmin]);

  const fetchSubscribers = async () => {
    try {
      const response = await axios.get('/api/newsletter/subscribers');
      setSubscribers(response.data);
      setSubscribersCount(response.data.length);
    } catch (error) {
      console.error('Failed to fetch subscribers:', error);
    }
  };

  const handleSubscribe = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post('/api/newsletter/subscribe', { email });
      toast.success('Successfully subscribed to newsletter!');
      setEmail('');
      
      if (isAdmin()) {
        fetchSubscribers();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to subscribe');
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async (email) => {
    try {
      await axios.post('/api/newsletter/unsubscribe', { email });
      toast.success('Successfully unsubscribed from newsletter');
      
      if (isAdmin()) {
        fetchSubscribers();
      }
    } catch (error) {
      toast.error('Failed to unsubscribe');
    }
  };

  const features = [
    {
      icon: <Bell size={24} />,
      title: 'Event Notifications',
      description: 'Get notified about upcoming gaming events, games, and community gatherings.'
    },
    {
      icon: <Globe size={24} />,
      title: 'Server Updates',
      description: 'Stay informed about server maintenance, new features, and important announcements.'
    },
    {
      icon: <Users size={24} />,
      title: 'Community News',
      description: 'Receive updates about community achievements, member highlights, and gaming news.'
    }
  ];

  return (
    <div className="newsletter-container">
      <div className="container">
        <div className="newsletter-header">
          <div className="newsletter-hero">
            <Mail size={48} />
            <h1>Stay Connected</h1>
            <p>Subscribe to our newsletter and never miss important updates about events, servers, and community news.</p>
          </div>
        </div>

        <div className="newsletter-content">
          <div className="newsletter-main">
            <div className="subscription-section">
              <h2>Subscribe to Our Newsletter</h2>
              <form onSubmit={handleSubscribe} className="subscription-form">
                <div className="form-group">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="form-control email-input"
                    required
                  />
                  <button
                    type="submit"
                    className="btn btn-primary subscribe-btn"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="loading">Subscribing...</span>
                    ) : (
                      <>
                        <Send size={20} />
                        Subscribe
                      </>
                    )}
                  </button>
                </div>
              </form>
              
              {isAuthenticated && user?.newsletter && (
                <div className="subscription-status">
                  <CheckCircle size={20} />
                  <span>You are subscribed to our newsletter</span>
                  <button
                    className="btn btn-outline unsubscribe-btn"
                    onClick={() => handleUnsubscribe(user.email)}
                  >
                    Unsubscribe
                  </button>
                </div>
              )}
            </div>

            <div className="features-section">
              <h3>What You'll Receive</h3>
              <div className="features-grid">
                {features.map((feature, index) => (
                  <div key={index} className="feature-item">
                    <div className="feature-icon">
                      {feature.icon}
                    </div>
                    <h4>{feature.title}</h4>
                    <p>{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="newsletter-info">
              <div className="info-card">
                <h3>Newsletter Details</h3>
                <div className="info-list">
                  <div className="info-item">
                    <strong>Frequency:</strong> Weekly digest with special event announcements
                  </div>
                  <div className="info-item">
                    <strong>Content:</strong> Event updates, server news, community highlights
                  </div>
                  <div className="info-item">
                    <strong>Privacy:</strong> Your email is safe with us. We never share your information.
                  </div>
                  <div className="info-item">
                    <strong>Unsubscribe:</strong> Easy one-click unsubscribe at any time
                  </div>
                </div>
              </div>

              <div className="stats-card">
                <h3>Community Stats</h3>
                <div className="stats-grid">
                  <div className="stat-item">
                    <div className="stat-number">{subscribersCount || '500+'}</div>
                    <div className="stat-label">Newsletter Subscribers</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-number">Weekly</div>
                    <div className="stat-label">Newsletter Schedule</div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-number">2+ Years</div>
                    <div className="stat-label">Community History</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Section */}
        {isAdmin() && (
          <div className="admin-section">
            <div className="admin-header">
              <h2>Newsletter Administration</h2>
              <p>Manage newsletter subscribers and view statistics</p>
            </div>

            <div className="admin-content">
              <div className="subscribers-overview">
                <h3>Subscribers Overview</h3>
                <div className="overview-stats">
                  <div className="overview-stat">
                    <span className="stat-number">{subscribers.length}</span>
                    <span className="stat-label">Total Subscribers</span>
                  </div>
                  <div className="overview-stat">
                    <span className="stat-number">
                      {subscribers.filter(s => new Date(s.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
                    </span>
                    <span className="stat-label">New This Week</span>
                  </div>
                </div>
              </div>

              <div className="subscribers-list">
                <h3>Recent Subscribers</h3>
                <div className="subscribers-table">
                  <div className="table-header">
                    <div className="table-cell">Username</div>
                    <div className="table-cell">Email</div>
                    <div className="table-cell">Joined</div>
                    <div className="table-cell">Actions</div>
                  </div>
                  {subscribers.slice(0, 10).map(subscriber => (
                    <div key={subscriber._id} className="table-row">
                      <div className="table-cell">{subscriber.username}</div>
                      <div className="table-cell">{subscriber.email}</div>
                      <div className="table-cell">
                        {new Date(subscriber.createdAt).toLocaleDateString()}
                      </div>
                      <div className="table-cell">
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleUnsubscribe(subscriber.email)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Newsletter;
