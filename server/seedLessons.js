
const mongoose = require('mongoose')
require('dotenv').config()
const Course = require('./models/Course')

const courseLessons = {
  'Web Development': [
    {
      lessonId: 'web-1',
      title: 'Introduction to HTML',
      content: 'Learn HTML elements, headings, paragraphs, links, and images.'
    },
    {
      lessonId: 'web-2',
      title: 'CSS Fundamentals',
      content: 'Learn selectors, colors, fonts, spacing, and page layouts.'
    },
    {
      lessonId: 'web-3',
      title: 'JavaScript Basics',
      content: 'Learn variables, functions, conditions, and basic interactivity.'
    }
  ],
  'Python Programming': [
    {
      lessonId: 'python-1',
      title: 'Introduction to Python',
      content: 'Learn Python syntax, variables, and data types.'
    },
    {
      lessonId: 'python-2',
      title: 'Conditions and Loops',
      content: 'Learn if-else statements, for loops, and while loops.'
    },
    {
      lessonId: 'python-3',
      title: 'Functions in Python',
      content: 'Learn how to define functions, pass arguments, and return values.'
    }
  ],
  'Introduction to AI': [
    {
      lessonId: 'ai-1',
      title: 'What Is Artificial Intelligence?',
      content: 'Understand AI concepts and everyday applications.'
    },
    {
      lessonId: 'ai-2',
      title: 'Introduction to Machine Learning',
      content: 'Explore datasets, training, and machine learning predictions.'
    },
    {
      lessonId: 'ai-3',
      title: 'Real-World AI Applications',
      content: 'Explore AI applications in healthcare, education, and agriculture.'
    }
  ]
}

async function seedLessons() {
  try {
    await mongoose.connect(process.env.MONGO_URI)

    for (const [title, lessons] of Object.entries(courseLessons)) {
      const course = await Course.findOneAndUpdate(
        { title },
        { $set: { lessons } },
        { new: true }
      )

      if (course) {
        console.log(`Lessons added to: ${course.title}`)
      } else {
        console.log(`Course not found: ${title}`)
      }
    }
  } catch (error) {
    console.error('Error adding lessons:', error.message)
  } finally {
    await mongoose.disconnect()
  }
}

seedLessons()
