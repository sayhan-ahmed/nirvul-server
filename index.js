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
const Result = require('./models/Result');

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

// Save Test Result
app.post('/api/results', async (req, res) => {
    const { userUid, subject, testId, testName, score, totalPoints } = req.body;
    try {
        const status = (score / totalPoints) >= 0.5 ? 'Passed' : 'Improve';
        const newResult = new Result({
            userUid,
            subject,
            testId,
            testName,
            score,
            totalPoints,
            status: (score / totalPoints) >= 0.8 ? 'Passed' : 'Improve',
            version: req.body.version
        });
        await newResult.save();
        res.json(newResult);
    } catch (err) {
        console.error('Error saving result:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get User History for Specific Test Lockout/Scores
app.get('/api/results/user/:uid', async (req, res) => {
    const { uid } = req.params;
    try {
        const results = await Result.find({ userUid: uid }).sort({ date: -1 });
        res.json(results);
    } catch (err) {
        console.error('Error fetching user results:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get Student Dashboard Stats
app.get('/api/results/dashboard/:uid', async (req, res) => {
    const { uid } = req.params;
    try {
        const results = await Result.find({ userUid: uid }).sort({ date: -1 });
        
        const totalTests = results.length;
        const totalScorePercent = results.reduce((acc, curr) => acc + (curr.score / curr.totalPoints), 0);
        const averageScore = totalTests > 0 ? Math.round((totalScorePercent / totalTests) * 100) : 0;
        
        // Subject-wise Average for Proficiency Graph
        const subjectStats = await Result.aggregate([
            { $match: { userUid: uid } },
            { $group: { 
                _id: "$subject", 
                avg: { $avg: { $multiply: [{ $divide: ["$score", "$totalPoints"] }, 100] } } 
            }}
        ]);

        const recentTests = results.slice(0, 5).map(r => ({
            name: `${r.subject}: ${r.testName || 'Mock Test'}`,
            version: r.version || 'BV',
            testId: r.testId,
            rawDate: r.date,
            date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            score: `${r.score}/${r.totalPoints}`,
            percentage: Math.round((r.score / r.totalPoints) * 100)
        }));

        res.json({
            stats: {
                totalTests,
                averageScore
            },
            subjectStats: subjectStats.map(s => ({
                subject: s._id,
                score: Math.round(s.avg)
            })),
            recentTests
        });
    } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
