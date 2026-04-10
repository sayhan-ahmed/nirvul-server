const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    uid: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true
    },
    displayName: {
        type: String,
        required: true
    },
    photoURL: {
        type: String
    },
    role: {
        type: String,
        enum: ['student', 'admin'],
        default: 'student'
    },
    institution: {
        type: String,
        default: ''
    },
    location: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', userSchema);
