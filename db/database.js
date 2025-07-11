const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Initialize default data structure
const defaultData = {
  users: [],
  servers: [
    {
      id: uuidv4(),
      name: "Main Game Server",
      ip: "192.168.1.100",
      port: 7777,
      game: "Counter-Strike 2",
      status: "online",
      players: 12,
      maxPlayers: 24,
      description: "Main competitive server",
      adminUsers: ["admin"],
      createdAt: new Date().toISOString()
    },
    {
      id: uuidv4(),
      name: "Practice Server",
      ip: "192.168.1.101",
      port: 7778,
      game: "Counter-Strike 2",
      status: "online",
      players: 3,
      maxPlayers: 10,
      description: "Practice and training server",
      adminUsers: ["admin"],
      createdAt: new Date().toISOString()
    },
    {
      id: uuidv4(),
      name: "Minecraft Creative",
      ip: "mc.example.com",
      port: 25565,
      game: "Minecraft",
      status: "online",
      players: 8,
      maxPlayers: 20,
      description: "Creative building server",
      adminUsers: ["admin"],
      createdAt: new Date().toISOString()
    }
  ],
  events: [
    {
      id: uuidv4(),
      title: "CS2 Tournament",
      description: "Monthly competitive tournament with prizes!",
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(), // 3 hours later
      location: "Main Game Server",
      maxAttendees: 16,
      isPublic: true,
      tags: ["tournament", "competitive", "cs2"],
      organizer: { username: "admin", email: "admin@example.com" },
      attendees: [],
      createdAt: new Date().toISOString()
    },
    {
      id: uuidv4(),
      title: "Minecraft Build Contest",
      description: "Build the most creative structure in 2 hours!",
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
      endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(), // 2 hours later
      location: "Minecraft Creative Server",
      maxAttendees: 10,
      isPublic: true,
      tags: ["building", "creative", "minecraft"],
      organizer: { username: "admin", email: "admin@example.com" },
      attendees: [],
      createdAt: new Date().toISOString()
    }
  ],
  newsletters: []
};

// Initialize database
const adapter = new JSONFile('db.json');
const db = new Low(adapter, defaultData);

// Database operations
class Database {
  async init() {
    await db.read();
    db.data = db.data || defaultData;
    await db.write();
  }

  // User operations
  async createUser(userData) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const user = {
      id: uuidv4(),
      username: userData.username,
      email: userData.email,
      password: hashedPassword,
      role: userData.role || 'user',
      serverAccess: userData.serverAccess || [],
      createdAt: new Date().toISOString()
    };
    
    db.data.users.push(user);
    await db.write();
    
    // Return user without password
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findUserByEmail(email) {
    return db.data.users.find(user => user.email === email);
  }

  async findUserByUsername(username) {
    return db.data.users.find(user => user.username === username);
  }

  async findUserById(id) {
    const user = db.data.users.find(user => user.id === id);
    if (user) {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    return null;
  }

  async updateUser(id, updates) {
    const userIndex = db.data.users.findIndex(user => user.id === id);
    if (userIndex !== -1) {
      db.data.users[userIndex] = { ...db.data.users[userIndex], ...updates };
      await db.write();
      const { password, ...userWithoutPassword } = db.data.users[userIndex];
      return userWithoutPassword;
    }
    return null;
  }

  // Server operations
  async getAllServers() {
    return db.data.servers;
  }

  async getServerById(id) {
    return db.data.servers.find(server => server.id === id);
  }

  async createServer(serverData) {
    const server = {
      id: uuidv4(),
      ...serverData,
      createdAt: new Date().toISOString()
    };
    
    db.data.servers.push(server);
    await db.write();
    return server;
  }

  async updateServer(id, updates) {
    const serverIndex = db.data.servers.findIndex(server => server.id === id);
    if (serverIndex !== -1) {
      db.data.servers[serverIndex] = { ...db.data.servers[serverIndex], ...updates };
      await db.write();
      return db.data.servers[serverIndex];
    }
    return null;
  }

  async deleteServer(id) {
    const serverIndex = db.data.servers.findIndex(server => server.id === id);
    if (serverIndex !== -1) {
      const deletedServer = db.data.servers.splice(serverIndex, 1)[0];
      await db.write();
      return deletedServer;
    }
    return null;
  }

  // Event operations
  async getAllEvents() {
    return db.data.events;
  }

  async getEventById(id) {
    return db.data.events.find(event => event.id === id);
  }

  async createEvent(eventData) {
    const event = {
      id: uuidv4(),
      ...eventData,
      attendees: [],
      createdAt: new Date().toISOString()
    };
    
    db.data.events.push(event);
    await db.write();
    return event;
  }

  async updateEvent(id, updates) {
    const eventIndex = db.data.events.findIndex(event => event.id === id);
    if (eventIndex !== -1) {
      db.data.events[eventIndex] = { ...db.data.events[eventIndex], ...updates };
      await db.write();
      return db.data.events[eventIndex];
    }
    return null;
  }

  async deleteEvent(id) {
    const eventIndex = db.data.events.findIndex(event => event.id === id);
    if (eventIndex !== -1) {
      const deletedEvent = db.data.events.splice(eventIndex, 1)[0];
      await db.write();
      return deletedEvent;
    }
    return null;
  }

  async joinEvent(eventId, user) {
    const event = await this.getEventById(eventId);
    if (event) {
      const isAlreadyAttending = event.attendees.some(attendee => attendee.username === user.username);
      if (!isAlreadyAttending) {
        event.attendees.push({ username: user.username, email: user.email });
        await this.updateEvent(eventId, { attendees: event.attendees });
      }
      return event;
    }
    return null;
  }

  async leaveEvent(eventId, user) {
    const event = await this.getEventById(eventId);
    if (event) {
      event.attendees = event.attendees.filter(attendee => attendee.username !== user.username);
      await this.updateEvent(eventId, { attendees: event.attendees });
      return event;
    }
    return null;
  }

  // Newsletter operations
  async subscribeToNewsletter(email) {
    const existingSubscription = db.data.newsletters.find(sub => sub.email === email);
    if (!existingSubscription) {
      const subscription = {
        id: uuidv4(),
        email,
        subscribedAt: new Date().toISOString(),
        active: true
      };
      db.data.newsletters.push(subscription);
      await db.write();
      return subscription;
    }
    return existingSubscription;
  }

  async unsubscribeFromNewsletter(email) {
    const subscriptionIndex = db.data.newsletters.findIndex(sub => sub.email === email);
    if (subscriptionIndex !== -1) {
      db.data.newsletters[subscriptionIndex].active = false;
      await db.write();
      return db.data.newsletters[subscriptionIndex];
    }
    return null;
  }

  async getAllNewsletterSubscriptions() {
    return db.data.newsletters.filter(sub => sub.active);
  }
}

module.exports = new Database();
