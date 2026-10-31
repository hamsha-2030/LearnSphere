
import { useEffect, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import API_BASE_URL from '../config'
import './Auth.css'
import './LearnCourse.css'

function LearnCourse() {
  const { courseId } = useParams()
  const navigate = useNavigate()

  const [courseData, setCourseData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingLesson, setUpdatingLesson] = useState('')

  const [quizzes, setQuizzes] = useState([])
  const [quizLoading, setQuizLoading] = useState(true)
  const [selectedQuiz, setSelectedQuiz] = useState(null)
  const [quizQuestions, setQuizQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [quizResult, setQuizResult] = useState(null)
  const [quizError, setQuizError] = useState('')
  const [submittingQuiz, setSubmittingQuiz] = useState(false)
  const [openingQuiz, setOpeningQuiz] = useState(false)

  const token = localStorage.getItem('learnsphereToken')

  useEffect(() => {
    if (!token) {
      navigate('/login')
      return
    }

    fetch(`${API_BASE_URL}/api/enrollments/course/${courseId}`, {
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

  useEffect(() => {
    if (!token || !courseId) return

    setQuizLoading(true)
    setQuizError('')

    fetch(`${API_BASE_URL}/api/quizzes/course/${courseId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
      .then(async response => {
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.message || 'Unable to load quizzes.')
        }

        const quizList = Array.isArray(data)
          ? data
          : data.quizzes || []

        setQuizzes(quizList)
      })
      .catch(error => {
        setQuizError(error.message)
      })
      .finally(() => {
        setQuizLoading(false)
      })
  }, [courseId, token])

  async function markComplete(lessonId) {
    if (!courseData || updatingLesson) return

    setUpdatingLesson(lessonId)
    setError('')

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/enrollments/${courseData.enrollmentId}/lessons/${lessonId}`,
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

  function getResourceUrl(url) {
    if (!url) return '#'

    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url
    }

    return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`
  }

  async function openQuiz(quizId) {
    setQuizError('')
    setQuizResult(null)
    setSelectedQuiz(null)
    setQuizQuestions([])
    setAnswers({})
    setOpeningQuiz(true)

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/quizzes/${quizId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to open quiz.')
      }

      const quiz = data.quiz || data

      if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
        throw new Error('This quiz does not contain any questions yet.')
      }

      setSelectedQuiz(quiz)
      setQuizQuestions(quiz.questions)

    } catch (error) {
      setQuizError(error.message)
    } finally {
      setOpeningQuiz(false)
    }
  }

  function selectAnswer(questionId, optionIndex) {
    setAnswers(previous => ({
      ...previous,
      [questionId]: optionIndex
    }))
  }

  async function submitQuiz() {
    if (!selectedQuiz || submittingQuiz) return

    if (quizQuestions.length === 0) {
      setQuizError('There are no questions to submit.')
      return
    }

    if (
      quizQuestions.some(
        question => answers[question._id] === undefined
      )
    ) {
      setQuizError('Please answer all questions before submitting.')
      return
    }

    setSubmittingQuiz(true)
    setQuizError('')

    try {
      const formattedAnswers = quizQuestions.map(question => ({
        questionId: question._id,
        selectedOption: answers[question._id]
      }))

      const response = await fetch(
        `${API_BASE_URL}/api/quizzes/${selectedQuiz._id}/submit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            answers: formattedAnswers
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to submit quiz.')
      }

      setQuizResult(data)

    } catch (error) {
      setQuizError(error.message)
    } finally {
      setSubmittingQuiz(false)
    }
  }

  function closeQuiz() {
    setSelectedQuiz(null)
    setQuizQuestions([])
    setAnswers({})
    setQuizResult(null)
    setQuizError('')
  }

  if (loading) {
    return (
      <div className="learn-page">
        <p>Loading your course...</p>
      </div>
    )
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

        {quizError && (
          <p className="student-quiz-error">
            {quizError}
          </p>
        )}

        {selectedQuiz && (
          <section className="student-quiz-panel">

            <div className="student-quiz-heading">
              <div>
                <p>LEARNING ASSESSMENT</p>
                <h2>{selectedQuiz.title}</h2>
                <span>{quizQuestions.length} questions</span>
              </div>

              <button
                type="button"
                onClick={closeQuiz}
              >
                Close
              </button>
            </div>

            {quizResult ? (
              <div className="student-quiz-result">

                <h2>🎉 Quiz Submitted!</h2>
                <p>Your result</p>

                <strong>
                  {quizResult.score} / {quizResult.totalMarks}
                </strong>

                <h3>
                  {quizResult.percentage ??
                    (quizResult.totalMarks
                      ? Math.round(
                          (quizResult.score / quizResult.totalMarks) * 100
                        )
                      : 0)}%
                </h3>

                <p>
                  Your answers have been evaluated successfully.
                </p>

                <button
                  type="button"
                  onClick={closeQuiz}
                >
                  Back to Lessons
                </button>

              </div>
            ) : (
              <>

                {quizQuestions.map((question, index) => (
                  <div
                    className="student-question-card"
                    key={question._id}
                  >

                    <h3>
                      {index + 1}. {question.questionText}
                    </h3>

                    <div className="student-quiz-options">

                      {(question.options || []).map(
                        (option, optionIndex) => (
                          <label
                            key={optionIndex}
                            className={
                              answers[question._id] === optionIndex
                                ? 'student-quiz-option selected'
                                : 'student-quiz-option'
                            }
                          >

                            <input
                              type="radio"
                              name={`question-${question._id}`}
                              checked={
                                answers[question._id] === optionIndex
                              }
                              onChange={() =>
                                selectAnswer(
                                  question._id,
                                  optionIndex
                                )
                              }
                            />

                            <span>{option}</span>

                          </label>
                        )
                      )}

                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  className="student-quiz-submit"
                  onClick={submitQuiz}
                  disabled={
                    submittingQuiz || quizQuestions.length === 0
                  }
                >
                  {submittingQuiz
                    ? 'Submitting...'
                    : 'Submit Quiz'}
                </button>

              </>
            )}

          </section>
        )}

        <section className="learn-lessons">

          <h2>Course lessons</h2>

          {lessons.length === 0 && (
            <p>No lessons are available for this course yet.</p>
          )}

          {lessons.map((lesson, index) => {

            const isCompleted = completedLessons.includes(
              lesson.lessonId
            )

            const resources = lesson.resources || []

            const lessonQuizzes = quizzes.filter(
              quiz => quiz.lessonId === lesson.lessonId
            )

            return (
              <article
                className="learn-lesson-card"
                key={lesson.lessonId}
              >

                <div className="learn-lesson-number">
                  {isCompleted ? '✓' : index + 1}
                </div>

                <div className="learn-lesson-details">

                  <span className="learn-lesson-label">
                    LESSON {index + 1}
                  </span>

                  <h3>{lesson.title}</h3>

                  <div className="lesson-markdown">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {lesson.content || ''}
                    </ReactMarkdown>
                  </div>

                  {resources.length > 0 && (
                    <div className="learn-resources">

                      <h4>📚 Learning Materials</h4>

                      {resources.map((resource, resourceIndex) => (
                        <div
                          className="learn-resource-item"
                          key={resource._id || resourceIndex}
                        >

                          <span>
                            {resource.type === 'PDF'
                              ? '📄'
                              : resource.type === 'PPT'
                                ? '📊'
                                : resource.type === 'VIDEO'
                                  ? '🎥'
                                  : '🔗'}
                          </span>

                          <div>
                            <strong>{resource.title}</strong>
                            <p>{resource.type}</p>
                          </div>

                          <a
                            href={getResourceUrl(resource.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Open Material ↗
                          </a>

                        </div>
                      ))}

                    </div>
                  )}

                  {isCompleted && (
                    <span className="learn-completed-label">
                      Completed
                    </span>
                  )}

                  <div className="student-quiz-section">

                    <h4>📝 Lesson Quiz</h4>

                    {quizLoading ? (
                      <p>Loading quizzes...</p>
                    ) : lessonQuizzes.length === 0 ? (
                      <p>
                        No published quiz is available for this lesson yet.
                      </p>
                    ) : (
                      lessonQuizzes.map(quiz => (

                        <div
                          className="student-quiz-card"
                          key={quiz._id}
                        >

                          <div>
                            <strong>{quiz.title}</strong>

                            <p>
                              {quiz.questionCount ??
                                quiz.questions?.length ??
                                0} questions
                              {' · '}
                              {quiz.totalMarks ?? 0} marks
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => openQuiz(quiz._id)}
                            disabled={openingQuiz}
                          >
                            {openingQuiz
                              ? 'Opening...'
                              : 'Attend Quiz'}
                          </button>

                        </div>

                      ))
                    )}

                  </div>

                </div>

                <button
                  className="learn-complete-button"
                  onClick={() => markComplete(lesson.lessonId)}
                  disabled={
                    isCompleted || updatingLesson !== ''
                  }
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
