# Superior Test — Online Examination Platform

A comprehensive, professional online examination management platform for schools, colleges, and educational institutions.

## Features

### For Students
- Register and verify email via OTP
- View upcoming, active, completed, and missed tests
- Take tests with all questions on a single scrollable page
- Auto-save protection against connection issues
- Countdown timer with auto-submission
- View detailed results with correct/incorrect answers
- Performance tracking with charts
- Notification system

### For Teachers
- Create tests by pasting MCQ text (smart parser)
- Configure test settings (duration, marks, negative marking, etc.)
- Preview tests before publishing
- Save as draft or publish
- Question bank with automatic saving
- Live monitoring of test submissions
- View and export results
- Manage assigned classes and sections

### For Principals
- Full administrative control
- Manage teachers (create, enable/disable, delete)
- Manage students (view, search, deactivate)
- Create and manage classes, sections, and subjects
- Assign teachers to classes/sections/subjects
- View all tests and results
- Comprehensive analytics with charts
- Export reports (CSV)
- Audit logging
- System-wide notifications

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Database**: IndexedDB (via Dexie.js) — persistent client-side storage
- **Routing**: React Router
- **Charts**: Recharts
- **Icons**: Lucide React

## Security Features

- OTP-based authentication for students (email + OTP)
- Two-factor authentication for staff (username + password + OTP)
- Password hashing (SHA-256 with salt)
- Session management with token expiration
- Role-based access control
- Tab-switch detection during tests
- Right-click and copy prevention during tests
- Auto-save with server-side validation
- Audit logging for all administrative actions

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/superior-test.git
cd superior-test

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### First-Time Setup

1. Open the application in your browser
2. Click "Setup Principal Account" to create the initial administrator
3. Login as Principal via Staff Login
4. Create Classes and Sections
5. Create Subjects
6. Add Teachers and assign them to classes
7. Students can then register and take tests

## Project Structure

```
src/
├── App.tsx              # Main app with routing
├── auth.tsx             # Authentication context and logic
├── db.ts                # Database schema (Dexie.js/IndexedDB)
├── utils.ts             # Utility functions (MCQ parser, etc.)
├── index.css            # Global styles
├── main.tsx             # Entry point
└── pages/
    ├── HomePage.tsx         # Landing page
    ├── StudentRegister.tsx  # Student registration
    ├── StudentLogin.tsx     # Student login (email + OTP)
    ├── StaffLogin.tsx       # Teacher/Principal login
    ├── PrincipalSetup.tsx   # Initial principal setup
    ├── StudentDashboard.tsx # Student interface
    ├── TeacherDashboard.tsx # Teacher interface
    ├── PrincipalDashboard.tsx # Principal interface
    ├── TestTaking.tsx       # Test-taking interface
    └── TestResult.tsx       # Result display
```

## Database Schema

The application uses IndexedDB with the following tables:

- **users** — All user accounts (students, teachers, principals)
- **otpRecords** — OTP verification records
- **classes** — Class/grade records
- **sections** — Section records within classes
- **subjects** — Subject/category records
- **teacherAssignments** — Teacher-class-section-subject mappings
- **tests** — Test definitions and settings
- **questions** — Test questions
- **questionBank** — Reusable question bank
- **testAttempts** — Student test attempts
- **studentAnswers** — Individual answer records
- **notifications** — User notifications
- **auditLogs** — Activity audit trail
- **sessions** — Authentication sessions

## MCQ Format

Teachers can paste questions in this format:

```
1. What is the capital of France?
A) London
B) Paris
C) Berlin
D) Madrid
Correct Answer: B

2. Which planet is closest to the Sun?
A) Venus
B) Earth
C) Mercury
D) Mars
Correct Answer: C
```

The parser handles various formatting styles including extra blank lines, markdown markers, and different separators.

## Deployment

### Static Hosting (GitHub Pages, Netlify, Vercel)

```bash
npm run build
# Deploy the dist/ folder
```

Note: The application uses HashRouter for compatibility with static hosting.

### Production Considerations

For a full production deployment with:
- Real email OTP delivery (integrate with SendGrid, AWS SES, etc.)
- Server-side database (PostgreSQL, MySQL)
- Backend API (Node.js/Express, Python/Django)
- Real-time features (WebSockets)
- File storage for exports

The current architecture is designed to be easily extended with a backend API by replacing the Dexie.js database calls with API calls.

## License

MIT License

## Support

For issues and feature requests, please use the GitHub Issues section.
