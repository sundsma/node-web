import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Users, Server, Mail, ArrowRight, Shield, Globe } from 'lucide-react';
import './Home.css';

const Home = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="home">
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <h1 className="hero-title">
              TGSU Now in the WEB!
            </h1>
            <p className="hero-subtitle">
              Your one stop for upcoming events and games, server management, and community news and updates.
            </p>
            {!isAuthenticated ? (
              <div className="hero-actions">
                <Link to="/register" className="btn btn-primary btn-lg">
                  Get Started
                  <ArrowRight size={20} />
                </Link>
                <Link to="/login" className="btn btn-primary btn-lg">
                  Sign In
                </Link>
              </div>
            ) : (
              <div className="hero-actions">
                <p className="welcome-message">
                  Welcome back, <strong>{user?.username}</strong>!
                </p>
                <Link to="/events" className="btn btn-primary btn-lg">
                  View Events
                  <ArrowRight size={20} />
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <h2 className="section-title">What We Offer</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <Calendar size={32} />
              </div>
              <h3>Event Calendar</h3>
              <p>
                Stay updated with the latest events, games, and evening coffee breaks. 
                Never miss an important event with TGSU friends again.
              </p>
              <Link to="/events" className="feature-link">
                View Events <ArrowRight size={16} />
              </Link>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <Server size={32} />
              </div>
              <h3>Server Management</h3>
              <p>
                Access and manage your game servers with ease. Get connection details and 
                control panels for authorized users.
              </p>
              <Link to="/servers" className="feature-link">
                View Servers <ArrowRight size={16} />
              </Link>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <Mail size={32} />
              </div>
              <h3>Newsletter</h3>
              <p>
                Subscribe to our newsletter to receive updates about new events, server status, 
                and community news directly in your inbox.
              </p>
              <Link to="/newsletter" className="feature-link">
                Subscribe <ArrowRight size={16} />
              </Link>
            </div>

            <div className="feature-card">
              <div className="feature-icon">
                <Users size={32} />
              </div>
              <h3>Community</h3>
              <p>
                Join a thriving community of gamers. 
                Connect with like-minded players
              </p>
              <Link to="/register" className="feature-link">
                Join Community <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number">20+</div>
              <div className="stat-label">Active Members</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">10+</div>
              <div className="stat-label">Monthly Events</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">5+</div>
              <div className="stat-label">Game Servers</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">24/7ish</div>
              <div className="stat-label">Support</div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      {/* Benefits Section with background image */}
      <section className="benefits-section-with-bg">
        <div className="benefits-bg-image"></div>
        <div className="container">
          <h2 className="section-title">Why Choose TGSU?</h2>
          <div className="benefits-grid">
            <div className="benefit-card white-card">
              <Shield size={24} />
              <h4>Secure & Reliable</h4>
              <p>Your data is protected with enterprise-grade security measures.</p>
            </div>
            <div className="benefit-card black-card">
              <Globe size={24} />
              <h4>Global Community</h4>
              <p>Connect with local friend groups and chat internationally!</p>
            </div>
            <div className="benefit-card white-card">
              <Users size={24} />
              <h4>Active Moderation</h4>
              <p>Our so-so-dedicated team ensures a safe and friendly environment for all.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      {!isAuthenticated && (
        <section className="cta">
          <div className="container">
            <div className="cta-content">
              <h2>Ready to Join the Community?</h2>
              <p>
                Sign up today and start connecting with fellow gamers, 
                join exciting events, and access exclusive server features.
              </p>
              <div className="cta-actions">
                <Link to="/register" className="btn btn-primary btn-lg">
                  Create Account
                </Link>
                <Link to="/newsletter" className="btn btn-outline btn-lg">
                  Subscribe to Newsletter
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Home;
