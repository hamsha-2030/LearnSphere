
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const dotenv = require('dotenv')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const PDFDocument = require('pdfkit')

dotenv.config()

const Course = require('./models/course')
const User = require('./models/user')
const Enrollment = require('./models/Enrollment')
const Quiz = require('./models/Quiz')
const QuizAttempt = require('./models/QuizAttempt')
const Certificate = require('./models/Certificate')

const app = express()
const PORT = process.env.PORT || 5000
const PASS_PERCENTAGE = 80

app.use(cors())
app.use(express.json())

// ==========================================
// FILE UPLOAD CONFIGURATION
// ==========================================

const uploadDirectory = path.join(__dirname, 'uploads')

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory)
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase()
    cb(null, `${crypto.randomUUID()}${extension}`)
  }
})

const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase()
    const allowedExtensions = ['.pdf', '.ppt', '.pptx']

    if (allowedExtensions.includes(extension)) {
      cb(null, true)
    } else {
      cb(new Error('Only PDF, PPT and PPTX files are allowed.'))
    }
  }
})

app.use('/uploads', express.static(uploadDirectory))

// ==========================================
// AUTHENTICATION MIDDLEWARE
// ==========================================

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

function requireAdmin(req, res, next) {
  if (req.userRole !== 'admin') {
    return res.status(403).json({
      message: 'Access denied. Admin privileges are required.'
    })
  }

  next()
}

// ==========================================
// HOME AND HEALTH
// ==========================================

app.get('/', (req, res) => {
  res.send('Welcome to LearnSphere API!')
})

app.get('/api/health', (req, res) => {
  res.json({
    message: 'LearnSphere server is running'
  })
})

// ==========================================
// COURSE ROUTES
// ==========================================

app.get('/api/courses', async (req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 })
    res.json(courses)
  } catch (error) {
    console.error('Fetch courses error:', error.message)
    res.status(500).json({
      message: 'Failed to fetch courses.'
    })
  }
})

app.get('/api/courses/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: 'Invalid course ID.'
      })
    }

    const course = await Course.findById(req.params.id)

    if (!course) {
      return res.status(404).json({
        message: 'Course not found.'
      })
    }

    res.json(course)
  } catch (error) {
    console.error('Get course error:', error.message)
    res.status(500).json({
      message: 'Failed to fetch course.'
    })
  }
})

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
      message: 'Course created successfully!',
      course
    })
  } catch (error) {
    console.error('Create course error:', error.message)
    res.status(400).json({
      message: 'Failed to create course.',
      error: error.message
    })
  }
})

app.put('/api/courses/:id', verifyToken, requireAdmin, async (req, res) => {
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
      message: 'Course updated successfully!',
      course
    })
  } catch (error) {
    console.error('Update course error:', error.message)
    res.status(400).json({
      message: 'Unable to update course.'
    })
  }
})

app.delete('/api/courses/:id', verifyToken, requireAdmin, async (req, res) => {
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
      message: 'Course deleted successfully!'
    })
  } catch (error) {
    console.error('Delete course error:', error.message)
    res.status(500).json({
      message: 'Unable to delete course.'
    })
  }
})

// ==========================================
// LESSON ROUTES
// ==========================================

// ADD NEW LESSON
app.post(
  '/api/courses/:courseId/lessons',
  verifyToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { courseId } = req.params
      const { lessonId, title, content } = req.body

      if (!mongoose.isValidObjectId(courseId)) {
        return res.status(400).json({
          message: 'Invalid course ID.'
        })
      }

      if (
        typeof lessonId !== 'string' ||
        !lessonId.trim() ||
        typeof title !== 'string' ||
        !title.trim() ||
        typeof content !== 'string' ||
        !content.trim()
      ) {
        return res.status(400).json({
          message: 'Lesson ID, title and content are required.'
        })
      }

      const course = await Course.findById(courseId)

      if (!course) {
        return res.status(404).json({
          message: 'Course not found.'
        })
      }

      const normalizedLessonId = lessonId.trim()

      const existingLesson = course.lessons.find(
        lesson => lesson.lessonId === normalizedLessonId
      )

      if (existingLesson) {
        return res.status(409).json({
          message: 'A lesson with this ID already exists.'
        })
      }

      course.lessons.push({
        lessonId: normalizedLessonId,
        title: title.trim(),
        content: content.trim(),
        resources: []
      })

      await course.save()

      res.status(201).json({
        message: 'Lesson added successfully!',
        lessons: course.lessons
      })
    } catch (error) {
      console.error('Add lesson error:', error.message)

      res.status(500).json({
        message: 'Failed to add lesson.',
        error: error.message
      })
    }
  }
)

