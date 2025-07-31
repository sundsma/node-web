import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-toastify';
import { Calendar, MapPin, Users, Plus, Edit, Trash2, User, MessageCircle } from 'lucide-react';
import axios from 'axios';
import './Events.css';

const Events = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    endDate: '',
    location: '',
    maxAttendees: '',
    isPublic: true,
    tags: ''
  });
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await axios.get('/api/events');
      setEvents(response.data.events || []);
    } catch (error) {
      toast.error('Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast.error('Please sign in to create events');
      return;
    }

    try {
      const eventData = {
        ...formData,
        maxAttendees: formData.maxAttendees ? parseInt(formData.maxAttendees) : 0,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      };

      if (editingEvent) {
        await axios.put(`/api/events/${editingEvent._id}`, eventData);
        toast.success('Event updated successfully');
      } else {
        await axios.post('/api/events', eventData);
        toast.success('Event created successfully');
      }

      setShowEventForm(false);
      setEditingEvent(null);
      resetForm();
      fetchEvents();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save event');
    }
  };

  const handleJoinEvent = async (eventId) => {
    if (!isAuthenticated) {
      toast.error('Please sign in to join events');
      return;
    }

    if (!user) {
      toast.error('User information not available. Please refresh the page.');
      return;
    }

    try {
      const response = await axios.post(`/api/events/${eventId}/join`);
      toast.success('Successfully joined event');
      fetchEvents();
    } catch (error) {
      console.error('Join event error:', error);
      toast.error(error.response?.data?.message || 'Failed to join event');
    }
  };

  const handleLeaveEvent = async (eventId) => {
    try {
      await axios.post(`/api/events/${eventId}/leave`);
      toast.success('Successfully left event');
      fetchEvents();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to leave event');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await axios.delete(`/api/events/${eventId}`);
        toast.success('Event deleted successfully');
        fetchEvents();
      } catch (error) {
        toast.error('Failed to delete event');
      }
    }
  };

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description,
      date: new Date(event.date).toISOString().slice(0, 16),
      endDate: event.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : '',
      location: event.location || '',
      maxAttendees: event.maxAttendees || '',
      isPublic: event.isPublic,
      tags: event.tags?.join(', ') || ''
    });
    setShowEventForm(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      date: '',
      endDate: '',
      location: '',
      maxAttendees: '',
      isPublic: true,
      tags: ''
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isEventPast = (dateString) => {
    return new Date(dateString) < new Date();
  };

  const isUserAttending = (event) => {
    if (!user || !event.attendees) return false;
    return event.attendees.some(attendee => {
      // Handle both populated and non-populated attendees
      const attendeeId = attendee._id || attendee;
      const userId = user.id || user._id;
      return attendeeId.toString() === userId.toString();
    });
  };

  const canEditEvent = (event) => {
    if (!user) return false;
    const userId = user.id || user._id;
    const organizerId = event.organizer._id || event.organizer;
    return organizerId.toString() === userId.toString() || user.role === 'admin';
  };

  const createEventChat = async (eventId) => {
    try {
      const response = await axios.post(`/api/chat/events/${eventId}/thread`);
      
      if (response.data.message === 'Event thread already exists') {
        toast.info('Event chat already exists');
      } else {
        toast.success('Event chat created successfully');
      }
      
      fetchEvents(); // Refresh to get updated event data
      
      // Navigate to chat after a brief delay
      setTimeout(() => {
        window.location.href = '/chat';
      }, 1500);
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error('Only event organizers can create event chats');
      } else {
        toast.error(error.response?.data?.message || 'Failed to create event chat');
      }
    }
  };

  const joinEventChat = async (eventId) => {
    try {
      // First check if thread exists
      const response = await axios.get('/api/chat/threads');
      const eventThread = response.data.threads.find(thread => 
        thread.type === 'event' && thread.eventId === eventId
      );
      
      if (eventThread) {
        // Join existing thread and navigate
        await axios.post(`/api/chat/threads/${eventThread._id}/join`);
        window.location.href = '/chat';
      } else {
        // If no thread exists, show error (this shouldn't happen for attendees)
        toast.error('Event chat not available yet. Ask the event organizer to create it.');
      }
    } catch (error) {
      toast.error('Failed to join event chat');
    }
  };

  const handleCreateOrJoinEventChat = async (event) => {
    const isOrganizer = canEditEvent(event);
    
    if (isOrganizer) {
      // Check if thread already exists
      try {
        const response = await axios.get('/api/chat/threads');
        const eventThread = response.data.threads.find(thread => 
          thread.type === 'event' && thread.eventId === event._id
        );
        
        if (eventThread) {
          // Thread exists, just navigate
          window.location.href = '/chat';
        } else {
          // Create new thread
          await createEventChat(event._id);
        }
      } catch (error) {
        toast.error('Failed to access event chat');
      }
    } else {
      // Regular attendee - join existing chat
      joinEventChat(event._id);
    }
  };

  if (loading) {
    return (
      <div className="events-container">
        <div className="container">
          <div className="loading-state">
            <div className="loading"></div>
            <p>Loading events...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="events-container">
      <div className="container">
        <div className="events-header">
          <h1>Community Events</h1>
          <p>Discover and join exciting gaming events in our community</p>
          
          {isAuthenticated && (
            <button
              className="btn btn-primary"
              onClick={() => setShowEventForm(true)}
            >
              <Plus size={20} />
              Create Event
            </button>
          )}
        </div>

        {showEventForm && (
          <div className="event-form-overlay">
            <div className="event-form-modal">
              <div className="event-form-header">
                <h3>{editingEvent ? 'Edit Event' : 'Create New Event'}</h3>
                <button
                  className="close-btn"
                  onClick={() => {
                    setShowEventForm(false);
                    setEditingEvent(null);
                    resetForm();
                  }}
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleFormSubmit} className="event-form">
                <div className="form-group">
                  <label htmlFor="title">Event Title</label>
                  <input
                    type="text"
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    className="form-control"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="form-control"
                    rows="3"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="date">Start Date & Time</label>
                    <input
                      type="datetime-local"
                      id="date"
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      className="form-control"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="endDate">End Date & Time</label>
                    <input
                      type="datetime-local"
                      id="endDate"
                      value={formData.endDate}
                      onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                      className="form-control"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="location">Location</label>
                    <input
                      type="text"
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      className="form-control"
                      placeholder="Online, Discord, etc."
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="maxAttendees">Max Attendees</label>
                    <input
                      type="number"
                      id="maxAttendees"
                      value={formData.maxAttendees}
                      onChange={(e) => setFormData({...formData, maxAttendees: e.target.value})}
                      className="form-control"
                      min="0"
                      placeholder="0 for unlimited"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="tags">Tags (comma-separated)</label>
                  <input
                    type="text"
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => setFormData({...formData, tags: e.target.value})}
                    className="form-control"
                    placeholder="tournament, casual, minecraft, etc."
                  />
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.isPublic}
                      onChange={(e) => setFormData({...formData, isPublic: e.target.checked})}
                    />
                    Public Event
                  </label>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn btn-primary">
                    {editingEvent ? 'Update Event' : 'Create Event'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowEventForm(false);
                      setEditingEvent(null);
                      resetForm();
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {events.length === 0 ? (
          <div className="empty-state">
            <Calendar size={64} />
            <h3>No Events Found</h3>
            <p>There are no upcoming events. Check back later or create your own!</p>
          </div>
        ) : (
          <div className="events-grid">
            {events.map(event => (
              <div key={event._id} className={`event-card ${isEventPast(event.date) ? 'past-event' : ''}`}>
                <div className="event-header">
                  <h3 className="event-title">{event.title}</h3>
                  <div className="event-organizer">
                    <User size={16} />
                    <span>{event.organizer.username}</span>
                  </div>
                </div>

                <div className="event-details">
                  <div className="event-date">
                    <Calendar size={16} />
                    <span>{formatDate(event.date)}</span>
                  </div>

                  {event.location && (
                    <div className="event-location">
                      <MapPin size={16} />
                      <span>{event.location}</span>
                    </div>
                  )}

                  <div className="event-attendees">
                    <Users size={16} />
                    <span>
                      {event.attendees?.length || 0}
                      {event.maxAttendees > 0 && ` / ${event.maxAttendees}`} attendees
                    </span>
                    {canEditEvent(event) && (
                      <span className="attendees-list">
                        {event.attendees?.map(attendee => (
                          <span key={attendee._id} className="attendee">
                            {attendee.username}
                          </span>
                        ))}
                      </span>
                    )}
                  </div>
                </div>

                {event.description && (
                  <p className="event-description">{event.description}</p>
                )}

                {event.tags && event.tags.length > 0 && (
                  <div className="event-tags">
                    {event.tags.map(tag => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                )}

                <div className="event-actions">
                  {isAuthenticated && !isEventPast(event.date) && (
                    <div className="attendance-actions">
                      {isUserAttending(event) ? (
                        <>
                          <button
                            className="btn btn-danger"
                            onClick={() => handleLeaveEvent(event._id)}
                          >
                            Leave Event
                          </button>
                          {/* Event Chat Button for Attendees */}
                          <button
                            className="btn btn-outline"
                            onClick={() => handleCreateOrJoinEventChat(event)}
                            title="Join Event Chat"
                          >
                            <MessageCircle size={16} />
                            Chat
                          </button>
                        </>
                      ) : (
                        <button
                          className="btn btn-success"
                          onClick={() => handleJoinEvent(event._id)}
                          disabled={event.maxAttendees > 0 && event.attendees?.length >= event.maxAttendees}
                        >
                          {event.maxAttendees > 0 && event.attendees?.length >= event.maxAttendees ? 'Full' : 'Join Event'}
                        </button>
                      )}
                    </div>
                  )}

                  {canEditEvent(event) && (
                    <div className="admin-actions">
                      <button
                        className="btn btn-outline"
                        onClick={() => handleCreateOrJoinEventChat(event)}
                        title="Create/Access Event Chat"
                      >
                        <MessageCircle size={16} />
                        Chat
                      </button>
                      <button
                        className="btn btn-outline"
                        onClick={() => handleEditEvent(event)}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDeleteEvent(event._id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Events;
