# 🎓 Attendance Management System (AMS)

A full-stack Attendance Management System with role-based access for **Students**, **Teachers**, and **Admins**.

---

## ⚙️ Tech Stack

| Layer      | Technology                          | Why                                      |
|------------|-------------------------------------|------------------------------------------|
| Backend    | Node.js + Express                   | Fast, lightweight, easy to deploy        |
| Database   | SQLite (via built-in `node:sqlite`) | Zero config, file-based, no server needed|
| Auth       | JWT + bcryptjs                      | Secure, stateless, industry standard     |
| Frontend   | HTML + Tailwind CSS + Vanilla JS    | Already built, no changes to UI needed   |

---

## 📁 Folder Structure

```
Attendeance-Management-system-/
├── api.js                        ← Shared API client (used by all HTML pages)
├── LOGIN.html
├── student dashboard.html
├── attendence page.html
├── planner.html
├── timetable.html
├── profile.html
├── hub.html                      ← Teacher dashboard
├── scanner.html                  ← Teacher face-ID login
├── schedule.html
├── analytics.html                ← Teacher analytics
├── admin portal.html
├── manageuser.html
├── attendancepageadmin.html
├── analyticsadmin.html
├── attendance sheet.html
└── backend/
    ├── server.js                 ← Express entry point
    ├── .env                      ← Environment config
    ├── package.json
    ├── db/
    │   ├── database.js           ← SQLite schema + connection
    │   └── seed.js               ← Sample data seeder
    ├── middleware/
    │   └── auth.js               ← JWT + RBAC middleware
    ├── routes/
    │   ├── auth.js
    │   ├── students.js
    │   ├── teachers.js
    │   └── admin.js
    └── controllers/
        ├── authController.js
        ├── studentController.js
        ├── teacherController.js
        └── adminController.js
```

---

## 🚀 Setup & Run

### Prerequisites
- Node.js **v22 or higher** (uses built-in `node:sqlite`)
- npm

### 1. Install dependencies
```bash
cd backend
npm install
```

### 2. Seed the database
```bash
npm run seed
```

### 3. Start the server
```bash
npm start
```

The server starts at **http://localhost:3000**

Open **http://localhost:3000/LOGIN.html** in your browser.

---

## 🔑 Login Credentials

| Role    | Identifier        | Password     |
|---------|-------------------|--------------|
| Admin   | admin@ams.edu     | admin123     |
| Teacher | FAC-001           | teacher123   |
| Teacher | FAC-002           | teacher123   |
| Student | 2024-CSE-001      | student123   |
| Student | 2024-CSE-002      | student123   |
| Student | 2024-CSE-003 to 008 | student123 |

---

## 📡 API Endpoints

### Auth
| Method | Endpoint                  | Description              |
|--------|---------------------------|--------------------------|
| POST   | /api/auth/login           | Login (all roles)        |
| GET    | /api/auth/me              | Get current user         |
| PUT    | /api/auth/change-password | Change password          |

### Student (requires student JWT)
| Method | Endpoint                           | Description              |
|--------|------------------------------------|--------------------------|
| GET    | /api/student/dashboard             | Stats + overall %        |
| GET    | /api/student/attendance/subjects   | Subject-wise attendance  |
| GET    | /api/student/attendance/history    | Date-wise history        |
| GET    | /api/student/profile               | Profile + subjects       |
| PUT    | /api/student/profile               | Update contact info      |

### Teacher (requires teacher JWT)
| Method | Endpoint                                  | Description              |
|--------|-------------------------------------------|--------------------------|
| GET    | /api/teacher/dashboard                    | Overview + recent sessions|
| GET    | /api/teacher/subjects                     | Assigned subjects        |
| GET    | /api/teacher/students?class_id=&subject_id= | Students with attendance |
| GET    | /api/teacher/attendance/sessions          | Past sessions            |
| POST   | /api/teacher/attendance/session           | Mark attendance          |
| PUT    | /api/teacher/attendance/session/:id       | Edit attendance          |
| GET    | /api/teacher/analytics                    | Subject stats + at-risk  |

### Admin (requires admin JWT)
| Method | Endpoint                      | Description              |
|--------|-------------------------------|--------------------------|
| GET    | /api/admin/dashboard          | System stats             |
| GET    | /api/admin/users              | List all users           |
| POST   | /api/admin/users              | Add student/teacher      |
| PUT    | /api/admin/users/:id          | Update user              |
| DELETE | /api/admin/users/:id          | Delete user              |
| GET    | /api/admin/attendance/report  | Full attendance report   |
| GET    | /api/admin/analytics          | Dept stats + at-risk     |
| GET    | /api/admin/subjects           | All subjects             |
| POST   | /api/admin/subjects           | Create subject           |
| POST   | /api/admin/assign-subject     | Assign teacher to subject|
| GET    | /api/admin/classes            | All classes              |
| GET    | /api/admin/departments        | All departments          |

---

## 🗄️ Database Schema

```
users           → id, identifier, password (hashed), role, name, email, phone
departments     → id, name, code
subjects        → id, code, name, department_id, credits
classes         → id, name, section, department_id
students        → id, user_id, roll_no, class_id, semester, address
teachers        → id, user_id, staff_id, department_id, designation
teacher_subjects→ id, teacher_id, subject_id, class_id
attendance_sessions → id, subject_id, class_id, teacher_id, date
attendance_records  → id, session_id, student_id, status (present/absent/late)
```

---

## 🔐 Environment Variables (backend/.env)

```env
PORT=3000
JWT_SECRET=your_secret_key_here
JWT_EXPIRES_IN=7d
DB_PATH=./db/ams.db
```

---

## 📐 Attendance Formula

```
attendance % = (classes_attended / total_classes) × 100
safe_to_bunk  = floor((present / 0.75) - total_classes)
at_risk       = attendance % < 75%
```
