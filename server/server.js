
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const dotenv = require('dotenv')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const Course = require('./models/course')
const User = require('./models/user')
const Enrollment = require('./models/Enrollment')

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 5000

// Authentication middleware
async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      message: 'Authentication required. Please log in.'
    })
  }

  const token = authHeader.split(' ')[1]

  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        message: 'JWT_SECRET is not configured.'
      })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const user = await User.findById(decoded.userId).select('_id role')

    if (!user) {
      return res.status(401).json({
        message: 'User account not found. Please log in again.'
      })
    }

    req.userId = user._id.toString()
    req.userRole = user.role || 'student'

    next()
  } catch (error) {
    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError'
    ) {
      return res.status(401).json({
        message: 'Invalid or expired token. Please log in again.'
      })
    }

    return res.status(500).json({
      message: 'Authentication failed.'
    })
  }
}

// Admin authorization middleware
function requireAdmin(req, res, next) {
  if (req.userRole !== 'admin') {
    return res.status(403).json({
      message: 'Access denied. Admin privileges are required.'
    })
  }

  next()
}

// Home route
app.get('/', (req, res) => {
  res.send('Welcome to LearnSphere API!')
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    message: 'LearnSphere server is running'
  })
})

// Get all courses
app.get('/api/courses', async (req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 })
    res.json(courses)
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch courses.'
    })
  }
})

// Create a course - Admin only
app.post('/api/courses', verifyToken, requireAdmin, async (req, res) => {
  try {
    const {
      title,
      instructor,
      description,
      category,
      duration,
      price
    } = req.body

    const course = await Course.create({
      title,
      instructor,
      description,
      category,
      duration,
      price
    })

    res.status(201).json({
      message: 'Course created successfully',
      course
    })
  } catch (error) {
    res.status(400).json({
      message: 'Failed to create course.',
      error: error.message
    })
  }
})

// Update a course - Admin only
app.put(
  '/api/courses/:id',
  verifyToken,
  requireAdmin,
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
          message: 'Invalid course ID.'
        })
      }

      const {
        title,
        instructor,
        description,
        category,
        duration,
        price
      } = req.body

      const course = await Course.findByIdAndUpdate(
        req.params.id,
        {
          title,
          instructor,
          description,
          category,
          duration,
          price
        },
        {
          new: true,
          runValidators: true
        }
      )

      if (!course) {
        return res.status(404).json({
          message: 'Course not found.'
        })
      }

      res.json({
        message: 'Course updated successfully',
        course
      })
    } catch (error) {
      res.status(400).json({
        message: 'Unable to update course.'
      })
    }
  }
)

// Delete a course - Admin only
app.delete(
  '/api/courses/:id',
  verifyToken,
  requireAdmin,
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
          message: 'Invalid course ID.'
        })
      }

      const course = await Course.findByIdAndDelete(req.params.id)

      if (!course) {
        return res.status(404).json({
          message: 'Course not found.'
        })
      }

      res.json({
        message: 'Course deleted successfully'
      })
    } catch (error) {
      res.status(400).json({
        message: 'Unable to delete course.'
      })
    }
  }
)

// Student registration
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: 'Name, email, and password are required.'
      })
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: 'Password must contain at least 8 characters.'
      })
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        message: 'JWT_SECRET is not configured.'
      })
    }

    const normalizedEmail = email.trim().toLowerCase()

    const existingUser = await User.findOne({
      email: normalizedEmail
    })

    if (existingUser) {
      return res.status(409).json({
        message: 'An account with this email already exists.'
      })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    // Never accept a role supplied by the registration form
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: 'student'
    })

    res.status(201).json({
      message: 'Registration successful!',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'An account with this email already exists.'
      })
    }

    res.status(500).json({
      message: 'Registration failed.'
    })
  }
})

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      !password
    ) {
      return res.status(400).json({
        message: 'Email and password are required.'
      })
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        message: 'JWT_SECRET is not configured.'
      })
    }

    const user = await User.findOne({
      email: email.trim().toLowerCase()
    })

    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password.'
      })
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    )

    if (!passwordMatches) {
      return res.status(401).json({
        message: 'Invalid email or password.'
      })
    }

    const role = user.role || 'student'

    const token = jwt.sign(
      {
        userId: user._id.toString()
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '1h'
      }
    )

    res.json({
      message: 'Login successful!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role
      }
    })
  } catch (error) {
    res.status(500).json({
      message: 'Login failed.'
    })
  }
})

