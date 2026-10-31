const mongoose = require('mongoose')

const quizAttemptSchema = new mongoose.Schema({
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true
  },

  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  answers: [
    {
      questionId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
      },

      selectedOption: {
        type: Number,
        min: 0,
        max: 3
      }
    }
  ],

  score: {
    type: Number,
    required: true,
    min: 0
  },

  totalMarks: {
    type: Number,
    required: true,
    min: 0
  },

  submittedAt: {
    type: Date,
    default: Date.now
  }

}, { timestamps: true })

module.exports = mongoose.model('QuizAttempt', quizAttemptSchema)