// UPDATE LESSON
app.put(
  '/api/courses/:courseId/lessons/:lessonId',
  verifyToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { courseId, lessonId } = req.params
      const { title, content } = req.body

      if (!mongoose.isValidObjectId(courseId)) {
        return res.status(400).json({
          message: 'Invalid course ID.'
        })
      }

      if (
        typeof title !== 'string' ||
        !title.trim() ||
        typeof content !== 'string' ||
        !content.trim()
      ) {
        return res.status(400).json({
          message: 'Valid lesson title and content are required.'
        })
      }

      const course = await Course.findById(courseId)

      if (!course) {
        return res.status(404).json({
          message: 'Course not found.'
        })
      }

      const lesson = course.lessons.find(
        item => item.lessonId === lessonId
      )

      if (!lesson) {
        return res.status(404).json({
          message: 'Lesson not found.'
        })
      }

      lesson.title = title.trim()
      lesson.content = content.trim()

      await course.save()

      res.json({
        message: 'Lesson updated successfully!',
        lessons: course.lessons
      })
    } catch (error) {
      console.error('Update lesson error:', error.message)
      res.status(500).json({
        message: 'Failed to update lesson.'
      })
    }
  }
)

// DELETE LESSON
app.delete(
  '/api/courses/:courseId/lessons/:lessonId',
  verifyToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { courseId, lessonId } = req.params

      if (!mongoose.isValidObjectId(courseId)) {
        return res.status(400).json({
          message: 'Invalid course ID.'
        })
      }

      const course = await Course.findById(courseId)

      if (!course) {
        return res.status(404).json({
          message: 'Course not found.'
        })
      }

      const lessonIndex = course.lessons.findIndex(
        item => item.lessonId === lessonId
      )

      if (lessonIndex === -1) {
        return res.status(404).json({
          message: 'Lesson not found.'
        })
      }

      course.lessons.splice(lessonIndex, 1)
      await course.save()

      res.json({
        message: 'Lesson deleted successfully!'
      })
    } catch (error) {
      console.error('Delete lesson error:', error.message)
      res.status(500).json({
        message: 'Failed to delete lesson.'
      })
    }
  }
)

// ==========================================
// LEARNING RESOURCE ROUTES
// ==========================================

app.post(
  '/api/courses/:courseId/lessons/:lessonId/resources',
  verifyToken,
  requireAdmin,
  upload.single('file'),
  async (req, res) => {
    try {
      const { courseId, lessonId } = req.params
      const { title, type, url } = req.body

      if (!mongoose.isValidObjectId(courseId)) {
        if (req.file) fs.unlink(req.file.path, () => {})
        return res.status(400).json({
          message: 'Invalid course ID.'
        })
      }

      if (
        typeof title !== 'string' ||
        !title.trim() ||
        !['PDF', 'PPT', 'VIDEO', 'LINK'].includes(type)
      ) {
        if (req.file) fs.unlink(req.file.path, () => {})
        return res.status(400).json({
          message: 'Valid title and resource type are required.'
        })
      }

      if (['PDF', 'PPT'].includes(type) && !req.file) {
        return res.status(400).json({
          message: 'Please select a PDF or PPT file.'
        })
      }

      if (['VIDEO', 'LINK'].includes(type) && (!url || !url.trim())) {
        return res.status(400).json({
          message: 'Please enter a material URL.'
        })
      }

      const course = await Course.findById(courseId)

      if (!course) {
        if (req.file) fs.unlink(req.file.path, () => {})
        return res.status(404).json({
          message: 'Course not found.'
        })
      }

      const lesson = course.lessons.find(
        item => item.lessonId === lessonId
      )

      if (!lesson) {
        if (req.file) fs.unlink(req.file.path, () => {})
        return res.status(404).json({
          message: 'Lesson not found.'
        })
      }

      const resourceUrl = req.file
        ? `/uploads/${req.file.filename}`
        : url.trim()

      lesson.resources.push({
        title: title.trim(),
        type,
        url: resourceUrl
      })

      await course.save()

      res.status(201).json({
        message: 'Learning material uploaded successfully!',
        resources: lesson.resources
      })
    } catch (error) {
      console.error('Add resource error:', error.message)

      if (req.file) {
        fs.unlink(req.file.path, () => {})
      }

      res.status(500).json({
        message: 'Failed to upload material.'
      })
    }
  }
)

