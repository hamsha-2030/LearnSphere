
import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import './Auth.css'

function LearnCourse() {
  const { courseId } = useParams()
  const navigate = useNavigate()

  const [courseData, setCourseData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingLesson, setUpdatingLesson] = useState('')

  const token = localStorage.getItem('learnsphereToken')

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }

    fetch(`http://localhost:5000/api/enrollments/course/${courseId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(async response => {
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || 'Unable to load course.')
        }

        setCourseData(data)
      })
      .catch(error => {
        setError(error.message)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [courseId, token, navigate])

  async function markComplete(lessonId) {
    if (!courseData || updatingLesson) return

    setUpdatingLesson(lessonId)
    setError('')

    try {
      const response = await fetch(
        `http://localhost:5000/api/enrollments/${courseData.enrollmentId}/lessons/${lessonId}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Could not update lesson.')
      }

      setCourseData(previous => ({
        ...previous,
        completedLessons: data.completedLessons,
        progress: data.progress,
        completed: data.completed
      }))
    } catch (error) {
      setError(error.message)
    } finally {
      setUpdatingLesson('')
    }
  }

  if (loading) {
    return <div className="learn-page"><p>Loading your course...</p></div>
  }

  if (error && !courseData) {
    return (
      <div className="learn-page">
        <h2>Unable to open course</h2>
        <p>{error}</p>
        <Link to="/dashboard">Back to Dashboard</Link>
      </div>
    )
  }

  if (!courseData) return null

  const course = courseData.course
  const lessons = course.lessons || []
  const completedLessons = courseData.completedLessons || []

  return (
    <div className="learn-page">
      <header className="learn-header">
        <Link to="/dashboard" className="learn-back">
          ← Dashboard
        </Link>
        <span>LearnSphere</span>
      </header>

      <main className="learn-content">
        <section className="learn-course-intro">
          <p className="learn-category">{course.category}</p>
          <h1>{course.title}</h1>
          <p>{course.description}</p>
          <p className="learn-instructor">
            Instructor: {course.instructor}
          </p>
        </section>

        <section className="learn-progress-card">
          <div className="learn-progress-heading">
            <div>
              <h2>Your learning progress</h2>
              <p>
                {completedLessons.length} of {lessons.length} lessons completed
              </p>
            </div>
            <strong>{courseData.progress}%</strong>
          </div>

          <div className="learn-progress-track">
            <div
              className="learn-progress-fill"
              style={{ width: `${courseData.progress}%` }}
            ></div>
          </div>

          {courseData.completed && (
            <p className="learn-success">
              🎉 Congratulations! You completed this course!
            </p>
          )}
        </section>

        <section className="learn-lessons">
          <h2>Course lessons</h2>

          {lessons.length === 0 && (
            <p>No lessons are available for this course yet.</p>
          )}

          {lessons.map((lesson, index) => {
            const isCompleted = completedLessons.includes(lesson.lessonId)

            return (
              <article className="learn-lesson-card" key={lesson.lessonId}>
                <div className="learn-lesson-number">
                  {isCompleted ? '✓' : index + 1}
                </div>

                <div className="learn-lesson-details">
                  <span className="learn-lesson-label">
                    LESSON {index + 1}
                  </span>
                  <h3>{lesson.title}</h3>
                  <p>{lesson.content}</p>

                  {isCompleted && (
                    <span className="learn-completed-label">
                      Completed
                    </span>
                  )}
                </div>

                <button
                  className="learn-complete-button"
                  onClick={() => markComplete(lesson.lessonId)}
                  disabled={isCompleted || updatingLesson !== ''}
                >
                  {isCompleted
                    ? 'Completed ✓'
                    : updatingLesson === lesson.lessonId
                      ? 'Saving...'
                      : 'Mark Complete'}
                </button>
              </article>
            )
          })}
        </section>
      </main>
    </div>
  )
}

export default LearnCourse
