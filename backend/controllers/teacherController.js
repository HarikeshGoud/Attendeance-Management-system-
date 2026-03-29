const db = require('../db/database');

// GET /api/teacher/dashboard
exports.getDashboard = (req, res) => {
  const teacher = db.prepare(`
    SELECT t.*, d.name as department_name, u.name, u.email
    FROM teachers t
    JOIN departments d ON t.department_id = d.id
    JOIN users u ON t.user_id = u.id
    WHERE t.user_id=?
  `).get(req.user.id);

  if (!teacher) return res.status(404).json({ error: 'Teacher profile not found' });

  const subjects = db.prepare(`
    SELECT sub.id, sub.code, sub.name, c.name as class_name, c.section,
           COUNT(DISTINCT ase.id) as sessions_taken
    FROM teacher_subjects ts
    JOIN subjects sub ON ts.subject_id = sub.id
    JOIN classes c ON ts.class_id = c.id
    LEFT JOIN attendance_sessions ase ON ase.subject_id=sub.id AND ase.teacher_id=?
    WHERE ts.teacher_id=?
    GROUP BY sub.id, c.id
  `).all(teacher.id, teacher.id);

  const totalStudents = db.prepare(`
    SELECT COUNT(DISTINCT s.id) as count
    FROM teacher_subjects ts
    JOIN students s ON s.class_id = ts.class_id
    WHERE ts.teacher_id=?
  `).get(teacher.id);

  const recentSessions = db.prepare(`
    SELECT ase.id, ase.date, sub.name as subject_name, c.name as class_name, c.section,
           COUNT(ar.id) as total,
           SUM(CASE WHEN ar.status='present' THEN 1 ELSE 0 END) as present
    FROM attendance_sessions ase
    JOIN subjects sub ON ase.subject_id = sub.id
    JOIN classes c ON ase.class_id = c.id
    LEFT JOIN attendance_records ar ON ar.session_id = ase.id
    WHERE ase.teacher_id=?
    GROUP BY ase.id
    ORDER BY ase.date DESC
    LIMIT 5
  `).all(teacher.id);

  res.json({ teacher, subjects, total_students: totalStudents.count, recent_sessions: recentSessions });
};

// GET /api/teacher/subjects
exports.getSubjects = (req, res) => {
  const teacher = db.prepare(`SELECT id FROM teachers WHERE user_id=?`).get(req.user.id);
  if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

  const subjects = db.prepare(`
    SELECT ts.id as assignment_id, sub.id as subject_id, sub.code, sub.name, sub.credits,
           c.id as class_id, c.name as class_name, c.section
    FROM teacher_subjects ts
    JOIN subjects sub ON ts.subject_id = sub.id
    JOIN classes c ON ts.class_id = c.id
    WHERE ts.teacher_id=?
    ORDER BY sub.name
  `).all(teacher.id);

  res.json(subjects);
};

// GET /api/teacher/students?class_id=&subject_id=
exports.getStudents = (req, res) => {
  const teacher = db.prepare(`SELECT id FROM teachers WHERE user_id=?`).get(req.user.id);
  if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

  const { class_id, subject_id } = req.query;
  if (!class_id) return res.status(400).json({ error: 'class_id is required' });

  // Verify teacher is assigned to this class
  const assigned = db.prepare(`
    SELECT id FROM teacher_subjects WHERE teacher_id=? AND class_id=?
  `).get(teacher.id, class_id);
  if (!assigned) return res.status(403).json({ error: 'Not assigned to this class' });

  const students = db.prepare(`
    SELECT s.id, s.roll_no, u.name, u.email,
           COALESCE(att.total, 0) as total_classes,
           COALESCE(att.present, 0) as present,
           CASE WHEN COALESCE(att.total, 0) > 0
                THEN ROUND(CAST(att.present AS REAL) / att.total * 100, 1)
                ELSE 0 END as percentage
    FROM students s
    JOIN users u ON s.user_id = u.id
    LEFT JOIN (
      SELECT ar.student_id,
             COUNT(*) as total,
             SUM(CASE WHEN ar.status='present' THEN 1 ELSE 0 END) as present
      FROM attendance_records ar
      JOIN attendance_sessions ase ON ar.session_id = ase.id
      WHERE ase.subject_id=? AND ase.class_id=?
      GROUP BY ar.student_id
    ) att ON att.student_id = s.id
    WHERE s.class_id=?
    ORDER BY s.roll_no
  `).all(subject_id || 0, class_id, class_id);

  res.json(students);
};