app.delete(
  '/api/courses/:courseId/lessons/:lessonId/resources/:resourceId',
  verifyToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { courseId, lessonId, resourceId } = req.params

      if (
        !mongoose.isValidObjectId(courseId) ||
        !mongoose.isValidObjectId(resourceId)
      ) {
        return res.status(400).json({
          message: 'Invalid ID.'
        })
      }

      const course = await Course.findById(courseId)

      if (!course) {
        return res.status(404).json({
          message: 'Course not found.'
        })
      }

      const lesson = course.lessons.find(
        item => item.lessonId === lessonId
      )

      if (!lesson) {
        return res.status(404).json({
          message: 'Lesson not found.'
        })
      }

      const resource = lesson.resources.id(resourceId)

      if (!resource) {
        return res.status(404).json({
          message: 'Resource not found.'
        })
      }

      const fileUrl = resource.url

      resource.deleteOne()
      await course.save()

      if (fileUrl && fileUrl.startsWith('/uploads/')) {
        const filename = path.basename(fileUrl)
        const filePath = path.join(uploadDirectory, filename)

        if (fs.existsSync(filePath)) {
          fs.unlink(filePath, error => {
            if (error) console.error('File delete error:', error.message)
          })
        }
      }

      res.json({
        message: 'Resource deleted successfully!'
      })
    } catch (error) {
      console.error('Delete resource error:', error.message)
      res.status(500).json({
        message: 'Failed to delete resource.'
      })
    }
  }
)

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

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
    console.error('Registration error:', error.message)

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

    const user = await User.findOne({
      email: email.trim().toLowerCase()
    })

    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password.'
      })
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.password
    )

    if (!isPasswordValid) {
      return res.status(401).json({
        message: 'Invalid email or password.'
      })
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        message: 'JWT_SECRET is not configured.'
      })
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      message: 'Login successful!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Login error:', error.message)
    res.status(500).json({
      message: 'Login failed.'
    })
  }
})

// ==========================================
// PROFILE ROUTES
// ==========================================

app.get('/api/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password')

    if (!user) {
      return res.status(404).json({
        message: 'User profile not found.'
      })
    }

    res.json({
      message: 'Profile fetched successfully!',
      user
    })
  } catch (error) {
    console.error('Profile fetch error:', error.message)
    res.status(500).json({
      message: 'Failed to fetch profile.'
    })
  }
})

app.put('/api/profile', verifyToken, async (req, res) => {
  try {
    const {
      name,
      phone,
      department,
      year,
      bio,
      profilePicture
    } = req.body

    if (name !== undefined && (
      typeof name !== 'string' || !name.trim()
    )) {
      return res.status(400).json({
        message: 'Name cannot be empty.'
      })
    }

    if (phone !== undefined && typeof phone !== 'string') {
      return res.status(400).json({
        message: 'Invalid phone number.'
      })
    }

    if (department !== undefined && typeof department !== 'string') {
      return res.status(400).json({
        message: 'Invalid department.'
      })
    }

    if (year !== undefined && year !== null && (
      !Number.isInteger(year) || year < 1 || year > 6
    )) {
      return res.status(400).json({
        message: 'Year must be between 1 and 6.'
      })
    }

    if (bio !== undefined && (
      typeof bio !== 'string' || bio.length > 300
    )) {
      return res.status(400).json({
        message: 'Bio must be text with at most 300 characters.'
      })
    }

    if (
      profilePicture !== undefined &&
      typeof profilePicture !== 'string'
    ) {
      return res.status(400).json({
        message: 'Invalid profile picture.'
      })
    }

    const updates = {}

    if (name !== undefined) updates.name = name.trim()
    if (phone !== undefined) updates.phone = phone.trim()
    if (department !== undefined) updates.department = department.trim()
    if (year !== undefined) updates.year = year
    if (bio !== undefined) updates.bio = bio.trim()

    if (profilePicture !== undefined) {
      updates.profilePicture = profilePicture.trim()
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: updates },
      {
        new: true,
        runValidators: true
      }
    ).select('-password')

    if (!user) {
      return res.status(404).json({
        message: 'User profile not found.'
      })
    }

    res.json({
      message: 'Profile updated successfully!',
      user
    })
  } catch (error) {
    console.error('Profile update error:', error.message)
    res.status(500).json({
      message: 'Failed to update profile.'
    })
  }
})

