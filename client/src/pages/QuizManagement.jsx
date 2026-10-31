
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const API = 'http://localhost:5000/api'

const emptyQuestion = () => ({
  questionText: '',
  options: ['', '', '', ''],
  correctAnswer: 0,
  marks: 1
})

function QuizManagement() {
  const token = localStorage.getItem('learnsphereToken')

  const [courses, setCourses] = useState([])
  const [quizzes, setQuizzes] = useState([])

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [course, setCourse] = useState('')
  const [lessonId, setLessonId] = useState('')
  const [questions, setQuestions] = useState([emptyQuestion()])

  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    fetchCourses()
    fetchQuizzes()
  }, [])

  const fetchCourses = async () => {
    try {
      const response = await fetch(`${API}/courses`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (response.ok) {
        const courseList = Array.isArray(data)
          ? data
          : data.courses || []

        setCourses(courseList)
      } else {
        setMessage(data.message || 'Unable to load courses.')
      }
    } catch (error) {
      setMessage('Could not connect to the server.')
    }
  }

  const fetchQuizzes = async () => {
    try {
      const response = await fetch(`${API}/quizzes/admin/all`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (response.ok) {
        setQuizzes(Array.isArray(data) ? data : data.quizzes || [])
      } else {
        setMessage(data.message || 'Unable to load quizzes.')
      }
    } catch (error) {
      setMessage('Could not load saved quizzes.')
    }
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setCourse('')
    setLessonId('')
    setQuestions([emptyQuestion()])
    setEditingId(null)
  }

  const updateQuestion = (index, field, value) => {
    setQuestions(previous =>
      previous.map((question, i) =>
        i === index
          ? { ...question, [field]: value }
          : question
      )
    )
  }

  const updateOption = (questionIndex, optionIndex, value) => {
    setQuestions(previous =>
      previous.map((question, i) =>
        i === questionIndex
          ? {
              ...question,
              options: question.options.map((option, j) =>
                j === optionIndex ? value : option
              )
            }
          : question
      )
    )
  }

  const addQuestion = () => {
    setQuestions(previous => [...previous, emptyQuestion()])
  }

  const removeQuestion = (index) => {
    if (questions.length === 1) return

    setQuestions(previous =>
      previous.filter((_, i) => i !== index)
    )
  }

  const validateForm = () => {
    if (!title.trim() || !course || !lessonId.trim()) {
      setMessage('Please enter the quiz title, course and lesson ID.')
      return false
    }

    if (questions.length === 0) {
      setMessage('Please add at least one question.')
      return false
    }

    for (const question of questions) {
      if (
        !question.questionText.trim() ||
        question.options.some(option => !option.trim())
      ) {
        setMessage('Please complete every question and all four options.')
        return false
      }

      if (
        !Number.isInteger(Number(question.marks)) ||
        Number(question.marks) < 1
      ) {
        setMessage('Question marks must be at least 1.')
        return false
      }
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')

    if (!validateForm()) return

    setLoading(true)

    const quizData = {
      title: title.trim(),
      description: description.trim(),
      course,
      lessonId: lessonId.trim(),
      questions: questions.map(question => ({
        questionText: question.questionText.trim(),
        options: question.options.map(option => option.trim()),
        correctAnswer: Number(question.correctAnswer),
        marks: Number(question.marks)
      }))
    }

    try {
      const isEditing = Boolean(editingId)

      const response = await fetch(
        isEditing
          ? `${API}/quizzes/${editingId}`
          : `${API}/quizzes`,
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(quizData)
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setMessage(data.message || 'Unable to save quiz.')
        return
      }

      setMessage(
        isEditing
          ? 'Quiz updated successfully!'
          : 'Quiz created successfully! Publish it when ready.'
      )

      resetForm()
      await fetchQuizzes()
    } catch (error) {
      setMessage('Could not connect to the server.')
    } finally {
      setLoading(false)
    }
  }

  const editQuiz = (quiz) => {
    setEditingId(quiz._id)
    setTitle(quiz.title || '')
    setDescription(quiz.description || '')

    setCourse(
      typeof quiz.course === 'object'
        ? quiz.course._id
        : quiz.course
    )

    setLessonId(quiz.lessonId || '')

    setQuestions(
      quiz.questions?.length
        ? quiz.questions.map(question => ({
            questionText: question.questionText || '',
            options: [...question.options],
            correctAnswer: Number(question.correctAnswer),
            marks: Number(question.marks || 1)
          }))
        : [emptyQuestion()]
    )

    setMessage(
      'You are editing this quiz. Make your changes and save them below.'
    )

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  const togglePublish = async (quiz) => {
    setMessage('')

    try {
      const response = await fetch(
        `${API}/quizzes/${quiz._id}/publish`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            published: !quiz.published
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        setMessage(data.message || 'Unable to update quiz.')
        return
      }

      setMessage(
        quiz.published
          ? 'Quiz unpublished successfully.'
          : 'Quiz published successfully!'
      )

      await fetchQuizzes()
    } catch (error) {
      setMessage('Could not connect to the server.')
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.heading}>Quiz Management</h1>
          <p style={styles.subtitle}>
            Create, edit, manage and publish course quizzes.
          </p>
        </div>

        <Link to="/manage-courses" style={styles.backButton}>
          Back to Courses
        </Link>
      </div>

      {message && (
        <p style={styles.message}>{message}</p>
      )}

      <div style={styles.card}>
        <h2 style={styles.cardHeading}>
          {editingId ? 'Edit Quiz' : 'Create New Quiz'}
        </h2>

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>Quiz Title</label>

          <input
            style={styles.input}
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Enter quiz title"
            required
          />

          <label style={styles.label}>Description</label>

          <textarea
            style={styles.input}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Enter quiz description"
          />

          <label style={styles.label}>Select Course</label>

          <select
            style={styles.input}
            value={course}
            onChange={e => setCourse(e.target.value)}
            required
          >
            <option value="">Choose a course</option>

            {courses.map(item => (
              <option key={item._id} value={item._id}>
                {item.title || item.name}
              </option>
            ))}
          </select>

          <label style={styles.label}>Lesson ID</label>

          <input
            style={styles.input}
            value={lessonId}
            onChange={e => setLessonId(e.target.value)}
            placeholder="Example: PY01"
            required
          />

          <h3 style={styles.sectionHeading}>Questions</h3>

          {questions.map((question, index) => (
            <div key={index} style={styles.questionCard}>
              <div style={styles.questionHeader}>
                <h3>Question {index + 1}</h3>

                <button
                  type="button"
                  style={styles.removeButton}
                  onClick={() => removeQuestion(index)}
                  disabled={questions.length === 1}
                >
                  Remove
                </button>
              </div>

              <label style={styles.label}>Question</label>

              <input
                style={styles.input}
                value={question.questionText}
                onChange={e =>
                  updateQuestion(index, 'questionText', e.target.value)
                }
                placeholder="Enter your question"
                required
              />

              <label style={styles.label}>Options</label>

              {question.options.map((option, optionIndex) => (
                <input
                  key={optionIndex}
                  style={styles.input}
                  value={option}
                  onChange={e =>
                    updateOption(index, optionIndex, e.target.value)
                  }
                  placeholder={`Option ${optionIndex + 1}`}
                  required
                />
              ))}

              <label style={styles.label}>Correct Answer</label>

              <select
                style={styles.input}
                value={question.correctAnswer}
                onChange={e =>
                  updateQuestion(
                    index,
                    'correctAnswer',
                    Number(e.target.value)
                  )
                }
              >
                {question.options.map((option, optionIndex) => (
                  <option key={optionIndex} value={optionIndex}>
                    Option {optionIndex + 1}
                  </option>
                ))}
              </select>

              <label style={styles.label}>Marks</label>

              <input
                style={styles.input}
                type="number"
                min="1"
                step="1"
                value={question.marks}
                onChange={e =>
                  updateQuestion(index, 'marks', e.target.value)
                }
                required
              />
            </div>
          ))}

          <button
            type="button"
            style={styles.addButton}
            onClick={addQuestion}
          >
            + Add Question
          </button>

          <button
            type="submit"
            style={styles.createButton}
            disabled={loading}
          >
            {loading
              ? 'Saving...'
              : editingId
                ? 'Save Changes'
                : 'Create Quiz'}
          </button>

          {editingId && (
            <button
              type="button"
              style={styles.cancelButton}
              onClick={() => {
                resetForm()
                setMessage('Editing cancelled.')
              }}
            >
              Cancel Edit
            </button>
          )}
        </form>
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardHeading}>Created Quizzes</h2>

        {quizzes.length === 0 ? (
          <p>No quizzes found.</p>
        ) : (
          quizzes.map(quiz => (
            <div key={quiz._id} style={styles.quizRow}>
              <div style={styles.quizInfo}>
                <h3>{quiz.title}</h3>

                <p>
                  {quiz.questions?.length || 0} questions
                  {' • '}
                  {quiz.published ? 'Published' : 'Draft'}
                </p>

                <p>
                  Course: {quiz.course?.title || 'Course'}
                  {' • '}
                  Lesson: {quiz.lessonId}
                </p>
              </div>

              <div style={styles.actions}>
                <button
                  style={styles.editButton}
                  onClick={() => editQuiz(quiz)}
                >
                  Edit
                </button>

                <button
                  style={styles.publishButton}
                  onClick={() => togglePublish(quiz)}
                >
                  {quiz.published ? 'Unpublish' : 'Publish'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    padding: '35px',
    background: '#f8f5ff',
    fontFamily: 'Arial, sans-serif',
    color: '#30234b'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '15px',
    marginBottom: '25px'
  },
  heading: {
    color: '#6536a5',
    marginBottom: '5px'
  },
  subtitle: {
    color: '#777'
  },
  backButton: {
    background: '#6c43a5',
    color: 'white',
    padding: '11px 18px',
    borderRadius: '8px',
    textDecoration: 'none'
  },
  message: {
    background: '#eee4ff',
    padding: '12px',
    borderRadius: '8px',
    color: '#58318d'
  },
  card: {
    background: 'white',
    padding: '25px',
    borderRadius: '14px',
    marginBottom: '25px',
    boxShadow: '0 3px 15px rgba(80,40,120,0.08)'
  },
  cardHeading: {
    color: '#6536a5',
    marginTop: 0
  },
  label: {
    display: 'block',
    marginTop: '15px',
    marginBottom: '7px',
    fontWeight: 'bold'
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px',
    border: '1px solid #d8c8ed',
    borderRadius: '8px',
    marginBottom: '8px',
    fontSize: '14px'
  },
  sectionHeading: {
    marginTop: '25px',
    color: '#6536a5'
  },
  questionCard: {
    background: '#faf7ff',
    border: '1px solid #e5d8f5',
    padding: '18px',
    borderRadius: '10px',
    marginTop: '15px'
  },
  questionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  removeButton: {
    background: '#ffe3e8',
    color: '#b52c50',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  addButton: {
    background: '#eadcff',
    color: '#60369a',
    border: 'none',
    padding: '12px 18px',
    borderRadius: '8px',
    marginTop: '18px',
    cursor: 'pointer'
  },
  createButton: {
    display: 'block',
    width: '100%',
    background: '#7044ad',
    color: 'white',
    border: 'none',
    padding: '14px',
    borderRadius: '8px',
    marginTop: '18px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  cancelButton: {
    display: 'block',
    width: '100%',
    background: '#eee8f5',
    color: '#58318d',
    border: 'none',
    padding: '13px',
    borderRadius: '8px',
    marginTop: '10px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  quizRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '15px',
    flexWrap: 'wrap',
    borderBottom: '1px solid #eee',
    padding: '15px 0'
  },
  quizInfo: {
    flex: 1,
    minWidth: '200px'
  },
  actions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  editButton: {
    background: '#eadcff',
    color: '#60369a',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '7px',
    cursor: 'pointer'
  },
  publishButton: {
    background: '#d9c4fa',
    color: '#4f287f',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '7px',
    cursor: 'pointer'
  }
}

export default QuizManagement
