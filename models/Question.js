const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
    questionText: {
        type: String,
        required: true,
    },
    options: {
        type: [String], // Array of strings for 4 options
        required: true,
        validate: [v => v.length === 4, 'Must have exactly 4 options']
    },
    correctAnswer: {
        type: String,
        required: true,
    }
}, { timestamps: true });

module.exports = mongoose.model('Question', questionSchema);