// ==========================================
// ENROLLMENT ROUTES
// ==========================================

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
      message: 'Successfully enrolled!',
      enrollment
    })
  } catch (error) {
    console.error('Enrollment error:', error.message)

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
      console.error('My courses error:', error.message)
      res.status(500).json({
        message: 'Failed to fetch enrolled courses.'
      })
    }
  }
)

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

      if (!enrollment || !enrollment.course) {
        return res.status(404).json({
          message: 'Enrollment not found.'
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
      console.error('Course lessons error:', error.message)
      res.status(500).json({
        message: 'Failed to load course lessons.'
      })
    }
  }
)

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

      if (!enrollment || !enrollment.course) {
        return res.status(404).json({
          message: 'Enrollment or course not found.'
        })
      }

      const lessonExists = enrollment.course.lessons.some(
        lesson => lesson.lessonId === lessonId
      )

      if (!lessonExists) {
        return res.status(404).json({
          message: 'Lesson not found.'
        })
      }

      if (!enrollment.completedLessons.includes(lessonId)) {
        enrollment.completedLessons.push(lessonId)
      }

      const totalLessons = enrollment.course.lessons.length
      const completedCount = enrollment.course.lessons.filter(
        lesson => enrollment.completedLessons.includes(lesson.lessonId)
      ).length

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
      console.error('Lesson progress error:', error.message)
      res.status(500).json({
        message: 'Failed to update lesson progress.'
      })
    }
  }
)

// ==========================================
// QUIZ ROUTES
// ==========================================

app.get(
  '/api/quizzes/admin/all',
  verifyToken,
  requireAdmin,
  async (req, res) => {
    try {
      const quizzes = await Quiz.find()
        .populate('course', 'title')
        .sort({ createdAt: -1 })

      res.json(quizzes)
    } catch (error) {
      console.error('Admin quiz fetch error:', error.message)
      res.status(500).json({
        message: 'Failed to fetch quizzes.'
      })
    }
  }
)

app.post('/api/quizzes', verifyToken, requireAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      lessonId,
      questions
    } = req.body

    const courseId = req.body.course || req.body.courseId

    if (
      typeof title !== 'string' ||
      !title.trim() ||
      !courseId ||
      typeof lessonId !== 'string' ||
      !lessonId.trim() ||
      !Array.isArray(questions) ||
      questions.length === 0
    ) {
      return res.status(400).json({
        message: 'Title, course, lesson and questions are required.'
      })
    }

    if (!mongoose.isValidObjectId(courseId)) {
      return res.status(400).json({
        message: 'Invalid course ID.'
      })
    }

    const course = await Course.findById(courseId)

    if (!course) {
      return res.status(404).json({
        message: 'Course not found.'
      })
    }

    const lessonExists = course.lessons.some(
      lesson => lesson.lessonId === lessonId.trim()
    )

    if (!lessonExists) {
      return res.status(404).json({
        message: 'Lesson not found in this course.'
      })
    }

    for (const question of questions) {
      if (
        !question ||
        typeof question.questionText !== 'string' ||
        !question.questionText.trim() ||
        !Array.isArray(question.options) ||
        question.options.length !== 4 ||
        question.options.some(
          option => typeof option !== 'string' || !option.trim()
        ) ||
        !Number.isInteger(Number(question.correctAnswer)) ||
        Number(question.correctAnswer) < 0 ||
        Number(question.correctAnswer) > 3 ||
        (
          question.marks !== undefined &&
          (
            !Number.isInteger(Number(question.marks)) ||
            Number(question.marks) < 1
          )
        )
      ) {
        return res.status(400).json({
          message: 'Each question needs text, four options and a valid correct answer.'
        })
      }
    }

    const quiz = await Quiz.create({
      title: title.trim(),
      description: typeof description === 'string'
        ? description.trim()
        : '',
      course: courseId,
      lessonId: lessonId.trim(),
      questions: questions.map(question => ({
        questionText: question.questionText.trim(),
        options: question.options.map(option => option.trim()),
        correctAnswer: Number(question.correctAnswer),
        marks: question.marks === undefined
          ? 1
          : Number(question.marks)
      })),
      published: false
    })

    res.status(201).json({
      message: 'Quiz created successfully!',
      quiz
    })
  } catch (error) {
    console.error('Create quiz error:', error)
    res.status(500).json({
      message: 'Failed to create quiz.',
      error: error.message
    })
  }
})

