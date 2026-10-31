
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import API_BASE_URL from '../config'

const API = `${API_BASE_URL}/api`

function CourseManagement() {
  const token = localStorage.getItem('learnsphereToken')

  const [courses, setCourses] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [courseForm, setCourseForm] = useState({
    title: '',
    instructor: '',
    description: '',
    category: '',
    duration: '',
    price: ''
  })

  const [editingCourseId, setEditingCourseId] = useState(null)
  const [selectedCourse, setSelectedCourse] = useState('')
  const [selectedLesson, setSelectedLesson] = useState('')

  const [lessonForm, setLessonForm] = useState({
    lessonId: '',
    title: '',
    content: ''
  })

  const [editingLessonId, setEditingLessonId] = useState(null)

  const [resourceForm, setResourceForm] = useState({
    title: '',
    type: 'PDF',
    url: ''
  })

  const [selectedFile, setSelectedFile] = useState(null)

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  }

  const request = async (url, options = {}) => {
    const response = await fetch(`${API}${url}`, {
      ...options,
      headers: {
        ...authHeaders,
        ...options.headers
      }
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(data.message || 'Something went wrong')
    }

    return data
  }

  const loadCourses = async () => {
    try {
      setError('')
      const data = await request('/courses')
      setCourses(Array.isArray(data) ? data : data.courses || [])
    } catch (error) {
      setError(error.message)
    }
  }

  useEffect(() => {
    loadCourses()
  }, [])

  const showMessage = (text) => {
    setMessage(text)
    setTimeout(() => setMessage(''), 4000)
  }

  const handleCourseChange = (e) => {
    setCourseForm({
      ...courseForm,
      [e.target.name]: e.target.value
    })
  }

  const resetCourseForm = () => {
    setEditingCourseId(null)
    setCourseForm({
      title: '',
      instructor: '',
      description: '',
      category: '',
      duration: '',
      price: ''
    })
  }

  const handleCourseSubmit = async (e) => {
    e.preventDefault()

    try {
      setLoading(true)
      setMessage('')

      const url = editingCourseId
        ? `/courses/${editingCourseId}`
        : '/courses'

      await request(url, {
        method: editingCourseId ? 'PUT' : 'POST',
        body: JSON.stringify({
          ...courseForm,
          price: Number(courseForm.price)
        })
      })

      showMessage(
        editingCourseId
          ? 'Course updated successfully! 💜'
          : 'Course added successfully! 🎉'
      )

      resetCourseForm()
      await loadCourses()
    } catch (error) {
      showMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  const editCourse = (course) => {
    setCourseForm({
      title: course.title || '',
      instructor: course.instructor || '',
      description: course.description || '',
      category: course.category || '',
      duration: course.duration || '',
      price: course.price ?? ''
    })

    setEditingCourseId(course._id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const deleteCourse = async (courseId) => {
    if (!window.confirm('Are you sure you want to delete this course?')) {
      return
    }

    try {
      await request(`/courses/${courseId}`, {
        method: 'DELETE'
      })

      showMessage('Course deleted successfully!')
      setSelectedCourse('')
      setSelectedLesson('')
      setEditingLessonId(null)
      await loadCourses()
    } catch (error) {
      showMessage(error.message)
    }
  }

  const currentCourse = courses.find(
    course => course._id === selectedCourse
  )

  const lessons = currentCourse?.lessons || []

  const handleLessonChange = (e) => {
    setLessonForm({
      ...lessonForm,
      [e.target.name]: e.target.value
    })
  }

  const resetLessonForm = () => {
    setEditingLessonId(null)
    setLessonForm({
      lessonId: '',
      title: '',
      content: ''
    })
  }

  const handleLessonSubmit = async (e) => {
    e.preventDefault()

    if (!selectedCourse) {
      showMessage('Please select a course first.')
      return
    }

    try {
      setLoading(true)

      if (editingLessonId) {
        await request(
          `/courses/${selectedCourse}/lessons/${editingLessonId}`,
          {
            method: 'PUT',
            body: JSON.stringify({
              title: lessonForm.title,
              content: lessonForm.content
            })
          }
        )

        showMessage('Lesson updated successfully! 💜')
      } else {
        await request(`/courses/${selectedCourse}/lessons`, {
          method: 'POST',
          body: JSON.stringify(lessonForm)
        })

        showMessage('Lesson added successfully! 🎉')
      }

      resetLessonForm()
      await loadCourses()
    } catch (error) {
      showMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  const editLesson = (lesson) => {
    setLessonForm({
      lessonId: lesson.lessonId || '',
      title: lesson.title || '',
      content: lesson.content || ''
    })

    setEditingLessonId(lesson.lessonId)
  }

  const deleteLesson = async (lessonId) => {
    if (!window.confirm('Are you sure you want to delete this lesson?')) {
      return
    }

    try {
      await request(
        `/courses/${selectedCourse}/lessons/${lessonId}`,
        { method: 'DELETE' }
      )

      showMessage('Lesson deleted successfully!')
      setSelectedLesson('')
      resetLessonForm()
      await loadCourses()
    } catch (error) {
      showMessage(error.message)
    }
  }

  const handleResourceChange = (e) => {
    const { name, value } = e.target

    setResourceForm({
      ...resourceForm,
      [name]: value
    })

    if (name === 'type') {
      setSelectedFile(null)
      const fileInput = document.getElementById('lm-resource-file')
      if (fileInput) fileInput.value = ''
    }
  }

  const handleResourceSubmit = async (e) => {
    e.preventDefault()

    if (!selectedCourse || !selectedLesson) {
      showMessage('Please select a course and lesson first.')
      return
    }

    if (!resourceForm.title.trim()) {
      showMessage('Please enter the material title.')
      return
    }

    const isFileType = ['PDF', 'PPT'].includes(resourceForm.type)

    if (isFileType && !selectedFile) {
      showMessage('Please choose a PDF, PPT or PPTX file to upload.')
      return
    }

    if (!isFileType && !resourceForm.url.trim()) {
      showMessage('Please enter the material URL.')
      return
    }

    try {
      setLoading(true)

      const formData = new FormData()
      formData.append('title', resourceForm.title.trim())
      formData.append('type', resourceForm.type)
      formData.append('url', resourceForm.url.trim())

      if (selectedFile) {
        formData.append('file', selectedFile)
      }

      const response = await fetch(
        `${API}/courses/${selectedCourse}/lessons/${selectedLesson}/resources`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        }
      )

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.message || 'Learning material upload failed.')
      }

      showMessage(data.message || 'Learning material added successfully! 📚')

      setResourceForm({
        title: '',
        type: 'PDF',
        url: ''
      })

      setSelectedFile(null)

      const fileInput = document.getElementById('lm-resource-file')
      if (fileInput) fileInput.value = ''

      await loadCourses()
    } catch (error) {
      showMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  const deleteResource = async (resourceId) => {
    if (!window.confirm('Are you sure you want to delete this material?')) {
      return
    }

    try {
      await request(
        `/courses/${selectedCourse}/lessons/${selectedLesson}/resources/${resourceId}`,
        { method: 'DELETE' }
      )

      showMessage('Material deleted successfully!')
      await loadCourses()
    } catch (error) {
      showMessage(error.message)
    }
  }

  const selectedLessonData = lessons.find(
    lesson => lesson.lessonId === selectedLesson
  )

  const materials = selectedLessonData?.resources || []

  const totalLessons = courses.reduce(
    (total, course) => total + (course.lessons?.length || 0),
    0
  )

  return (
    <div className="lm-page">

      <style>{`
        .lm-page {
          min-height: 100vh;
          background: #f7f5ff;
          color: #29213f;
          font-family: Arial, sans-serif;
          padding-bottom: 50px;
        }

        .lm-navbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 7%;
          background: white;
          box-shadow: 0 3px 18px rgba(70, 40, 110, 0.07);
          gap: 15px;
          flex-wrap: wrap;
        }

        .lm-brand {
          font-size: 25px;
          font-weight: 800;
          color: #7138c8;
          text-decoration: none;
        }

        .lm-back {
          color: #7138c8;
          font-weight: 600;
          text-decoration: none;
        }

        .lm-hero {
          margin: 30px auto;
          width: 86%;
          padding: 38px;
          border-radius: 22px;
          color: white;
          background: linear-gradient(120deg, #7041c7, #a34fc7, #e17da9);
          box-shadow: 0 12px 30px rgba(112, 65, 199, 0.2);
        }

        .lm-hero small {
          letter-spacing: 2px;
          font-weight: 700;
          opacity: 0.9;
        }

        .lm-hero h1 {
          font-size: clamp(27px, 4vw, 38px);
          margin: 12px 0;
        }

        .lm-hero p {
          margin: 0;
          line-height: 1.6;
          opacity: 0.95;
        }

        .lm-stats {
          width: 86%;
          margin: 0 auto 30px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }

        .lm-stat {
          background: white;
          padding: 22px;
          border-radius: 17px;
          box-shadow: 0 5px 20px rgba(65, 42, 100, 0.06);
          border: 1px solid #eee8fa;
        }

        .lm-stat span {
          font-size: 27px;
        }

        .lm-stat p {
          color: #777087;
          margin: 10px 0 5px;
          font-size: 14px;
        }

        .lm-stat h2 {
          margin: 0;
          color: #7138c8;
          font-size: 27px;
        }

        .lm-content {
          width: 86%;
          margin: auto;
        }

        .lm-section {
          background: white;
          border-radius: 19px;
          padding: 26px;
          margin-bottom: 25px;
          box-shadow: 0 5px 20px rgba(65, 42, 100, 0.055);
          border: 1px solid #eee8fa;
        }

        .lm-section-heading {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 22px;
        }

        .lm-section-icon {
          width: 43px;
          height: 43px;
          display: grid;
          place-items: center;
          background: #f1e9ff;
          border-radius: 13px;
          font-size: 21px;
        }

        .lm-section-heading h2 {
          margin: 0;
          font-size: 21px;
          color: #39275b;
        }

        .lm-section-heading p {
          margin: 5px 0 0;
          color: #888095;
          font-size: 13px;
        }

        .lm-form-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 17px;
        }

        .lm-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 16px;
          color: #514765;
          font-size: 14px;
          font-weight: 600;
        }

        .lm-field.full {
          grid-column: 1 / -1;
        }

        .lm-field input,
        .lm-field textarea,
        .lm-field select,
        .lm-select {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #e4dced;
          background: #fdfcff;
          padding: 12px 14px;
          border-radius: 10px;
          font: inherit;
          color: #342847;
          outline: none;
          transition: 0.2s;
        }

        .lm-field input:focus,
        .lm-field textarea:focus,
        .lm-field select:focus,
        .lm-select:focus {
          border-color: #9b65dc;
          box-shadow: 0 0 0 3px rgba(155, 101, 220, 0.12);
        }

        .lm-field textarea {
          resize: vertical;
          min-height: 90px;
        }

        .lm-button-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-top: 8px;
        }

        .lm-btn {
          border: none;
          padding: 11px 19px;
          border-radius: 10px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 700;
          transition: 0.2s;
        }

        .lm-btn:hover {
          transform: translateY(-2px);
          filter: brightness(1.04);
        }

        .lm-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .lm-primary {
          background: linear-gradient(110deg, #7041c7, #a14ec6);
          color: white;
        }

        .lm-secondary {
          background: #f0eaff;
          color: #7138c8;
        }

        .lm-danger {
          background: #fff0f2;
          color: #d34465;
        }

        .lm-course-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(235px, 1fr));
          gap: 17px;
        }

        .lm-course-card {
          border: 1px solid #eee6f8;
          background: linear-gradient(145deg, #fff, #fcf9ff);
          border-radius: 16px;
          padding: 20px;
          transition: 0.2s;
        }

        .lm-course-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 23px rgba(95, 55, 145, 0.1);
        }

        .lm-course-card h3 {
          color: #4b2c79;
          margin: 12px 0 8px;
          font-size: 18px;
        }

        .lm-course-card p {
          color: #777087;
          font-size: 13px;
          line-height: 1.5;
          margin: 7px 0;
        }

        .lm-category {
          display: inline-block;
          background: #f1e8ff;
          color: #7843bc;
          padding: 6px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
        }

        .lm-course-actions {
          display: flex;
          gap: 8px;
          margin-top: 16px;
        }

        .lm-course-actions .lm-btn {
          flex: 1;
          padding: 9px;
        }

        .lm-select-wrap {
          margin-bottom: 22px;
        }

        .lm-select-wrap label {
          display: block;
          margin-bottom: 9px;
          font-weight: 700;
          font-size: 14px;
          color: #514765;
        }

        .lm-select {
          max-width: 100%;
        }

        .lm-lesson-list,
        .lm-resource-list {
          display: grid;
          gap: 12px;
          margin-top: 20px;
        }

        .lm-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: wrap;
          padding: 15px;
          border: 1px solid #eee7f6;
          border-radius: 12px;
          background: #fdfbff;
        }

        .lm-item h4 {
          margin: 0 0 5px;
          color: #49306e;
        }

        .lm-item p {
          margin: 4px 0;
          color: #888095;
          font-size: 13px;
        }

        .lm-item-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .lm-empty {
          padding: 22px;
          text-align: center;
          border: 1px dashed #d9c9ec;
          border-radius: 13px;
          color: #888095;
          background: #fcfaff;
        }

        .lm-message {
          width: 86%;
          box-sizing: border-box;
          margin: 20px auto;
          padding: 14px 18px;
          border-radius: 12px;
          background: #f0eaff;
          color: #6535a5;
          font-weight: 600;
        }

        .lm-error {
          background: #fff0f2;
          color: #bd3656;
        }

        .lm-footer {
          text-align: center;
          color: #92899e;
          padding: 25px;
          font-size: 13px;
        }

        @media (max-width: 700px) {
          .lm-hero,
          .lm-content,
          .lm-stats,
          .lm-message {
            width: 92%;
          }

          .lm-hero {
            padding: 25px;
          }

          .lm-stats {
            grid-template-columns: 1fr;
          }

          .lm-form-grid {
            grid-template-columns: 1fr;
          }

          .lm-field.full {
            grid-column: auto;
          }

          .lm-section {
            padding: 18px;
          }
        }
      `}</style>

      <header className="lm-navbar">
        <Link to="/" className="lm-brand">
          LearnSphere
        </Link>

        <Link to="/dashboard" className="lm-back">
          ← Back to Dashboard
        </Link>
      </header>

      <section className="lm-hero">
        <small>LEARNING MANAGEMENT SYSTEM</small>
        <h1>Admin Control Centre ✨</h1>
        <p>
          Create courses, organise lessons and manage learning
          materials in one place.
        </p>
      </section>

      <div style={{
        width: '86%',
        margin: '20px auto',
        display: 'flex',
        justifyContent: 'flex-end'
      }}>
        <Link
          to="/manage-quizzes"
          style={{
            background: 'linear-gradient(110deg, #7041c7, #a14ec6)',
            color: 'white',
            padding: '13px 22px',
            borderRadius: '10px',
            textDecoration: 'none',
            fontWeight: '700',
            boxShadow: '0 5px 15px rgba(112,65,199,0.2)'
          }}
        >
          📝 Manage Quizzes
        </Link>
      </div>

      {message && (
        <div className="lm-message">
          {message}
        </div>
      )}

      {error && (
        <div className="lm-message lm-error">
          {error}
          <button
            className="lm-btn lm-secondary"
            style={{ marginLeft: 12 }}
            onClick={loadCourses}
          >
            Retry
          </button>
        </div>
      )}

      <section className="lm-stats">
        <div className="lm-stat">
          <span>📚</span>
          <p>Total Courses</p>
          <h2>{courses.length}</h2>
        </div>

        <div className="lm-stat">
          <span>🎓</span>
          <p>Total Lessons</p>
          <h2>{totalLessons}</h2>
        </div>

        <div className="lm-stat">
          <span>✨</span>
          <p>Platform Status</p>
          <h2>Active</h2>
        </div>
      </section>

      <main className="lm-content">

        <section className="lm-section">
          <div className="lm-section-heading">
            <div className="lm-section-icon">✏️</div>
            <div>
              <h2>{editingCourseId ? 'Edit Course' : 'Create a Course'}</h2>
              <p>Enter the course details below.</p>
            </div>
          </div>

          <form onSubmit={handleCourseSubmit}>
            <div className="lm-form-grid">

              <label className="lm-field">
                Course Title
                <input
                  type="text"
                  name="title"
                  placeholder="Example: Python Programming"
                  value={courseForm.title}
                  onChange={handleCourseChange}
                  required
                />
              </label>

              <label className="lm-field">
                Instructor Name
                <input
                  type="text"
                  name="instructor"
                  placeholder="Enter instructor name"
                  value={courseForm.instructor}
                  onChange={handleCourseChange}
                  required
                />
              </label>

              <label className="lm-field full">
                Course Description
                <textarea
                  name="description"
                  placeholder="Describe what students will learn..."
                  value={courseForm.description}
                  onChange={handleCourseChange}
                  required
                />
              </label>

              <label className="lm-field">
                Category
                <input
                  type="text"
                  name="category"
                  placeholder="Example: Programming"
                  value={courseForm.category}
                  onChange={handleCourseChange}
                  required
                />
              </label>

              <label className="lm-field">
                Duration
                <input
                  type="text"
                  name="duration"
                  placeholder="Example: 6 Weeks"
                  value={courseForm.duration}
                  onChange={handleCourseChange}
                  required
                />
              </label>

              <label className="lm-field">
                Course Price
                <input
                  type="number"
                  name="price"
                  placeholder="Enter price"
                  value={courseForm.price}
                  onChange={handleCourseChange}
                  min="0"
                  required
                />
              </label>

            </div>

            <div className="lm-button-row">
              <button
                type="submit"
                className="lm-btn lm-primary"
                disabled={loading}
              >
                {loading
                  ? 'Please wait...'
                  : editingCourseId
                    ? '💜 Update Course'
                    : '+ Add Course'}
              </button>

              {editingCourseId && (
                <button
                  type="button"
                  className="lm-btn lm-secondary"
                  onClick={resetCourseForm}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="lm-section">
          <div className="lm-section-heading">
            <div className="lm-section-icon">📚</div>
            <div>
              <h2>Existing Courses</h2>
              <p>View, edit and manage your published courses.</p>
            </div>
          </div>

          {courses.length === 0 ? (
            <div className="lm-empty">
              No courses available yet.
            </div>
          ) : (
            <div className="lm-course-grid">
              {courses.map(course => (
                <article className="lm-course-card" key={course._id}>
                  <span className="lm-category">
                    {course.category || 'General'}
                  </span>

                  <h3>{course.title}</h3>

                  <p>👨‍🏫 {course.instructor}</p>
                  <p>⏱️ {course.duration}</p>
                  <p>
                    📖 {course.lessons?.length || 0} Lessons
                  </p>
                  <p>
                    💰 {Number(course.price || 0) === 0
                      ? 'Free'
                      : `₹${course.price}`}
                  </p>

                  <p>{course.description}</p>

                  <div className="lm-course-actions">
                    <button
                      type="button"
                      className="lm-btn lm-secondary"
                      onClick={() => editCourse(course)}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="lm-btn lm-danger"
                      onClick={() => deleteCourse(course._id)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="lm-section">
          <div className="lm-section-heading">
            <div className="lm-section-icon">🎓</div>
            <div>
              <h2>Lesson Management</h2>
              <p>Add, edit and delete lessons inside your courses.</p>
            </div>
          </div>

          <div className="lm-select-wrap">
            <label>Select Course</label>
            <select
              className="lm-select"
              value={selectedCourse}
              onChange={e => {
                setSelectedCourse(e.target.value)
                setSelectedLesson('')
                resetLessonForm()
              }}
            >
              <option value="">Choose a course</option>
              {courses.map(course => (
                <option key={course._id} value={course._id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>

          {selectedCourse && (
            <>
              <h3 style={{ color: '#55347f' }}>
                {editingLessonId ? 'Edit Lesson' : 'Add New Lesson'}
              </h3>

              <form onSubmit={handleLessonSubmit}>
                <div className="lm-form-grid">
                  <label className="lm-field">
                    Lesson ID
                    <input
                      type="text"
                      name="lessonId"
                      placeholder="Example: PY06"
                      value={lessonForm.lessonId}
                      onChange={handleLessonChange}
                      required
                      disabled={Boolean(editingLessonId)}
                    />
                  </label>

                  <label className="lm-field">
                    Lesson Title
                    <input
                      type="text"
                      name="title"
                      placeholder="Enter lesson title"
                      value={lessonForm.title}
                      onChange={handleLessonChange}
                      required
                    />
                  </label>

                  <label className="lm-field full">
                    Lesson Content
                    <textarea
                      name="content"
                      placeholder="Enter lesson content..."
                      value={lessonForm.content}
                      onChange={handleLessonChange}
                      required
                      rows="6"
                    />
                  </label>
                </div>

                <div className="lm-button-row">
                  <button
                    type="submit"
                    className="lm-btn lm-primary"
                    disabled={loading}
                  >
                    {editingLessonId ? 'Update Lesson' : '+ Add Lesson'}
                  </button>

                  {editingLessonId && (
                    <button
                      type="button"
                      className="lm-btn lm-secondary"
                      onClick={resetLessonForm}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>

              <div className="lm-lesson-list">
                <h3 style={{ color: '#55347f' }}>Existing Lessons</h3>

                {lessons.length === 0 ? (
                  <div className="lm-empty">
                    No lessons added yet.
                  </div>
                ) : (
                  lessons.map(lesson => (
                    <div className="lm-item" key={lesson.lessonId}>
                      <div>
                        <h4>
                          {lesson.lessonId} — {lesson.title}
                        </h4>
                        <p>
                          {lesson.resources?.length || 0} Learning Materials
                        </p>
                      </div>

                      <div className="lm-item-actions">
                        <button
                          type="button"
                          className="lm-btn lm-secondary"
                          onClick={() => editLesson(lesson)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="lm-btn lm-danger"
                          onClick={() => deleteLesson(lesson.lessonId)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </section>

        <section className="lm-section">
          <div className="lm-section-heading">
            <div className="lm-section-icon">📎</div>
            <div>
              <h2>Learning Materials</h2>
              <p>Attach PDFs, presentations, videos and useful links.</p>
            </div>
          </div>

          <div className="lm-select-wrap">
            <label>Select Course</label>
            <select
              className="lm-select"
              value={selectedCourse}
              onChange={e => {
                setSelectedCourse(e.target.value)
                setSelectedLesson('')
                resetLessonForm()
              }}
            >
              <option value="">Choose a course</option>
              {courses.map(course => (
                <option key={course._id} value={course._id}>
                  {course.title}
                </option>
              ))}
            </select>
          </div>

          {selectedCourse && (
            <div className="lm-select-wrap">
              <label>Select Lesson</label>
              <select
                className="lm-select"
                value={selectedLesson}
                onChange={e => setSelectedLesson(e.target.value)}
              >
                <option value="">Choose a lesson</option>
                {lessons.map(lesson => (
                  <option key={lesson.lessonId} value={lesson.lessonId}>
                    {lesson.lessonId} — {lesson.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedCourse && selectedLesson && (
            <>
              <h3 style={{ color: '#55347f' }}>
                Add Learning Material
              </h3>

              <form onSubmit={handleResourceSubmit}>
                <div className="lm-form-grid">
                  <label className="lm-field">
                    Material Title
                    <input
                      type="text"
                      name="title"
                      placeholder="Example: Python Notes"
                      value={resourceForm.title}
                      onChange={handleResourceChange}
                      required
                    />
                  </label>

                  <label className="lm-field">
                    Material Type
                    <select
                      name="type"
                      value={resourceForm.type}
                      onChange={handleResourceChange}
                      required
                    >
                      <option value="PDF">PDF</option>
                      <option value="PPT">PPT</option>
                      <option value="VIDEO">VIDEO</option>
                      <option value="LINK">LINK</option>
                    </select>
                  </label>

                  {['PDF', 'PPT'].includes(resourceForm.type) ? (
                    <label className="lm-field full">
                      Upload PDF / PPT File
                      <input
                        id="lm-resource-file"
                        type="file"
                        accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                        onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                        required
                      />

                      <small style={{ color: '#888095', fontWeight: 400 }}>
                        Maximum file size: 20 MB. Allowed formats: PDF, PPT and PPTX.
                      </small>

                      {selectedFile && (
                        <small style={{ color: '#6535a5' }}>
                          Selected: {selectedFile.name}
                        </small>
                      )}
                    </label>
                  ) : (
                    <label className="lm-field full">
                      Material URL
                      <input
                        type="url"
                        name="url"
                        placeholder="Paste the video or learning material link"
                        value={resourceForm.url}
                        onChange={handleResourceChange}
                        required
                      />
                    </label>
                  )}
                </div>

                <div className="lm-button-row">
                  <button
                    type="submit"
                    className="lm-btn lm-primary"
                    disabled={loading}
                  >
                    + Add Material
                  </button>
                </div>
              </form>

              <div className="lm-resource-list">
                <h3 style={{ color: '#55347f' }}>
                  Existing Materials
                </h3>

                {materials.length === 0 ? (
                  <div className="lm-empty">
                    No materials added to this lesson yet.
                  </div>
                ) : (
                  materials.map(resource => (
                    <div className="lm-item" key={resource._id}>
                      <div>
                        <h4>{resource.title}</h4>
                        <p>Type: {resource.type}</p>

                        {resource.url ? (
                          <a
                            href={
                              resource.url.startsWith('/uploads/')
                                ? `${API_BASE_URL}${resource.url}`
                                : resource.url
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Open Material
                          </a>
                        ) : (
                          <p>No link added yet.</p>
                        )}
                      </div>

                      <button
                        type="button"
                        className="lm-btn lm-danger"
                        onClick={() => deleteResource(resource._id)}
                      >
                        Delete Material
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </section>
      </main>

      <footer className="lm-footer">
        © {new Date().getFullYear()} LearnSphere. Empowering learning, one lesson at a time. 💜
      </footer>
    </div>
  )
}

export default CourseManagement
