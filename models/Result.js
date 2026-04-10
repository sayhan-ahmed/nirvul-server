const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
    userUid: {
        type: String,
        required: true,
        index: true
    },
    subject: {
        type: String,
        required: true
    },
    testId: {
        type: String,
        required: true,
        index: true
    },
    testName: {
        type: String,
        required: true
    },
    score: {
        type: Number,
        required: true
    },
    totalPoints: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['Passed', 'Improve'],
        required: true
    },
    version: {
        type: String,
        enum: ['EV', 'BV'],
        required: false
    },
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Result', resultSchema);