app.put(
  '/api/quizzes/:id',
  verifyToken,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params
      const {
        title,
        description,
        lessonId,
        questions
      } = req.body

      const courseId = req.body.course || req.body.courseId

      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          message: 'Invalid quiz ID.'
        })
      }

      if (
        typeof title !== 'string' ||
        !title.trim() ||
        !courseId ||
        !mongoose.isValidObjectId(courseId) ||
        typeof lessonId !== 'string' ||
        !lessonId.trim() ||
        !Array.isArray(questions) ||
        questions.length === 0
      ) {
        return res.status(400).json({
          message: 'Valid title, course, lesson and questions are required.'
        })
      }

      for (const question of questions) {
        if (
          !question ||
          typeof question.questionText !== 'string' ||
          !question.questionText.trim() ||
          !Array.isArray(question.options) ||
          question.options.length !== 4 ||
          question.options.some(
            option => typeof option !== 'string' || !option.trim()
          ) ||
          !Number.isInteger(Number(question.correctAnswer)) ||
          Number(question.correctAnswer) < 0 ||
          Number(question.correctAnswer) > 3 ||
          (
            question.marks !== undefined &&
            (
              !Number.isInteger(Number(question.marks)) ||
              Number(question.marks) < 1
            )
          )
        ) {
          return res.status(400).json({
            message: 'Each question needs text, four options and a valid correct answer.'
          })
        }
      }

      const quiz = await Quiz.findById(id)

      if (!quiz) {
        return res.status(404).json({
          message: 'Quiz not found.'
        })
      }

      const course = await Course.findById(courseId)

      if (!course) {
        return res.status(404).json({
          message: 'Course not found.'
        })
      }

      const lessonExists = course.lessons.some(
        lesson => lesson.lessonId === lessonId.trim()
      )

      if (!lessonExists) {
        return res.status(404).json({
          message: 'Lesson not found in this course.'
        })
      }

      const existingAttempts = await QuizAttempt.exists({
        quiz: quiz._id
      })

      if (existingAttempts) {
        const oldQuestions = quiz.questions.map(question => ({
          questionText: question.questionText,
          options: question.options,
          correctAnswer: question.correctAnswer,
          marks: question.marks
        }))

        const newQuestions = questions.map(question => ({
          questionText: question.questionText.trim(),
          options: question.options.map(option => option.trim()),
          correctAnswer: Number(question.correctAnswer),
          marks: question.marks === undefined
            ? 1
            : Number(question.marks)
        }))

        if (
          JSON.stringify(oldQuestions) !== JSON.stringify(newQuestions) ||
          quiz.course.toString() !== courseId ||
          quiz.lessonId !== lessonId.trim()
        ) {
          return res.status(409).json({
            message: 'This quiz already has student attempts. Its questions, course and lesson cannot be changed because previous results must be protected.'
          })
        }
      } else {
        quiz.questions = questions.map(question => ({
          questionText: question.questionText.trim(),
          options: question.options.map(option => option.trim()),
          correctAnswer: Number(question.correctAnswer),
          marks: question.marks === undefined
            ? 1
            : Number(question.marks)
        }))
      }

      quiz.title = title.trim()
      quiz.description = typeof description === 'string'
        ? description.trim()
        : ''
      quiz.course = courseId
      quiz.lessonId = lessonId.trim()

      await quiz.save()

      res.json({
        message: 'Quiz updated successfully!',
        quiz
      })
    } catch (error) {
      console.error('Update quiz error:', error.message)
      res.status(500).json({
        message: 'Failed to update quiz.'
      })
    }
  }
)

app.patch(
  '/api/quizzes/:id/publish',
  verifyToken,
  requireAdmin,
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
          message: 'Invalid quiz ID.'
        })
      }

      if (typeof req.body.published !== 'boolean') {
        return res.status(400).json({
          message: 'Published must be true or false.'
        })
      }

      const quiz = await Quiz.findById(req.params.id)

      if (!quiz) {
        return res.status(404).json({
          message: 'Quiz not found.'
        })
      }

      quiz.published = req.body.published
      await quiz.save()

      res.json({
        message: quiz.published
          ? 'Quiz published successfully!'
          : 'Quiz unpublished successfully!',
        quiz
      })
    } catch (error) {
      console.error('Publish quiz error:', error.message)
      res.status(500).json({
        message: 'Failed to update quiz.'
      })
    }
  }
)

app.get(
  '/api/quizzes/course/:courseId',
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
      })

      if (!enrollment) {
        return res.status(403).json({
          message: 'Please enroll in this course to view its quizzes.'
        })
      }

      const quizzes = await Quiz.find({
        course: courseId,
        published: true
      }).select('title description course lessonId questions createdAt')

      res.json(
        quizzes.map(quiz => ({
          _id: quiz._id,
          title: quiz.title,
          description: quiz.description,
          course: quiz.course,
          lessonId: quiz.lessonId,
          questionCount: quiz.questions.length,
          totalMarks: quiz.questions.reduce(
            (total, question) => total + question.marks,
            0
          )
        }))
      )
    } catch (error) {
      console.error('Fetch quizzes error:', error.message)
      res.status(500).json({
        message: 'Failed to fetch quizzes.'
      })
    }
  }
)

