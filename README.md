# TGSU - Now In THE WEB! - Node.js Web Application

A full-stack web application for TGSU community with user authentication, event management, server control, and newsletter functionality.

## Features

- 🎮 **Community Platform**: Gaming hub with user management
- 🌓 **Dark/Light Theme**: Toggle between light and dark themes
- 👥 **User Authentication**: Secure registration and login system
- 📅 **Event Management**: Create, join, and manage gaming events
- 🖥️ **Server Control**: Manage game servers with access control
- 📧 **Newsletter**: Subscribe to community updates
- 📱 **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

### Backend
- Node.js & Express.js
- MongoDB with Mongoose
- LowDB used in development
- JWT Authentication
- bcrypt for password hashing
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


5. **Start the application**
   
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

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## User Roles & Permissions

### Regular Users
- Create and join events
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

The application starts with no default data. To get started:

1. Register a new user account
2. Create some events to populate the calendar
3. Add servers (requires admin privileges)
4. Subscribe to the newsletter

## Development Notes

- The app uses JWT tokens for authentication
- Passwords are hashed using bcrypt
- Server access is controlled per user
- Theme preference is stored in localStorage
- All forms include validation and error handling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the ISC License.
