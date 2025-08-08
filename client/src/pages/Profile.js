import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { User, Mail, Shield, Bell, Save, Eye, EyeOff, Palette } from 'lucide-react';
import ProfilePictureUpload from '../components/ProfilePictureUpload';
import './Profile.css';

const Profile = () => {
  const { user, updateProfile, changePassword, isAuthenticated, refreshUser } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    newsletter: false,
    nameColor: '#3b82f6'
  });
  const [loading, setLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        newsletter: user.newsletter || false,
        nameColor: user.nameColor || '#3b82f6'
      });
    }
  }, [user]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await updateProfile(formData);
      if (result.success) {
        toast.success('Profile updated successfully!');
        await refreshUser();
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const result = await changePassword(passwordData.currentPassword, passwordData.newPassword);
      
      if (result.success) {
        toast.success('Password updated successfully!');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setShowPasswordForm(false);
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error('Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  if (!isAuthenticated) {
    return (
      <div className="profile-container">
        <div className="container">
          <div className="auth-required">
            <User size={64} />
            <h2>Authentication Required</h2>
            <p>Please sign in to view your profile.</p>
            <div className="auth-actions">
              <a href="/login" className="btn btn-primary">Sign In</a>
              <a href="/register" className="btn btn-outline">Create Account</a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="container">
        <div className="profile-header">
          <div className="profile-avatar">
            <ProfilePictureUpload 
              userId={user?.id || user?._id}
              currentImage={user?.profilePicture}
              onImageUpdate={async (imageData) => {
                // Refresh user data to get updated profile picture
                await refreshUser();
                // Also dispatch custom event for navbar
                window.dispatchEvent(new CustomEvent('profilePictureUpdated', { detail: imageData }));
              }}
            />
          </div>
          <div className="profile-info">
            <h1>Profile Settings</h1>
            <p>Manage your account information and preferences</p>
          </div>
        </div>

        <div className="profile-content">
          <div className="profile-main">
            <div className="profile-section">
              <div className="section-header">
                <h2>Account Information</h2>
                <p>Update your basic account details</p>
              </div>

              <form onSubmit={handleProfileUpdate} className="profile-form">
                <div className="form-group-profile">
                  <label htmlFor="username" className="form-label">
                    <User size={18} />
                    Username
                  </label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group-profile">
                  <label htmlFor="email" className="form-label">
                    <Mail size={18} />
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group-profile">
                  <label htmlFor="nameColor" className="form-label">
                    <Palette size={18} />
                    Name Color
                  </label>
                  <div className="color-picker-container">
                    <input
                      type="color"
                      id="nameColor"
                      name="nameColor"
                      value={formData.nameColor}
                      onChange={handleInputChange}
                      className="color-picker"
                    />
                    <span 
                      className="color-preview" 
                      style={{ 
                        color: formData.nameColor,
                        fontWeight: 'bold',
                        marginLeft: '10px'
                      }}
                    >
                      {formData.username || 'Username Preview'}
                    </span>
                  </div>
                </div>

                <div className="form-group-profile">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="newsletter"
                      checked={formData.newsletter}
                      onChange={handleInputChange}
                    />
                    <Bell size={18} />
                    Subscribe to newsletter
                  </label>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="loading">Updating...</span>
                  ) : (
                    <>
                      <Save size={18} />
                      Save Changes
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="profile-section">
              <div className="section-header">
                <h2>Security</h2>
                <p>Manage your account security settings</p>
              </div>

              <div className="security-actions">
                <button
                  className="btn btn-outline"
                  onClick={() => setShowPasswordForm(!showPasswordForm)}
                >
                  <Shield size={18} />
                  Change Password
                </button>
              </div>

              {showPasswordForm && (
                <form onSubmit={handlePasswordChange} className="password-form">
                  <div className="form-group-profile">
                    <label htmlFor="currentPassword" className="form-label">
                      Current Password
                    </label>
                    <div className="password-input">
                      <input
                        type={showPasswords.current ? 'text' : 'password'}
                        id="currentPassword"
                        name="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordInputChange}
                        className="form-control"
                        required
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => togglePasswordVisibility('current')}
                      >
                        {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="form-group-profile">
                    <label htmlFor="newPassword" className="form-label">
                      New Password
                    </label>
                    <div className="password-input">
                      <input
                        type={showPasswords.new ? 'text' : 'password'}
                        id="newPassword"
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordInputChange}
                        className="form-control"
                        required
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => togglePasswordVisibility('new')}
                      >
                        {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="form-group-profile">
                    <label htmlFor="confirmPassword" className="form-label">
                      Confirm New Password
                    </label>
                    <div className="password-input">
                      <input
                        type={showPasswords.confirm ? 'text' : 'password'}
                        id="confirmPassword"
                        name="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordInputChange}
                        className="form-control"
                        required
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => togglePasswordVisibility('confirm')}
                      >
                        {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="password-form-actions">
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                      {loading ? 'Updating...' : 'Update Password'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowPasswordForm(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          <div className="profile-sidebar">
            <div className="profile-card">
              <h3>Account Status</h3>
              <div className="status-items">
                <div className="status-item">
                  <span className="status-label">Role:</span>
                  <span className={`status-value role-${user?.role}`}>
                    {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
                  </span>
                </div>
                <div className="status-item">
                  <span className="status-label">Newsletter:</span>
                  <span className={`status-value ${user?.newsletter ? 'active' : 'inactive'}`}>
                    {user?.newsletter ? 'Subscribed' : 'Not Subscribed'}
                  </span>
                </div>
                <div className="status-item">
                  <span className="status-label">Server Access:</span>
                  <span className="status-value">
                    {user?.serverAccess?.length || 0} servers
                  </span>
                </div>
              </div>
            </div>

            <div className="profile-card">
              <h3>Recent Activity</h3>
              <div className="activity-list">
                <div className="activity-item">
                  <span className="activity-time">2 hours ago</span>
                  <span className="activity-text">Profile updated</span>
                </div>
                <div className="activity-item">
                  <span className="activity-time">1 day ago</span>
                  <span className="activity-text">Joined event: Weekly Tournament</span>
                </div>
                <div className="activity-item">
                  <span className="activity-time">3 days ago</span>
                  <span className="activity-text">Subscribed to newsletter</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