app.get('/api/quizzes/:id', verifyToken, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: 'Invalid quiz ID.'
      })
    }

    const quiz = await Quiz.findOne({
      _id: req.params.id,
      published: true
    })

    if (!quiz) {
      return res.status(404).json({
        message: 'Published quiz not found.'
      })
    }

    const enrollment = await Enrollment.findOne({
      student: req.userId,
      course: quiz.course
    })

    if (!enrollment) {
      return res.status(403).json({
        message: 'Please enroll in this course first.'
      })
    }

    res.json({
      _id: quiz._id,
      title: quiz.title,
      description: quiz.description,
      lessonId: quiz.lessonId,
      questions: quiz.questions.map(question => ({
        _id: question._id,
        questionText: question.questionText,
        options: question.options,
        marks: question.marks
      }))
    })
  } catch (error) {
    console.error('Get quiz error:', error.message)
    res.status(500).json({
      message: 'Failed to load quiz.'
    })
  }
})

// SUBMIT QUIZ
app.post('/api/quizzes/:id/submit', verifyToken, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: 'Invalid quiz ID.'
      })
    }

    const { answers } = req.body

    if (!Array.isArray(answers)) {
      return res.status(400).json({
        message: 'Answers must be provided as an array.'
      })
    }

    const quiz = await Quiz.findOne({
      _id: req.params.id,
      published: true
    })

    if (!quiz) {
      return res.status(404).json({
        message: 'Published quiz not found.'
      })
    }

    const enrollment = await Enrollment.findOne({
      student: req.userId,
      course: quiz.course
    })

    if (!enrollment) {
      return res.status(403).json({
        message: 'You are not enrolled in this course.'
      })
    }

    const previousAttempts = await QuizAttempt.find({
      quiz: quiz._id,
      student: req.userId
    })

    const previousBest = previousAttempts.reduce((best, attempt) => {
      const percentage = attempt.totalMarks > 0
        ? (attempt.score / attempt.totalMarks) * 100
        : 0

      return Math.max(best, percentage)
    }, 0)

    if (previousBest >= PASS_PERCENTAGE) {
      return res.status(409).json({
        message: 'You have already passed this quiz. No retake is needed.'
      })
    }

    const validQuestionIds = quiz.questions.map(
      question => question._id.toString()
    )

    const submittedIds = answers.map(answer => answer.questionId)

    if (
      answers.length !== quiz.questions.length ||
      answers.some(answer =>
        !answer ||
        typeof answer.questionId !== 'string' ||
        !validQuestionIds.includes(answer.questionId) ||
        !Number.isInteger(answer.selectedOption) ||
        answer.selectedOption < 0 ||
        answer.selectedOption > 3
      ) ||
      new Set(submittedIds).size !== submittedIds.length
    ) {
      return res.status(400).json({
        message: 'Please submit one valid answer for every question.'
      })
    }

    let score = 0
    let totalMarks = 0

    quiz.questions.forEach(question => {
      totalMarks += question.marks

      const submittedAnswer = answers.find(
        answer => answer.questionId === question._id.toString()
      )

      if (
        submittedAnswer &&
        submittedAnswer.selectedOption === question.correctAnswer
      ) {
        score += question.marks
      }
    })

    const attempt = await QuizAttempt.create({
      quiz: quiz._id,
      student: req.userId,
      answers,
      score,
      totalMarks
    })

    const percentage = totalMarks > 0
      ? Math.round((score / totalMarks) * 100)
      : 0

    res.status(201).json({
      message: 'Quiz submitted successfully!',
      score,
      totalMarks,
      percentage,
      passed: percentage >= PASS_PERCENTAGE,
      attemptId: attempt._id
    })
  } catch (error) {
    console.error('Quiz submission error:', error.message)
    res.status(500).json({
      message: 'Failed to submit quiz.'
    })
  }
})

// GET QUIZ ATTEMPTS
app.get(
  '/api/quizzes/:id/attempts',
  verifyToken,
  async (req, res) => {
    try {
      const quiz = await Quiz.findOne({
        _id: req.params.id,
        published: true
      })

      if (!quiz) {
        return res.status(404).json({
          message: 'Quiz not found.'
        })
      }

      const enrollment = await Enrollment.findOne({
        student: req.userId,
        course: quiz.course
      })

      if (!enrollment) {
        return res.status(403).json({
          message: 'You are not enrolled in this course.'
        })
      }

      const attempts = await QuizAttempt.find({
        quiz: quiz._id,
        student: req.userId
      }).sort({ submittedAt: -1 })

      const formattedAttempts = attempts.map(attempt => ({
        _id: attempt._id,
        score: attempt.score,
        totalMarks: attempt.totalMarks,
        percentage: attempt.totalMarks > 0
          ? Math.round((attempt.score / attempt.totalMarks) * 100)
          : 0,
        submittedAt: attempt.submittedAt
      }))

      const bestPercentage = formattedAttempts.length
        ? Math.max(...formattedAttempts.map(item => item.percentage))
        : 0

      res.json({
        attempts: formattedAttempts,
        bestPercentage,
        passed: bestPercentage >= PASS_PERCENTAGE,
        passMark: PASS_PERCENTAGE
      })
    } catch (error) {
      console.error('Attempt history error:', error.message)
      res.status(500).json({
        message: 'Failed to fetch quiz attempts.'
      })
    }
  }
)

