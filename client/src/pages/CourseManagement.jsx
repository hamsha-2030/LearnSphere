
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import './Auth.css'

const API = 'http://localhost:5000/api/courses'

function CourseManagement() {
  const [courses, setCourses] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    title: '',
    instructor: '',
    description: '',
    category: '',
    duration: '',
    price: 0
  })

  const token = localStorage.getItem('learnsphereToken')

  async function loadCourses() {
    try {
      const response = await fetch(API)
      const data = await response.json()
      if (response.ok) setCourses(data)
      else setMessage('Could not load courses.')
    } catch {
      setMessage('Cannot connect to the server.')
    }
  }

  useEffect(() => {
    loadCourses()
  }, [])

  function handleChange(event) {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')

    if (!token) {
      setMessage('Please sign in first.')
      return
    }

    const url = editingId ? `${API}/${editingId}` : API
    const method = editingId ? 'PUT' : 'POST'

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...form,
          price: Number(form.price)
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage(data.message || 'Could not save the course.')
        return
      }

      setMessage(editingId ? 'Course updated successfully!' : 'Course added successfully!')
      resetForm()
      loadCourses()
    } catch {
      setMessage('Cannot connect to the server.')
    }
  }

  function startEdit(course) {
    setEditingId(course._id)
    setForm({
      title: course.title || '',
      instructor: course.instructor || '',
      description: course.description || '',
      category: course.category || '',
      duration: course.duration || '',
      price: course.price || 0
    })
    setMessage('')
    window.scrollTo(0, 0)
  }

  function resetForm() {
    setEditingId(null)
    setForm({
      title: '',
      instructor: '',
      description: '',
      category: '',
      duration: '',
      price: 0
    })
  }

  async function deleteCourse(id) {
    if (!window.confirm('Are you sure you want to delete this course?')) return

    try {
      const response = await fetch(`${API}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      const data = await response.json()

      if (!response.ok) {
        setMessage(data.message || 'Could not delete the course.')
        return
      }

      setMessage('Course deleted successfully.')
      if (editingId === id) resetForm()
      loadCourses()
    } catch {
      setMessage('Cannot connect to the server.')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: '850px' }}>
        <Link to="/dashboard">← Back to Dashboard</Link>
        <h1>Course Management</h1>
        <p>Add, update, view, and delete LearnSphere courses.</p>

        {message && <p role="status">{message}</p>}

        <form onSubmit={handleSubmit}>
          <label>Course Title</label>
          <input name="title" value={form.title} onChange={handleChange} required />

          <label>Instructor</label>
          <input name="instructor" value={form.instructor} onChange={handleChange} required />

          <label>Description</label>
          <textarea name="description" value={form.description} onChange={handleChange} required />

          <label>Category</label>
          <input name="category" value={form.category} onChange={handleChange} required />

          <label>Duration</label>
          <input name="duration" value={form.duration} onChange={handleChange} placeholder="e.g. 6 weeks" required />

          <label>Price</label>
          <input name="price" type="number" min="0" value={form.price} onChange={handleChange} required />

          <button type="submit">
            {editingId ? 'Update Course' : 'Add Course'}
          </button>

          {editingId && (
            <button type="button" onClick={resetForm}>
              Cancel Editing
            </button>
          )}
        </form>

        <h2>All Courses ({courses.length})</h2>

        {courses.map(course => (
          <div key={course._id} style={{ border: '1px solid #ddd', borderRadius: '12px', padding: '16px', marginTop: '12px' }}>
            <h3>{course.title}</h3>
            <p>{course.description}</p>
            <p>{course.category} · {course.duration} · ₹{course.price}</p>
            <button type="button" onClick={() => startEdit(course)}>
              Edit
            </button>
            <button type="button" onClick={() => deleteCourse(course._id)}>
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default CourseManagement
