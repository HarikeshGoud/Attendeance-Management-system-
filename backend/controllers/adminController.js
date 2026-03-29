const bcrypt = require('bcryptjs');
const db = require('../db/database');

// GET /api/admin/dashboard
exports.getDashboard = (req, res) => {
  const totalStudents  = db.prepare(`SELECT COUNT(*) as c FROM students`).get().c;
  const totalTeachers  = db.prepare(`SELECT COUNT(*) as c FROM teachers`).get().c;
  const totalDepts     = db.prepare(`SELECT COUNT(*) as c FROM departments`).get().c;
  const totalSessions  = db.prepare(`SELECT COUNT(*) as c FROM attendance_sessions`).get().c;

  const avgAttendance = db.prepare(`
    SELECT ROUND(CAST(SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) AS REAL) /
                 NULLIF(COUNT(*), 0) * 100, 1) as avg
    FROM attendance_records
  `).get().avg || 0;

  const recentActivity = db.prepare(`
    SELECT ase.date, sub.name as subject, c.name as class_name, c.section,
           u.name as teacher,
           COUNT(ar.id) as total,
           SUM(CASE WHEN ar.status='present' THEN 1 ELSE 0 END) as present
    FROM attendance_sessions ase
    JOIN subjects sub ON ase.subject_id = sub.id
    JOIN classes c ON ase.class_id = c.id
    JOIN teachers t ON ase.teacher_id = t.id
    JOIN users u ON t.user_id = u.id
    LEFT JOIN attendance_records ar ON ar.session_id = ase.id
    GROUP BY ase.id
    ORDER BY ase.date DESC
    LIMIT 10
  `).all();

  res.json({
    stats: { totalStudents, totalTeachers, totalDepts, totalSessions, avgAttendance },
    recent_activity: recentActivity
  });
};

// GET /api/admin/users?role=&search=&page=&limit=
exports.getUsers = (req, res) => {
  const { role, search, page = 1, limit = 20 } = req.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let query = `SELECT id, identifier, role, name, email, phone, created_at FROM users WHERE 1=1`;
  const params = [];

  if (role)   { query += ` AND role=?`;                          params.push(role); }
  if (search) { query += ` AND (name LIKE ? OR identifier LIKE ?)`; params.push(`%${search}%`, `%${search}%`); }

  let countQuery = `SELECT COUNT(*) as c FROM users WHERE 1=1`;
  const countParams = [];
  if (role)   { countQuery += ` AND role=?`;                              countParams.push(role); }
  if (search) { countQuery += ` AND (name LIKE ? OR identifier LIKE ?)`;  countParams.push(`%${search}%`, `%${search}%`); }
  const total = db.prepare(countQuery).get(...countParams).c || 0;

  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), offset);

  const users = db.prepare(query).all(...params);
  res.json({ users, total, page: parseInt(page), limit: parseInt(limit) });
};