// ==========================================
// PROGRESS REPORT HELPER
// ==========================================

async function buildCourseProgress(enrollment) {
  const course = enrollment.course
  const lessons = course.lessons || []
  const completedLessons = enrollment.completedLessons || []

  const totalLessons = lessons.length
  const completedCount = lessons.filter(lesson =>
    completedLessons.includes(lesson.lessonId)
  ).length

  const lessonProgress = totalLessons > 0
    ? Math.round((completedCount / totalLessons) * 100)
    : 0

  const quizzes = await Quiz.find({
    course: course._id,
    published: true
  })

  const quizReports = []

  for (const quiz of quizzes) {
    const attempts = await QuizAttempt.find({
      quiz: quiz._id,
      student: enrollment.student._id || enrollment.student
    }).sort({ submittedAt: -1 })

    const attemptReports = attempts.map(attempt => ({
      score: attempt.score,
      totalMarks: attempt.totalMarks,
      percentage: attempt.totalMarks > 0
        ? Math.round((attempt.score / attempt.totalMarks) * 100)
        : 0,
      submittedAt: attempt.submittedAt
    }))

    const bestPercentage = attemptReports.length
      ? Math.max(...attemptReports.map(item => item.percentage))
      : 0

    quizReports.push({
      quizId: quiz._id,
      title: quiz.title,
      lessonId: quiz.lessonId,
      attempts: attemptReports,
      attemptCount: attemptReports.length,
      bestPercentage,
      passed: bestPercentage >= PASS_PERCENTAGE
    })
  }

  const allQuizzesPassed = quizReports.length > 0
    ? quizReports.every(quiz => quiz.passed)
    : true

  const lessonsCompleted = totalLessons > 0 &&
    completedCount === totalLessons

  return {
    courseId: course._id,
    courseTitle: course.title,
    totalLessons,
    completedLessons: completedCount,
    pendingLessons: Math.max(0, totalLessons - completedCount),
    lessonProgress,
    quizzes: quizReports,
    allQuizzesPassed,
    lessonsCompleted,
    certificateEligible: lessonsCompleted && allQuizzesPassed
  }
}

// STUDENT PROGRESS
app.get('/api/progress/my', verifyToken, async (req, res) => {
  try {
    const enrollments = await Enrollment.find({
      student: req.userId
    })
      .populate('course')
      .sort({ enrolledAt: -1 })

    const reports = []

    for (const enrollment of enrollments) {
      if (!enrollment.course) continue

      const report = await buildCourseProgress(enrollment)

      const certificate = await Certificate.findOne({
        student: req.userId,
        course: enrollment.course._id
      })

      reports.push({
        ...report,
        certificate: certificate
          ? {
              certificateId: certificate.certificateId,
              issuedAt: certificate.issuedAt
            }
          : null
      })
    }

    res.json(reports)
  } catch (error) {
    console.error('Student progress error:', error.message)
    res.status(500).json({
      message: 'Failed to fetch progress report.'
    })
  }
})

// ADMIN PROGRESS
app.get(
  '/api/progress/admin',
  verifyToken,
  requireAdmin,
  async (req, res) => {
    try {
      const enrollments = await Enrollment.find()
        .populate('student', 'name email')
        .populate('course')
        .sort({ enrolledAt: -1 })

      const reports = []

      for (const enrollment of enrollments) {
        if (!enrollment.student || !enrollment.course) continue

        const report = await buildCourseProgress(enrollment)

        const certificate = await Certificate.findOne({
          student: enrollment.student._id,
          course: enrollment.course._id
        })

        reports.push({
          student: {
            id: enrollment.student._id,
            name: enrollment.student.name,
            email: enrollment.student.email
          },
          ...report,
          certificate: certificate
            ? {
                certificateId: certificate.certificateId,
                issuedAt: certificate.issuedAt
              }
            : null
        })
      }

      res.json(reports)
    } catch (error) {
      console.error('Admin progress error:', error.message)
      res.status(500).json({
        message: 'Failed to fetch student reports.'
      })
    }
  }
)

// ==========================================
// CERTIFICATE VERIFICATION
// ==========================================

