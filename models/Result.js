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
    date: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Result', resultSchema);
