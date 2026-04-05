const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB successfully!'))
    .catch((err) => console.error('MongoDB connection error:', err));


const User = require('./models/User');

// Basic Route
app.get('/', (req, res) => {
    res.send('Server is running');
});

// User Sync API
app.post('/api/users', async (req, res) => {
    const { uid, email, displayName, photoURL } = req.body;
    try {
        let user = await User.findOne({ uid });
        
        if (user) {
            user.email = email;
            user.displayName = displayName;
            user.photoURL = photoURL;
            await user.save();
        } else {
            user = new User({
                uid,
                email,
                displayName,
                photoURL,
                role: 'student'
            });
            await user.save();
        }
        
        res.json(user);
    } catch (err) {
        console.error('Error in user sync:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
