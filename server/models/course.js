
const mongoose = require('mongoose')

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
  }
})

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  instructor: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  duration: { type: String, required: true },
  price: { type: Number, default: 0 },
  lessons: {
    type: [lessonSchema],
    default: []
  }
}, { timestamps: true })

module.exports = mongoose.model('Course', courseSchema)
