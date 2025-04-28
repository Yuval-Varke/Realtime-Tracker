# RealTime Tracker

A **real-time location tracking** web application built with **Node.js**, **Express**, **Leaflet.js**, and **WebSockets**.  
Features include:
- **Real-time live location updates** for multiple users on a map.
- **Location history** storage and viewing.
- **Total active users** count display.
- Full **JWT-based authentication** for secure **signup** and **login**.

---

## Features

- 📍 **Live Location Tracking:** Watch users' locations update in real-time on a beautiful Leaflet map.
- 🔒 **Authentication:** Secure login and signup using **JWT** tokens.
- 🗂 **Location History:** Track and view the historical location data of users.
- 👥 **Active User Tracking:** See how many users are currently active on the platform.
- 🛜 **WebSocket Communication:** Instant location updates without page reloads.
  
---

## Technologies Used

- **Node.js** — Backend runtime
- **Express.js** — Server framework
- **Leaflet.js** — Map rendering library
- **Socket.IO** — WebSocket communication
- **JWT (jsonwebtoken)** — Authentication
- **MongoDB (with Mongoose)** — Database for users and location history

---

## Project Setup and Start Guide

### 1. Clone the Repository
```
git clone https://github.com/yourusername/realtime-tracker.git
cd realtime-tracker
```

### 2. Install Dependencies
```
npm install
```

### 3. Setup Environment Variables
Create a `.env` file in the project root and add the following:

```
# MongoDB Connection
MONGODB_URI=your_db_url

# Session Configuration
SESSION_SECRET=your-super-secret-key-change-this-in-production

# Server Configuration
PORT=5000

# Application Settings
NODE_ENV=development
```

### 4. Start the Server

For development with auto-restart on changes:

```
npm run dev
```

Or for production:

```
npm start
```

The server will run at `http://localhost:5000`.

---


## Screenshots

![image](https://github.com/user-attachments/assets/88512b6c-ec28-4fa0-8c9b-9c29185172ad)
![image](https://github.com/user-attachments/assets/ba0231f8-2138-49e4-80b2-3ff46ecbe7a7)



## Future Improvements

- 📱 Mobile responsive UI
- 🗺 Filter location history by date
- 🛡 Role-based access control (admin, user)
- 🌎 Different map layers and views (satellite, terrain)
