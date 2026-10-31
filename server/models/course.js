
const mongoose = require('mongoose')

const resourceSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['PDF', 'PPT', 'VIDEO', 'LINK'],
    required: true
  },
  url: {
    type: String,
    default: '',
    trim: true
  }
})

const lessonSchema = new mongoose.Schema({
  lessonId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  resources: {
    type: [resourceSchema],
    default: []
  }
})

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  instructor: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  duration: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    default: 0
  },
  lessons: {
    type: [lessonSchema],
    default: []
  }
}, {
  timestamps: true
})

module.exports = mongoose.model('Course', courseSchema)