// POST /api/admin/users — add student or teacher
exports.createUser = (req, res) => {
  const { identifier, password, role, name, email, phone, extra } = req.body;
  // extra for student: { roll_no, class_id, semester }
  // extra for teacher: { staff_id, department_id, designation }

  if (!identifier || !password || !role || !name) {
    return res.status(400).json({ error: 'identifier, password, role, name required' });
  }
  if (!['student', 'teacher', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const existing = db.prepare(`SELECT id FROM users WHERE identifier=?`).get(identifier);
  if (existing) return res.status(409).json({ error: 'Identifier already exists' });

  const hashed = bcrypt.hashSync(password, 10);

  let userId;
  db.exec('BEGIN');
  try {
    const { lastInsertRowid } = db.prepare(
      `INSERT INTO users (identifier, password, role, name, email, phone) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(identifier, hashed, role, name, email || null, phone || null);
    userId = lastInsertRowid;

    if (role === 'student' && extra) {
      db.prepare(`INSERT INTO students (user_id, roll_no, class_id, semester) VALUES (?, ?, ?, ?)`)
        .run(userId, extra.roll_no || identifier, extra.class_id, extra.semester || 1);
    } else if (role === 'teacher' && extra) {
      db.prepare(`INSERT INTO teachers (user_id, staff_id, department_id, designation) VALUES (?, ?, ?, ?)`)
        .run(userId, extra.staff_id || identifier, extra.department_id, extra.designation || 'Assistant Professor');
    }
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  res.status(201).json({ message: 'User created', user_id: userId });
};

// DELETE /api/admin/users/:id
exports.deleteUser = (req, res) => {
  const { id } = req.params;
  if (parseInt(id) === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });

  const user = db.prepare(`SELECT id FROM users WHERE id=?`).get(id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  db.prepare(`DELETE FROM users WHERE id=?`).run(id);
  res.json({ message: 'User deleted' });
};

// PUT /api/admin/users/:id
exports.updateUser = (req, res) => {
  const { id } = req.params;
  const { name, email, phone } = req.body;

  const user = db.prepare(`SELECT id FROM users WHERE id=?`).get(id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  db.prepare(`UPDATE users SET name=COALESCE(?,name), email=COALESCE(?,email), phone=COALESCE(?,phone) WHERE id=?`)
    .run(name || null, email || null, phone || null, id);

  res.json({ message: 'User updated' });
};

// GET /api/admin/attendance/report?student_id=&subject_id=&class_id=&date_from=&date_to=
exports.getAttendanceReport = (req, res) => {
  const { student_id, subject_id, class_id, date_from, date_to } = req.query;

  let query = `
    SELECT ar.status, ase.date,
           u.name as student_name, s.roll_no,
           sub.name as subject_name, sub.code,
           c.name as class_name, c.section,
           tu.name as teacher_name
    FROM attendance_records ar
    JOIN attendance_sessions ase ON ar.session_id = ase.id
    JOIN students s ON ar.student_id = s.id
    JOIN users u ON s.user_id = u.id
    JOIN subjects sub ON ase.subject_id = sub.id
    JOIN classes c ON ase.class_id = c.id
    JOIN teachers t ON ase.teacher_id = t.id
    JOIN users tu ON t.user_id = tu.id
    WHERE 1=1
  `;
  const params = [];

  if (student_id) { query += ` AND s.id=?`;          params.push(student_id); }
  if (subject_id) { query += ` AND sub.id=?`;         params.push(subject_id); }
  if (class_id)   { query += ` AND c.id=?`;           params.push(class_id); }
  if (date_from)  { query += ` AND ase.date >= ?`;    params.push(date_from); }
  if (date_to)    { query += ` AND ase.date <= ?`;    params.push(date_to); }

  query += ` ORDER BY ase.date DESC LIMIT 500`;

  res.json(db.prepare(query).all(...params));
};

// GET /api/admin/analytics
exports.getAnalytics = (req, res) => {
  const deptStats = db.prepare(`
    SELECT d.name as department, d.code,
           COUNT(DISTINCT s.id) as students,
           ROUND(CAST(SUM(CASE WHEN ar.status='present' THEN 1 ELSE 0 END) AS REAL) /
                 NULLIF(COUNT(ar.id), 0) * 100, 1) as avg_attendance
    FROM departments d
    LEFT JOIN classes c ON c.department_id = d.id
    LEFT JOIN students s ON s.class_id = c.id
    LEFT JOIN attendance_records ar ON ar.student_id = s.id
    GROUP BY d.id
  `).all();

  const atRisk = db.prepare(`
    SELECT u.name, s.roll_no, c.name as class_name, c.section,
           COUNT(ar.id) as total,
           SUM(CASE WHEN ar.status='present' THEN 1 ELSE 0 END) as present,
           ROUND(CAST(SUM(CASE WHEN ar.status='present' THEN 1 ELSE 0 END) AS REAL) /
                 NULLIF(COUNT(ar.id), 0) * 100, 1) as percentage
    FROM attendance_records ar
    JOIN students s ON ar.student_id = s.id
    JOIN users u ON s.user_id = u.id
    JOIN classes c ON s.class_id = c.id
    GROUP BY s.id
    HAVING percentage < 75
    ORDER BY percentage ASC
  `).all();

  const monthlyTrend = db.prepare(`
    SELECT strftime('%Y-%m', ase.date) as month,
           COUNT(ar.id) as total,
           SUM(CASE WHEN ar.status='present' THEN 1 ELSE 0 END) as present,
           ROUND(CAST(SUM(CASE WHEN ar.status='present' THEN 1 ELSE 0 END) AS REAL) /
                 NULLIF(COUNT(ar.id), 0) * 100, 1) as percentage
    FROM attendance_records ar
    JOIN attendance_sessions ase ON ar.session_id = ase.id
    GROUP BY month
    ORDER BY month DESC
    LIMIT 6
  `).all();

  res.json({ dept_stats: deptStats, at_risk: atRisk, monthly_trend: monthlyTrend });
};

// GET /api/admin/subjects
exports.getSubjects = (req, res) => {
  const subjects = db.prepare(`
    SELECT sub.*, d.name as department_name
    FROM subjects sub
    JOIN departments d ON sub.department_id = d.id
    ORDER BY sub.name
  `).all();
  res.json(subjects);
};

// POST /api/admin/subjects
exports.createSubject = (req, res) => {
  const { code, name, department_id, credits } = req.body;
  if (!code || !name || !department_id) return res.status(400).json({ error: 'code, name, department_id required' });

  const existing = db.prepare(`SELECT id FROM subjects WHERE code=?`).get(code);
  if (existing) return res.status(409).json({ error: 'Subject code already exists' });

  const { lastInsertRowid } = db.prepare(`INSERT INTO subjects (code, name, department_id, credits) VALUES (?, ?, ?, ?)`)
    .run(code, name, department_id, credits || 4);

  res.status(201).json({ message: 'Subject created', subject_id: lastInsertRowid });
};

// POST /api/admin/assign-subject — assign teacher to subject+class
exports.assignSubject = (req, res) => {
  const { teacher_id, subject_id, class_id } = req.body;
  if (!teacher_id || !subject_id || !class_id) return res.status(400).json({ error: 'teacher_id, subject_id, class_id required' });

  const existing = db.prepare(`SELECT id FROM teacher_subjects WHERE teacher_id=? AND subject_id=? AND class_id=?`)
    .get(teacher_id, subject_id, class_id);
  if (existing) return res.status(409).json({ error: 'Already assigned' });

  db.prepare(`INSERT INTO teacher_subjects (teacher_id, subject_id, class_id) VALUES (?, ?, ?)`)
    .run(teacher_id, subject_id, class_id);

  res.status(201).json({ message: 'Subject assigned' });
};

// GET /api/admin/classes
exports.getClasses = (req, res) => {
  const classes = db.prepare(`
    SELECT c.*, d.name as department_name,
           COUNT(s.id) as student_count
    FROM classes c
    JOIN departments d ON c.department_id = d.id
    LEFT JOIN students s ON s.class_id = c.id
    GROUP BY c.id
    ORDER BY c.name, c.section
  `).all();
  res.json(classes);
};

// GET /api/admin/departments
exports.getDepartments = (req, res) => {
  res.json(db.prepare(`SELECT * FROM departments ORDER BY name`).all());
};