// Enroll in a course
app.post('/api/enrollments', verifyToken, async (req, res) => {
  try {
    const { courseId } = req.body

    if (!courseId || !mongoose.isValidObjectId(courseId)) {
      return res.status(400).json({
        message: 'A valid course ID is required.'
      })
    }

    const course = await Course.findById(courseId)

    if (!course) {
      return res.status(404).json({
        message: 'Course not found.'
      })
    }

    const existingEnrollment = await Enrollment.findOne({
      student: req.userId,
      course: courseId
    })

    if (existingEnrollment) {
      return res.status(409).json({
        message: 'You are already enrolled in this course.'
      })
    }

    const enrollment = await Enrollment.create({
      student: req.userId,
      course: courseId
    })

    res.status(201).json({
      message: 'Successfully enrolled in the course!',
      enrollment
    })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'You are already enrolled in this course.'
      })
    }

    res.status(500).json({
      message: 'Enrollment failed.'
    })
  }
})

// Get courses enrolled by the logged-in user
app.get(
  '/api/enrollments/my-courses',
  verifyToken,
  async (req, res) => {
    try {
      const enrollments = await Enrollment.find({
        student: req.userId
      })
        .populate('course')
        .sort({ enrolledAt: -1 })

      res.json(enrollments)
    } catch (error) {
      res.status(500).json({
        message: 'Failed to fetch enrolled courses.'
      })
    }
  }
)

// Get lessons and progress for one enrolled course
app.get(
  '/api/enrollments/course/:courseId',
  verifyToken,
  async (req, res) => {
    try {
      const { courseId } = req.params

      if (!mongoose.isValidObjectId(courseId)) {
        return res.status(400).json({
          message: 'Invalid course ID.'
        })
      }

      const enrollment = await Enrollment.findOne({
        student: req.userId,
        course: courseId
      }).populate('course')

      if (!enrollment) {
        return res.status(404).json({
          message: 'Enrollment not found. Please enroll first.'
        })
      }

      if (!enrollment.course) {
        return res.status(404).json({
          message: 'Course not found.'
        })
      }

      res.json({
        enrollmentId: enrollment._id,
        course: enrollment.course,
        completedLessons: enrollment.completedLessons,
        progress: enrollment.progress,
        completed: enrollment.completed
      })
    } catch (error) {
      res.status(500).json({
        message: 'Failed to load course lessons.'
      })
    }
  }
)

// Mark a lesson as complete and update progress
app.patch(
  '/api/enrollments/:enrollmentId/lessons/:lessonId',
  verifyToken,
  async (req, res) => {
    try {
      const { enrollmentId, lessonId } = req.params

      if (!mongoose.isValidObjectId(enrollmentId)) {
        return res.status(400).json({
          message: 'Invalid enrollment ID.'
        })
      }

      const enrollment = await Enrollment.findOne({
        _id: enrollmentId,
        student: req.userId
      }).populate('course')

      if (!enrollment) {
        return res.status(404).json({
          message: 'Enrollment not found.'
        })
      }

      if (!enrollment.course) {
        return res.status(404).json({
          message: 'Course not found.'
        })
      }

      const lessonExists = enrollment.course.lessons.some(
        lesson => lesson.lessonId === lessonId
      )

      if (!lessonExists) {
        return res.status(404).json({
          message: 'Lesson not found in this course.'
        })
      }

      if (!enrollment.completedLessons.includes(lessonId)) {
        enrollment.completedLessons.push(lessonId)
      }

      const totalLessons = enrollment.course.lessons.length
      const completedCount = enrollment.completedLessons.length

      enrollment.progress = totalLessons > 0
        ? Math.round((completedCount / totalLessons) * 100)
        : 0

      enrollment.completed = totalLessons > 0 &&
        completedCount === totalLessons

      await enrollment.save()

      res.json({
        message: 'Lesson marked as complete!',
        completedLessons: enrollment.completedLessons,
        progress: enrollment.progress,
        completed: enrollment.completed
      })
    } catch (error) {
      res.status(500).json({
        message: 'Failed to update lesson progress.'
      })
    }
  }
)

// Connect to MongoDB and start server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected successfully')

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`LearnSphere server running on port ${PORT}`)
    })
  })
  .catch(error => {
    console.error('MongoDB connection failed:', error.message)
  })
