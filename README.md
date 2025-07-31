# TGSU - Now In THE WEB! - Node.js Web Application

A full-stack web application for TGSU community with user authentication, event management, server control, and newsletter functionality.

## Features

- 🎮 **Community Platform**: Gaming hub with user management
- 💬 **Real-time Chat**: WebSocket-powered chat system with multiple threads
- 🖼️ **Profile Pictures**: Upload and manage custom profile avatars
- 🎨 **Custom Name Colors**: Personalize your username with custom colors
- 🌓 **Dark/Light Theme**: Toggle between light and dark themes
- 👥 **User Authentication**: Secure registration and login system
- 📅 **Event Management**: Create, join, and manage gaming events
- 🖥️ **Server Control**: Manage game servers with access control
- 📧 **Newsletter**: Subscribe to community updates
- 📱 **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

### Backend
- Node.js & Express.js
- MongoDB for data storage
- WebSocket for real-time chat
- JWT Authentication
- bcrypt for password hashing
- Multer for file uploads
- CORS & Rate limiting

### Frontend
- React.js with React Router
- Context API for state management
- Axios for HTTP requests
- React Toastify for notifications
- Lucide React for icons
- Modern CSS with CSS Variables

## Setup Instructions


### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- MongoDB (see below)

### Installing MongoDB

#### Windows
1. **Download MongoDB Community Server**
   - Go to: https://www.mongodb.com/try/download/community
   - Select the latest version, Windows x64, MSI package.
   - Click "Download".
2. **Run the Installer**
   - Double-click the downloaded `.msi` file.
   - Follow the setup wizard:
     - Choose "Complete" setup.
     - *Optional:* Install MongoDB Compass (GUI).
     - Make sure "Install MongoDB as a Service" is checked.
3. **Finish Installation**
   - Click "Finish" when the installer completes.
4. **Add MongoDB to PATH (if not already)**
   - Open Start Menu, search for "Environment Variables".
   - Edit the `Path` variable in System variables.
   - Add: `C:\Program Files\MongoDB\Server\<version>\bin`
   - Replace `<version>` with your installed version (e.g., `7.0`).
5. **Start MongoDB**
   - MongoDB runs as a Windows service by default.
   - To check status: open Command Prompt and run:
     ```
     net start MongoDB
     ```
   - To connect: open a new Command Prompt and run:
     ```
     mongosh
     ```

#### Linux (Ubuntu/Debian)
1. **Import the public key**
   ```bash
   wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
   ```
2. **Create the source list file**
   ```bash
   echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
   ```
3. **Update and install**
   ```bash
   sudo apt-get update
   sudo apt-get install -y mongodb-org
   ```
4. **Start MongoDB**
   ```bash
   sudo systemctl start mongod
   sudo systemctl enable mongod
   ```
5. **Test connection**
   ```bash
   mongosh
   ```

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd node-web
   ```

2. **Install backend dependencies**
   ```bash
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd client
   npm install --legacy-peer-deps
   cd ..
   ```

4. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   PORT=5000
   NODE_ENV=development
   JWT_SECRET=your_jwt_secret_here
   MONGODB_URI=mongodb://localhost:27017/node-web
   ```


5. **Initialize the database**
   ```bash
   # Run the global chat initialization script
   node initGlobalChat.js
   
   # Run the nameColor migration
   node migrations/add-namecolor.js
   ```

6. **Start the application**
   
   **Option 1: Start both servers simultaneously**
   ```bash
   # In one terminal - Backend
   npm start
   
   # In another terminal - Frontend
   cd client
   npm start
   ```

   **Option 2: Start separately**
   ```bash
   # Backend only
   npm run server
   
   # Frontend only (in another terminal)
   cd client && npm start
   ```

7. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## User Roles & Permissions

### Regular Users
- Create and join events
- Access real-time chat system
- Upload and manage profile pictures
- Customize username colors
- Create and participate in chat threads
- Start private conversations
- View server connection details
- Subscribe to newsletter
- Update profile

### Server Admins
- All user permissions
- Access to server control panels
- Manage assigned servers
- View server statistics

### Site Admins
- All permissions
- Manage all servers
- View newsletter subscribers
- Full system access

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Users & Profiles
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `POST /api/profilePicture/upload` - Upload profile picture
- `DELETE /api/profilePicture` - Delete profile picture

### Chat System
- `GET /api/chat/threads` - Get chat threads
- `POST /api/chat/threads` - Create new thread
- `GET /api/chat/threads/:id/messages` - Get thread messages
- `POST /api/chat/threads/:id/messages` - Send message
- `POST /api/chat/threads/:id/join` - Join thread
- `POST /api/chat/threads/:id/leave` - Leave thread
- `POST /api/chat/threads/:id/mark-read` - Mark thread as read
- `GET /api/chat/private/:userId` - Get/create private chat

### Events
- `GET /api/events` - Get all events
- `POST /api/events` - Create new event
- `PUT /api/events/:id` - Update event
- `DELETE /api/events/:id` - Delete event
- `POST /api/events/:id/join` - Join event
- `POST /api/events/:id/leave` - Leave event

### Servers
- `GET /api/servers` - Get all servers
- `POST /api/servers` - Create new server
- `PUT /api/servers/:id` - Update server
- `DELETE /api/servers/:id` - Delete server

### Newsletter
- `POST /api/newsletter/subscribe` - Subscribe to newsletter
- `POST /api/newsletter/unsubscribe` - Unsubscribe from newsletter
- `GET /api/newsletter/subscribers` - Get subscribers (admin only)


## Default Data

The application starts with no default data. To get started make an admin account:

1. Register a new user account
2. Set your user as an admin:

     ```sh
     mongosh
     use node-web
     db.users.updateOne({ username: "yourusername" }, { $set: { role: "admin" } })
     ```

## Chat System Features

### Thread Types
- **Global Chat**: Community-wide discussion thread
- **Event Threads**: Automatically created for each event
- **Custom Threads**: User-created discussion topics
- **Private Messages**: Direct conversations between users

### Chat Features
- **Real-time Messaging**: Instant message delivery via WebSocket
- **Thread Management**: Create, join, and leave chat threads
- **Read Status**: Track unread message counts
- **Profile Integration**: Display profile pictures and custom name colors
- **Compact Layout**: Optimized message display with avatar alignment
- **Connection Status**: Visual indicators for online/offline status
- **Message History**: Persistent chat history with date separators

## Development Notes

- The app uses JWT tokens for authentication
- Passwords are hashed using bcrypt
- Real-time chat powered by WebSocket connections
- Profile pictures stored as base64 in MongoDB
- Server access is controlled per user
- Theme preference is stored in localStorage
- All forms include validation and error handling
- Chat messages support real-time delivery and read status
- Custom name colors are validated as hex values

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the ISC License.