// POST /api/teacher/attendance/session — create session and mark attendance
exports.createSession = (req, res) => {
  const teacher = db.prepare(`SELECT id FROM teachers WHERE user_id=?`).get(req.user.id);
  if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

  const { subject_id, class_id, date, records } = req.body;
  // records: [{ student_id, status }]

  if (!subject_id || !class_id || !date || !Array.isArray(records)) {
    return res.status(400).json({ error: 'subject_id, class_id, date, records[] required' });
  }

  // Verify assignment
  const assigned = db.prepare(`
    SELECT id FROM teacher_subjects WHERE teacher_id=? AND subject_id=? AND class_id=?
  `).get(teacher.id, subject_id, class_id);
  if (!assigned) return res.status(403).json({ error: 'Not assigned to this subject/class' });

  // Check duplicate session
  const existing = db.prepare(`
    SELECT id FROM attendance_sessions WHERE subject_id=? AND class_id=? AND teacher_id=? AND date=?
  `).get(subject_id, class_id, teacher.id, date);
  if (existing) return res.status(409).json({ error: 'Session already exists for this date', session_id: existing.id });

  const insertSession = db.prepare(`
    INSERT INTO attendance_sessions (subject_id, class_id, teacher_id, date) VALUES (?, ?, ?, ?)
  `);
  const insertRecord = db.prepare(`
    INSERT INTO attendance_records (session_id, student_id, status) VALUES (?, ?, ?)
  `);

  let sessionId;
  db.exec('BEGIN TRANSACTION');
  try {
    const { lastInsertRowid } = insertSession.run(subject_id, class_id, teacher.id, date);
    sessionId = lastInsertRowid;
    records.forEach(r => insertRecord.run(sessionId, r.student_id, r.status || 'absent'));
    db.exec('COMMIT TRANSACTION');
  } catch (e) {
    db.exec('ROLLBACK TRANSACTION');
    throw e;
  }
  res.status(201).json({ message: 'Attendance saved', session_id: sessionId });
};

// PUT /api/teacher/attendance/session/:sessionId — edit existing session
exports.updateSession = (req, res) => {
  const teacher = db.prepare(`SELECT id FROM teachers WHERE user_id=?`).get(req.user.id);
  if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

  const { sessionId } = req.params;
  const { records } = req.body;

  const session = db.prepare(`SELECT * FROM attendance_sessions WHERE id=? AND teacher_id=?`).get(sessionId, teacher.id);
  if (!session) return res.status(404).json({ error: 'Session not found or not yours' });

  const upsert = db.prepare(`
    INSERT INTO attendance_records (session_id, student_id, status)
    VALUES (?, ?, ?)
    ON CONFLICT(session_id, student_id) DO UPDATE SET status=excluded.status, marked_at=datetime('now')
  `);

  db.exec('BEGIN TRANSACTION');
  try {
    records.forEach(r => upsert.run(sessionId, r.student_id, r.status));
    db.exec('COMMIT TRANSACTION');
  } catch (e) {
    db.exec('ROLLBACK TRANSACTION');
    throw e;
  }
  res.json({ message: 'Attendance updated' });
};

// GET /api/teacher/attendance/sessions?subject_id=&class_id=
exports.getSessions = (req, res) => {
  const teacher = db.prepare(`SELECT id FROM teachers WHERE user_id=?`).get(req.user.id);
  if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

  const { subject_id, class_id } = req.query;
  let query = `
    SELECT ase.id, ase.date, sub.name as subject_name, sub.code, c.name as class_name, c.section,
           COUNT(ar.id) as total,
           SUM(CASE WHEN ar.status='present' THEN 1 ELSE 0 END) as present
    FROM attendance_sessions ase
    JOIN subjects sub ON ase.subject_id = sub.id
    JOIN classes c ON ase.class_id = c.id
    LEFT JOIN attendance_records ar ON ar.session_id = ase.id
    WHERE ase.teacher_id=?
  `;
  const params = [teacher.id];

  if (subject_id) { query += ` AND ase.subject_id=?`; params.push(subject_id); }
  if (class_id)   { query += ` AND ase.class_id=?`;   params.push(class_id); }

  query += ` GROUP BY ase.id ORDER BY ase.date DESC`;

  res.json(db.prepare(query).all(...params));
};

// GET /api/teacher/analytics
exports.getAnalytics = (req, res) => {
  const teacher = db.prepare(`SELECT id FROM teachers WHERE user_id=?`).get(req.user.id);
  if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

  const subjectStats = db.prepare(`
    SELECT sub.id, sub.code, sub.name, c.section,
           COUNT(DISTINCT ase.id) as sessions,
           COUNT(ar.id) as total_records,
           SUM(CASE WHEN ar.status='present' THEN 1 ELSE 0 END) as total_present,
           ROUND(CAST(SUM(CASE WHEN ar.status='present' THEN 1 ELSE 0 END) AS REAL) /
                 NULLIF(COUNT(ar.id), 0) * 100, 1) as avg_attendance
    FROM teacher_subjects ts
    JOIN subjects sub ON ts.subject_id = sub.id
    JOIN classes c ON ts.class_id = c.id
    LEFT JOIN attendance_sessions ase ON ase.subject_id=sub.id AND ase.class_id=c.id AND ase.teacher_id=?
    LEFT JOIN attendance_records ar ON ar.session_id = ase.id
    WHERE ts.teacher_id=?
    GROUP BY sub.id, c.id
  `).all(teacher.id, teacher.id);

  const atRisk = db.prepare(`
    SELECT u.name, s.roll_no,
           COUNT(ar.id) as total,
           SUM(CASE WHEN ar.status='present' THEN 1 ELSE 0 END) as present,
           ROUND(CAST(SUM(CASE WHEN ar.status='present' THEN 1 ELSE 0 END) AS REAL) /
                 NULLIF(COUNT(ar.id), 0) * 100, 1) as percentage
    FROM attendance_records ar
    JOIN attendance_sessions ase ON ar.session_id = ase.id
    JOIN students s ON ar.student_id = s.id
    JOIN users u ON s.user_id = u.id
    WHERE ase.teacher_id=?
    GROUP BY s.id
    HAVING percentage < 75
    ORDER BY percentage ASC
  `).all(teacher.id);

  res.json({ subject_stats: subjectStats, at_risk_students: atRisk });
};
