const mongoose = require('mongoose');

const examRecordSchema = new mongoose.Schema({
    studentName: {
        type: String,
        required: true,
    },
    studentEmail: {
        type: String,
        required: true,
    },
    studentUid: {
        type: String,
        required: true,
    },
    score: {
        type: Number,
        required: true,
    },
    totalQuestions: {
        type: Number,
        required: true,
    },
    submittedAnswers: [{
        questionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Question'
        },
        selectedOption: String,
        isCorrect: Boolean
    }]
}, { timestamps: true });

module.exports = mongoose.model('ExamRecord', examRecordSchema);
