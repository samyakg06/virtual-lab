require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

// Models
const Room = require('./models/RoomModel');
const User = require('./models/UserModel');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Middleware
app.use(cors({
    origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000'],
    credentials: true
}));
app.use(express.json());

// Setup HTTP Server and Socket.io
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// ─── DATABASE CONNECTION ───
let isDbConnected = false;
const MONGO_URI = process.env.MONGODB_URI;

if (MONGO_URI) {
    mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds instead of hanging
    })
    .then(() => {
        isDbConnected = true;
        console.log('✅ Connected to MongoDB successfully!');
    })
    .catch(err => {
        console.error('❌ MongoDB connection error (using in-memory fallback):', err.message);
        console.error('Make sure your current IP is whitelisted in MongoDB Atlas!');
    });
} else {
    console.warn('⚠️ No MONGODB_URI found. Using in-memory fallback.');
}

// ─── IN-MEMORY FALLBACK STORAGE ───
const memRooms = {};
const memUsers = {};

// ─── Guest Login ───
app.post('/api/auth/guest', async (req, res) => {
    const { name } = req.body;
    try {
        const guestName = name ? name.trim() : `Guest_${Math.floor(1000 + Math.random() * 9000)}`;
        const guestId = `guest_${crypto.randomUUID().replace(/-/g, '')}`;
        const email = `${guestId}@virtuallab.guest`;
        const picture = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(guestName)}`;

        let userId = guestId;

        if (isDbConnected) {
            try {
                const user = new User({ 
                    googleId: guestId, // satisfies schema constraint
                    email, 
                    name: guestName, 
                    picture 
                });
                await user.save();
                userId = user._id.toString();
            } catch (dbErr) {
                console.error('DB error during guest login, falling back to memory:', dbErr);
                memUsers[guestId] = { googleId: guestId, email, name: guestName, picture };
            }
        } else {
            memUsers[guestId] = { googleId: guestId, email, name: guestName, picture };
        }

        const sessionToken = jwt.sign(
            { id: userId, email, name: guestName, picture },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token: sessionToken,
            user: { id: userId, email, name: guestName, picture }
        });
    } catch (error) {
        console.error('Guest Login Error:', error.message);
        res.status(500).json({ error: 'Failed to complete guest login' });
    }
});


// ─── ROOM ROUTES ───

// Create a new room
app.post('/api/rooms', async (req, res) => {
    try {
        const roomId = crypto.randomUUID();
        const projectName = req.body.projectName || 'My Shared Experiment';
        const canvasState = req.body.initialState || {};

        if (isDbConnected) {
            const newRoom = new Room({
                roomId,
                projectName,
                canvasState,
            });
            await newRoom.save();
            console.log(`Room created in DB: ${roomId} — "${projectName}"`);
        } else {
            memRooms[roomId] = {
                roomId,
                projectName,
                canvasState,
                createdAt: Date.now()
            };
            console.log(`Room created in memory: ${roomId} — "${projectName}"`);
        }
        res.json({ roomId });
    } catch (error) {
        console.error('Room creation error:', error);
        res.status(500).json({ error: 'Failed to create room' });
    }
});

// Get an existing room's state
app.get('/api/rooms/:roomId', async (req, res) => {
    const { roomId } = req.params;
    if (!roomId || roomId === 'undefined') {
        return res.status(400).json({ error: 'Invalid room ID' });
    }

    try {
        if (isDbConnected) {
            const room = await Room.findOne({ roomId });
            if (room) {
                return res.json(room);
            }
        }
        
        // Check memory if DB failed or room wasn't in DB
        const memRoom = memRooms[roomId];
        if (memRoom) {
            return res.json(memRoom);
        }

        res.status(404).json({ error: 'Room not found' });
    } catch (err) {
        console.error('Error fetching room:', err);
        res.status(500).json({ error: 'Failed to fetch room' });
    }
});

// Delete a room
app.delete('/api/rooms/:roomId', async (req, res) => {
    const { roomId } = req.params;
    try {
        if (isDbConnected) {
            await Room.deleteOne({ roomId });
        }
        delete memRooms[roomId];
        
        // Kick everyone out of the room
        io.to(roomId).emit('room-deleted');
        
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting room:', err);
        res.status(500).json({ error: 'Failed to delete room' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        dbConnected: isDbConnected,
        memRoomsCount: Object.keys(memRooms).length 
    });
});

// ─── SOCKET.IO LOGIC ───
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        socket.to(roomId).emit('user-joined', socket.id);
        console.log(`Socket ${socket.id} joined room ${roomId}`);
    });

    // Forward physics actions to teammates
    socket.on('canvas-action', (data) => {
        socket.to(data.roomId).emit('canvas-action', data);
    });

    // Forward cursor movements to teammates
    socket.on('cursor-move', (data) => {
        socket.to(data.roomId).emit('cursor-move', { ...data, socketId: socket.id });
    });

    // Save the current canvas state
    socket.on('save-state', async ({ roomId, canvasState }) => {
        console.log(`Saving state for room ${roomId}. Has bodies? ${canvasState?.bodies ? 'Yes (' + canvasState.bodies.length + ')' : 'No'}`);
        if (isDbConnected) {
            try {
                await Room.findOneAndUpdate({ roomId }, { canvasState });
            } catch (err) {
                console.error('Failed to save state to DB:', err);
            }
        } else if (memRooms[roomId]) {
            memRooms[roomId].canvasState = canvasState;
        }
    });

    socket.on('leave-room', (roomId) => {
        socket.leave(roomId);
        socket.to(roomId).emit('user-disconnected', socket.id);
        console.log(`Socket ${socket.id} left room ${roomId}`);
    });

    socket.on('disconnecting', () => {
        for (const room of socket.rooms) {
            if (room !== socket.id) {
                socket.to(room).emit('user-disconnected', socket.id);
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// ─── START SERVER ───
const PORT = process.env.PORT || 3002;

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use.`);
        console.error(`   Kill the other process or set a different PORT in .env`);
        process.exit(1);
    } else {
        console.error('❌ Server error:', err);
        process.exit(1);
    }
});

server.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
    console.log(`   Rooms API:  http://localhost:${PORT}/api/rooms`);
    console.log(`   Health:     http://localhost:${PORT}/api/health`);
});