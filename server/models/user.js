
const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['student', 'admin'],
    default: 'student'
  },
  phone: {
    type: String,
    trim: true,
    default: ''
  },
  department: {
    type: String,
    trim: true,
    default: ''
  },
  year: {
    type: Number,
    min: 1,
    max: 6,
    default: null
  },
  bio: {
    type: String,
    trim: true,
    maxlength: 300,
    default: ''
  },
  profilePicture: {
    type: String,
    trim: true,
    default: ''
  }
}, { timestamps: true })

module.exports = mongoose.model('User', userSchema)
