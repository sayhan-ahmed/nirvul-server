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

// Get Student Dashboard Stats & Profile Data
app.get('/api/results/dashboard/:uid', async (req, res) => {
    const { uid } = req.params;
    try {
        const results = await Result.find({ userUid: uid }).sort({ date: -1 });
        
        const totalTests = results.length;
        const totalScorePercent = results.reduce((acc, curr) => acc + (curr.score / curr.totalPoints), 0);
        const averageScore = totalTests > 0 ? Math.round((totalScorePercent / totalTests) * 100) : 0;
        
        // 1. Calculate Global Rank
        const allUsersRank = await Result.aggregate([
            { $group: { 
                _id: "$userUid", 
                avgScore: { $avg: { $multiply: [{ $divide: ["$score", "$totalPoints"] }, 100] } } 
            }},
            { $sort: { avgScore: -1 } }
        ]);
        
        const rankIndex = allUsersRank.findIndex(r => r._id === uid);
        const globalRank = rankIndex !== -1 ? rankIndex + 1 : 0;
        const totalStudents = allUsersRank.length;

        // 2. Achievement Milestones detection
        const achievements = [];
        if (totalTests >= 1) achievements.push({ id: 'early_bird', title: 'Early Bird', icon: '🐣', description: 'Completed your first exam!' });
        if (results.some(r => (r.score / r.totalPoints) >= 0.8)) achievements.push({ id: 'expert', title: 'Expert', icon: '🏆', description: 'Scored over 80% in an exam!' });
        if (totalTests >= 5) achievements.push({ id: 'consistent', title: 'Consistent', icon: '🔥', description: 'Completed 5+ exams!' });
        if (results.some(r => r.score === r.totalPoints)) achievements.push({ id: 'perfect', title: 'Perfect', icon: '✨', description: 'Achieved a perfect score!' });

        // 3. Subject-wise Average for Proficiency Graph
        const subjectStatsRaw = await Result.aggregate([
            { $match: { userUid: uid } },
            { $group: { 
                _id: "$subject", 
                avg: { $avg: { $multiply: [{ $divide: ["$score", "$totalPoints"] }, 100] } },
                count: { $sum: 1 },
                total: { $sum: { $multiply: [{ $divide: ["$score", "$totalPoints"] }, 100] } }
            }}
        ]);

        const subjectStats = subjectStatsRaw.map(s => ({
            subject: s._id,
            score: Math.round(s.avg),
            attempts: s.count,
            status: s.avg >= 80 ? 'Strength' : s.avg < 50 ? 'Needs Improvement' : 'Stable'
        }));

        // 4. All Tests History (for profile table)
        const allTests = results.map(r => ({
            name: `${r.subject}: ${r.testName || 'Mock Test'}`,
            version: r.version || 'BV',
            testId: r.testId,
            rawDate: r.date,
            date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            score: `${r.score}/${r.totalPoints}`,
            percentage: Math.round((r.score / r.totalPoints) * 100)
        }));

        // 6. Calculate Last 7 Days Activity & Current Streak
        const last7Days = [];
        let currentStreak = 0;
        let streakBroken = false;
        
        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            
            const hasActivity = results.some(r => {
                const testDate = new Date(r.date || r.createdAt).toISOString().split('T')[0];
                return testDate === dateStr;
            });
            
            last7Days.unshift({
                day: date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0),
                active: hasActivity
            });

            if (hasActivity && !streakBroken) {
                currentStreak++;
            } else if (i > 0 && !hasActivity) {
                streakBroken = true;
            }
        }

        res.json({
            stats: {
                totalTests,
                averageScore,
                globalRank,
                totalStudents,
                currentStreak
            },
            achievements,
            subjectStats,
            allTests,
            streak: last7Days
        });
    } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin Dashboard Stats API
app.get('/api/admin/dashboard-stats', async (req, res) => {
    try {
        // 1. Total Students
        const totalStudents = await User.countDocuments({ role: 'student' });
        
        // 2. Active Courses (Unique subjects tested)
        const activeCourses = await Result.distinct('subject');
        
        // 3. Skill Graph (Global Subject Averages)
        const skillGraphData = await Result.aggregate([
            { $group: { 
                _id: "$subject", 
                avgScore: { $avg: { $multiply: [{ $divide: ["$score", "$totalPoints"] }, 100] } } 
            }},
            { $limit: 5 } // Top 5 for radar chart
        ]);

        // 4. Top Members (Ranking by average performance)
        const topMembersRaw = await Result.aggregate([
            { $group: {
                _id: "$userUid",
                avgScore: { $avg: { $multiply: [{ $divide: ["$score", "$totalPoints"] }, 100] } },
                testCount: { $sum: 1 }
            }},
            { $sort: { avgScore: -1 } },
            { $limit: 10 },
            { $lookup: {
                from: "users",
                localField: "_id",
                foreignField: "uid",
                as: "userDetails"
            }}
        ]);

        const topMembers = topMembersRaw.map(m => ({
            name: m.userDetails[0]?.displayName || "Unknown Student",
            photoURL: m.userDetails[0]?.photoURL || null,
            score: Math.round(m.avgScore),
            color: m.avgScore >= 80 ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-orange-600'
        }));

        // 5. Exam Progress (Last 7 days usage)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const progressDataRaw = await Result.aggregate([
            { $match: { date: { $gte: sevenDaysAgo } } },
            { $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                count: { $sum: 1 }
            }},
            { $sort: { "_id": 1 } }
        ]);

        res.json({
            stats: {
                totalStudents: totalStudents || 0,
                activeCourses: activeCourses.length || 0
            },
            skillGraph: skillGraphData.map(s => ({
                subject: s._id,
                score: Math.round(s.avgScore)
            })),
            topMembers,
            progress: progressDataRaw.map(p => ({
                label: new Date(p._id).toLocaleDateString('en-US', { weekday: 'short' }),
                value: p.count
            }))
        });

    } catch (err) {
        console.error('Error fetching admin stats:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
