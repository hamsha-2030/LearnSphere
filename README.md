# LearnSphere – Online Learning Platform

LearnSphere is a MERN stack web application designed to provide an online learning environment where students can explore courses, enroll in them, access lessons, and track their learning progress.

## Features

- **User Authentication:** Student registration and login using password hashing and JWT authentication.
- **Course Listing:** View available courses and their details.
- **Course Management:** Create, view, update, and delete courses.
- **Course Enrollment:** Enroll in available courses.
- **Learning Module:** Access course lessons through the learning interface.
- **Progress Tracking:** Mark lessons as completed and track course progress.
- **Database Integration:** Store users, courses, enrollments, and progress in MongoDB.
- **Responsive Interface:** React-based frontend with custom styling.

## Technologies Used

- **Frontend:** React, Vite, JavaScript, CSS
- **Backend:** Node.js, Express.js
- **Database:** MongoDB, Mongoose
- **Authentication:** JSON Web Tokens (JWT), bcryptjs
- **Development Tools:** Visual Studio Code, Postman, Git, GitHub

## Project Structure

```text
LearnSphere/
├── client/
│   └── src/
│       ├── pages/
│       ├── App.jsx
│       ├── App.css
│       └── Home.jsx
├── server/
│   ├── models/
│   ├── package.json
│   ├── seedLessons.js
│   └── server.js
├── postman/
└── .gitignore
```

## Prerequisites

Install the following before running the project:

- Node.js and npm
- MongoDB Community Server
- Git (optional, for cloning the repository)

## Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/hamsha-2030/LearnSphere.git
cd LearnSphere
```

### 2. Configure the backend

Open a terminal:

```bash
cd server
npm install
```

Create a `.env` file inside the `server` folder with the following configuration:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/learnsphere
JWT_SECRET=replace_with_a_long_random_secret
```

Replace the JWT secret with a strong, private value. Never upload the actual `.env` file to GitHub.

Ensure your local MongoDB server is running.

Start the backend:

```bash
npm run dev
```

The backend should run at `http://localhost:5000`.

### 3. Configure the frontend

Open a second terminal from the project root:

```bash
cd client
npm install
npm run dev
```

Open the local URL printed by Vite in your terminal, usually `http://localhost:5173`.

## Database

The project uses MongoDB with Mongoose models for:

- Users
- Courses
- Enrollments and learning progress

The database name used for local development is `learnsphere`.

## Main API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Check backend status |
| GET | `/api/courses` | Retrieve courses |
| POST | `/api/courses` | Create a course |
| PUT | `/api/courses/:id` | Update a course |
| DELETE | `/api/courses/:id` | Delete a course |
| POST | `/api/auth/register` | Register a student |
| POST | `/api/auth/login` | Log in |
| POST | `/api/enrollments` | Enroll in a course |
| GET | `/api/enrollments/my-courses` | View enrolled courses |
| GET | `/api/enrollments/course/:courseId` | View enrollment progress |
| PATCH | `/api/enrollments/:enrollmentId/lessons/:lessonId` | Update lesson completion |

## Learning Outcomes

This project demonstrates the integration of a React frontend, an Express and Node.js backend, and a MongoDB database. It also provides practical experience with REST APIs, CRUD operations, authentication, database relationships, and learning progress tracking.

## Future Enhancements

- Role-based authorization for course administrators
- Deployment to cloud hosting platforms
- Enhanced course search and filtering
- Improved learning analytics and reporting
- Additional course content and assessments

## Author

Developed as an academic project to demonstrate MERN stack development and database integration.