app.get('/api/certificates/verify/:certificateId', async (req, res) => {
  try {
    const certificateId = req.params.certificateId
      .trim()
      .toUpperCase()

    if (!certificateId.startsWith('LS-')) {
      return res.status(400).json({
        valid: false,
        message: 'Invalid certificate ID format.'
      })
    }

    const certificate = await Certificate.findOne({
      certificateId
    })
      .populate('student', 'name')
      .populate('course', 'title')

    if (
      !certificate ||
      !certificate.student ||
      !certificate.course
    ) {
      return res.status(404).json({
        valid: false,
        message: 'Certificate not found. This certificate could not be verified.'
      })
    }

    res.status(200).json({
      valid: true,
      message: 'Certificate verified successfully!',
      certificate: {
        certificateId: certificate.certificateId,
        studentName: certificate.student.name,
        courseTitle: certificate.course.title,
        issuedAt: certificate.issuedAt
      }
    })
  } catch (error) {
    console.error('Certificate verification error:', error.message)

    res.status(500).json({
      valid: false,
      message: 'Unable to verify certificate.'
    })
  }
})

// ==========================================
// CERTIFICATE DOWNLOAD
// ==========================================

app.get(
  '/api/certificates/:courseId/download',
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

      if (!enrollment || !enrollment.course) {
        return res.status(404).json({
          message: 'Course enrollment not found.'
        })
      }

      const report = await buildCourseProgress(enrollment)

      if (!report.certificateEligible) {
        return res.status(403).json({
          message: 'Complete all lessons and pass every published quiz with at least 80% to receive your certificate.'
        })
      }

      const certificateId = `LS-${crypto.randomUUID().toUpperCase()}`

      const certificate = await Certificate.findOneAndUpdate(
        {
          student: req.userId,
          course: courseId
        },
        {
          $setOnInsert: {
            student: req.userId,
            course: courseId,
            certificateId,
            issuedAt: new Date()
          }
        },
        {
          new: true,
          upsert: true,
          runValidators: true
        }
      )

      const student = await User.findById(req.userId)

      if (!student) {
        return res.status(404).json({
          message: 'Student not found.'
        })
      }

      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="LearnSphere-${certificate.certificateId}.pdf"`
      )

      const pdf = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margin: 55
      })

      pdf.pipe(res)

      pdf.rect(25, 25, 792, 545).lineWidth(3).stroke('#7041a6')
      pdf.rect(35, 35, 772, 525).lineWidth(1).stroke('#d5b5ef')

      pdf.moveDown(2)
      pdf.fontSize(18).fillColor('#7041a6')
        .text('LEARNSPHERE', { align: 'center' })

      pdf.moveDown(1)
      pdf.fontSize(34).fillColor('#222')
        .text('CERTIFICATE OF COMPLETION', { align: 'center' })

      pdf.moveDown(1)
      pdf.fontSize(17).fillColor('#555')
        .text('This certificate is proudly presented to', {
          align: 'center'
        })

      pdf.moveDown(0.7)
      pdf.fontSize(30).fillColor('#7041a6')
        .text(student.name, { align: 'center' })

      pdf.moveDown(0.7)
      pdf.fontSize(17).fillColor('#555')
        .text('for successfully completing the course', {
          align: 'center'
        })

      pdf.moveDown(0.7)
      pdf.fontSize(25).fillColor('#222')
        .text(enrollment.course.title, { align: 'center' })

      pdf.moveDown(1.5)
      pdf.fontSize(13).fillColor('#555')
        .text(
          `Completion Date: ${new Date(certificate.issuedAt).toLocaleDateString('en-IN')}`,
          { align: 'center' }
        )

      pdf.moveDown(0.5)
      pdf.fontSize(11)
        .text(`Certificate ID: ${certificate.certificateId}`, {
          align: 'center'
        })

      pdf.end()
    } catch (error) {
      console.error('Certificate generation error:', error.message)

      if (!res.headersSent) {
        res.status(500).json({
          message: 'Unable to generate certificate.'
        })
      }
    }
  }
)

// ==========================================
// FILE UPLOAD ERROR HANDLER
// ==========================================

app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      message: error.code === 'LIMIT_FILE_SIZE'
        ? 'File size must be less than 20 MB.'
        : error.message
    })
  }

  if (error) {
    return res.status(400).json({
      message: error.message
    })
  }

  next()
})

// ==========================================
// START SERVER
// ==========================================

async function startServer() {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is missing from the server .env file.')
    }

    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is missing from the server .env file.')
    }

    await mongoose.connect(process.env.MONGO_URI)

    console.log('MongoDB connected successfully')

    app.listen(PORT, () => {
      console.log(`LearnSphere server running on port ${PORT}`)
    })
  } catch (error) {
    console.error('Server startup failed:', error.message)
    process.exit(1)
  }
}

startServer()
