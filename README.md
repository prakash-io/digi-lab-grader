# 🎓 VirTA - Digital Lab Grader

> **Automated Lab Grading System for Universities** - A full-stack web application for managing coding assignments, auto-grading student submissions, and tracking academic performance.

[![GitHub](https://img.shields.io/badge/GitHub-Repository-blue)](https://github.com/prakash-io/digital-lab-grader)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![React](https://img.shields.io/badge/React-18.2+-61DAFB)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933)](https://nodejs.org/)

## 🚀 Overview

VirTA is a comprehensive platform designed for universities to streamline the process of creating coding assignments, evaluating student submissions, and managing academic workflows. The system supports both **Student** and **Instructor** portals with role-based access control.

### Key Features

- ✅ **Automated Code Grading** - AI-powered auto-grading with complexity analysis
- ✅ **Real-time Notifications** - WebSocket-based live updates
- ✅ **Multi-language Support** - Python, JavaScript, Java, C++, C
- ✅ **Role-based Access** - Separate dashboards for students and instructors
- ✅ **Assignment Management** - Create, edit, and manage coding assignments
- ✅ **Leaderboard System** - Track student rankings and statistics
- ✅ **Profile Management** - User profiles with avatar system
- ✅ **Dark Mode** - Full dark mode support across all pages
- ✅ **Code Editor** - Built-in code editor with syntax highlighting
- ✅ **Test Case Management** - Public and hidden test cases

## 📋 Table of Contents

- [Tech Stack](#-tech-stack)
- [Features](#-features)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [API Documentation](#-api-documentation)
- [Screenshots](#-screenshots)
- [Contributing](#-contributing)
- [License](#-license)

## 🛠 Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **React Router** - Client-side routing
- **Socket.IO Client** - Real-time communication
- **Tabler Icons** - Icon library

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Socket.IO** - WebSocket server
- **JWT** - Authentication tokens
- **bcrypt** - Password hashing
- **BullMQ** - Job queue for grading
- **Redis** - Job queue backend (optional)
- **Zod** - Schema validation
- **Piston API** - Code execution sandbox

### Development Tools
- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **Git** - Version control

## ✨ Features

### For Students
- 📝 View assignments with test cases
- 💻 Code editor with syntax highlighting
- 🧪 Run public tests before submission
- 📊 View submission results and scores
- 🏆 Check leaderboard rankings
- 👤 Manage profile and avatars
- 🔔 Receive real-time notifications
- 🛒 Avatar shop with coin system

### For Instructors
- 📚 Create and edit coding assignments
- 🎯 Set time and memory limits
- 🔒 Configure public and hidden test cases
- 📈 View student leaderboard
- 📢 Make announcements
- 📊 Grade student submissions
- 👥 Manage student records
- 📝 Track assignment statistics

### Auto-Grading System
- **Correctness Scoring** (0-6 points) - Based on public and hidden test cases
- **Efficiency Scoring** (0-3 points) - Complexity analysis (O(1) to O(n³))
- **Code Quality** (0-1 points) - Static analysis and code review
- **Total Score** - Out of 10 points with detailed feedback

## 📦 Installation

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Redis (optional, for job queue)

### Step 1: Clone the Repository
```bash
git clone https://github.com/prakash-io/digital-lab-grader.git
cd digital-lab-grader/virta-react
```

### Step 2: Install Frontend Dependencies
```bash
npm install
```

### Step 3: Install Backend Dependencies
```bash
cd server
npm install
cd ..
```

### Step 4: (Optional) Setup Redis for Auto-grading
```bash
# On macOS
brew install redis
brew services start redis

# On Ubuntu
sudo apt-get install redis-server
sudo systemctl start redis
```

## 🚀 Quick Start

### Start Backend Server
```bash
cd server
npm run dev
```
Backend runs on `http://localhost:3001`

### Start Frontend Server (in a new terminal)
```bash
npm run dev
```
Frontend runs on `http://localhost:5173`

### Access the Application
1. Open `http://localhost:5173` in your browser
2. Sign up as a **Student** or **Instructor**
3. Start using the platform!

## 📁 Project Structure

```
virta-react/
├── server/                 # Backend API
│   ├── routes/            # API routes
│   │   ├── auth.js        # Authentication
│   │   ├── assignments.js # Assignment management
│   │   ├── submissions.js # Submission handling
│   │   ├── announcements.js
│   │   ├── notifications.js
│   │   ├── grades.js
│   │   └── runPublic.js   # Public test execution
│   ├── utils/             # Utilities
│   │   ├── dataStorage.js # JSON file storage
│   │   ├── validation.js  # Zod schemas
│   │   ├── sandbox.js     # Code execution
│   │   ├── scoring.js     # Grading logic
│   │   └── jobQueue.js    # BullMQ setup
│   ├── workers/           # Background workers
│   │   └── submissionWorker.js
│   ├── data/              # JSON data files
│   └── server.js          # Main server file
├── src/
│   ├── components/        # React components
│   │   ├── ui/           # UI components (sidebar, cards)
│   │   ├── LoginSignupForm.jsx
│   │   ├── NotificationButton.jsx
│   │   └── ThemeToggle.jsx
│   ├── pages/            # Page components
│   │   ├── Dashboard.jsx
│   │   ├── InstructorDashboard.jsx
│   │   ├── CodeEditor.jsx
│   │   ├── StudentAssignments.jsx
│   │   ├── TeacherAssignments.jsx
│   │   ├── Leaderboard.jsx
│   │   ├── Profile.jsx
│   │   └── Store.jsx
│   ├── context/          # React context
│   │   └── AuthContext.jsx
│   ├── services/         # API services
│   │   ├── authService.js
│   │   ├── apiService.js
│   │   └── socketService.js
│   ├── utils/            # Utilities
│   │   └── avatars.js
│   └── App.jsx           # Main app component
├── projects/             # Standalone projects
│   ├── dashboard/        # Dashboard project
│   ├── leaderboard/      # Leaderboard project
│   ├── avatar-shop/      # Avatar shop project
│   └── instructor/       # Instructor project
└── README.md
```

## 📚 API Documentation

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/verify` - Verify JWT token

### Assignments
- `GET /api/assignments?role=student` - Get all assignments (role-aware)
- `GET /api/assignments/:id` - Get assignment by ID
- `POST /api/assignments` - Create assignment (instructor only)
- `PUT /api/assignments/:id` - Update assignment (instructor only)

### Submissions
- `POST /api/submissions` - Submit code for grading
- `GET /api/submissions/:id` - Get submission status and results
- `GET /api/submissions/assignment/:assignmentId` - Get all submissions for an assignment

### Public Tests
- `POST /api/run-public` - Run public test cases (rate-limited)

### Announcements & Notifications
- `POST /api/announcements` - Create announcement (instructor only)
- `GET /api/announcements` - Get all announcements
- `GET /api/notifications/:userId` - Get user notifications
- `PUT /api/notifications/:notificationId/read` - Mark notification as read

## 🎨 Screenshots

### Student Dashboard
- Interactive cards for assignments, code editor, leaderboard
- Real-time notifications
- Profile management

### Instructor Dashboard
- Assignment creation and management
- Student leaderboard
- Announcement system

### Code Editor
- Syntax highlighting
- Test case execution
- Auto-grading results

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Piston API](https://github.com/engineer-man/piston) - Code execution sandbox
- [Tabler Icons](https://tabler.io/icons) - Icon library
- [shadcn/ui](https://ui.shadcn.com/) - UI components
- [Framer Motion](https://www.framer.com/motion/) - Animation library

## 📞 Contact

- **Repository**: [https://github.com/prakash-io/digital-lab-grader](https://github.com/prakash-io/digital-lab-grader)
- **Issues**: [GitHub Issues](https://github.com/prakash-io/digital-lab-grader/issues)

---

**Built with ❤️ for D3 Hackathon 2025**
