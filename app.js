require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const http = require('http');
const socketio = require('socket.io');
const { passport, isAuthenticated } = require('./middleware/auth');
const User = require('./models/User');
const flash = require('connect-flash');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Session configuration
const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
    cookie: {
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
});

app.use(sessionMiddleware);
app.use(flash());

// Share session with Socket.IO
io.use((socket, next) => {
    sessionMiddleware(socket.request, {}, next);
});

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Share passport session with Socket.IO
io.use((socket, next) => {
    passport.initialize()(socket.request, {}, () => {
        passport.session()(socket.request, {}, () => {
            if (socket.request.user) {
                next();
            } else {
                next(new Error('Unauthorized'));
            }
        });
    });
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Function to get location name from coordinates
async function getLocationName(latitude, longitude) {
    try {
        const response = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
        const data = response.data;
        return data.display_name || 'Unknown Location';
    } catch (error) {
        console.error('Error getting location name:', error);
        return 'Unknown Location';
    }
}

// Socket.IO connection handling
const connectedUsers = new Map();

io.on('connection', (socket) => {
    console.log('New client connected:', socket.request.user?.username);

    // Add user to connected users map
    if (socket.request.user) {
        connectedUsers.set(socket.id, {
            id: socket.id,
            username: socket.request.user.username,
            userId: socket.request.user._id,
            latitude: null,
            longitude: null,
            locationName: null
        });
        
        // Broadcast updated user list to all clients
        io.emit('active-users', Array.from(connectedUsers.values()));
    }

    socket.on('send-location', async (data) => {
        try {
            if (socket.request.user) {
                console.log('Processing location for user:', socket.request.user.username);
                console.log('User ID:', socket.request.user._id);
                
                const user = await User.findById(socket.request.user._id);
                if (user) {
                    console.log('Found user in database:', user.username);
                    
                    // Initialize locationHistory if it doesn't exist
                    if (!user.locationHistory) {
                        user.locationHistory = [];
                    }
                    
                    // Get location name
                    const locationName = await getLocationName(data.latitude, data.longitude);
                    
                    // Only store location if it's different from the last one
                    const lastLocation = user.locationHistory.length > 0 ? 
                        user.locationHistory[user.locationHistory.length - 1] : null;
                    
                    const isNewLocation = !lastLocation || 
                        lastLocation.latitude !== data.latitude || 
                        lastLocation.longitude !== data.longitude;

                    if (isNewLocation) {
                        console.log('Storing new location for user:', user.username);
                        
                        user.locationHistory.push({
                            latitude: data.latitude,
                            longitude: data.longitude,
                            locationName: locationName,
                            timestamp: new Date()
                        });
                        await user.save();
                        console.log('Location saved successfully for user:', user.username);
                        console.log('Current location history length:', user.locationHistory.length);
                    }

                    // Update user's location in connected users map
                    if (connectedUsers.has(socket.id)) {
                        connectedUsers.get(socket.id).latitude = data.latitude;
                        connectedUsers.get(socket.id).longitude = data.longitude;
                        connectedUsers.get(socket.id).locationName = locationName;
                        // Broadcast updated user list to all clients
                        io.emit('active-users', Array.from(connectedUsers.values()));
                    }
                } else {
                    console.log('User not found in database');
                }
            } else {
                console.log('No user found in socket request');
            }

            // Broadcast location to all clients
            io.emit('receive-location', {
                id: socket.id,
                ...data,
                username: socket.request.user?.username,
                userId: socket.request.user?._id
            });
        } catch (error) {
            console.error('Error updating location:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.request.user?.username);
        // Remove user from connected users map
        connectedUsers.delete(socket.id);
        // Broadcast updated user list to all clients
        io.emit('active-users', Array.from(connectedUsers.values()));
        io.emit('user-disconnected', socket.id);
    });
});

// Routes
app.get('/', (req, res) => {
    res.render('index', { user: req.user });
});

app.get('/login', (req, res) => {
    res.render('login', { error: req.flash('error') });
});

app.post('/login', passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/login',
    failureFlash: true
}));

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const user = new User({ username, email, password });
        await user.save();
        res.redirect('/login');
    } catch (error) {
        let errorMessage = 'An error occurred during registration.';
        
        // Check for duplicate key error
        if (error.code === 11000) {
            if (error.keyPattern.username) {
                errorMessage = 'Username already exists.';
            } else if (error.keyPattern.email) {
                errorMessage = 'Email already exists.';
            }
        }
        
        res.render('register', { error: errorMessage });
    }
});

app.get('/dashboard', isAuthenticated, (req, res) => {
    res.render('dashboard', { user: req.user });
});

app.get('/logout', (req, res) => {
    req.logout(function(err) {
        if (err) {
            console.error('Error during logout:', err);
            return res.redirect('/');
        }
        req.session.destroy(function(err) {
            if (err) {
                console.error('Error destroying session:', err);
            }
            res.redirect('/');
        });
    });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});