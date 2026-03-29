const db = require('../db/database');

// GET /api/student/dashboard
exports.getDashboard = (req, res) => {
  const student = db.prepare(`
    SELECT s.*, c.name as class_name, c.section, d.name as department, u.name, u.email
    FROM students s
    JOIN classes c ON s.class_id = c.id
    JOIN departments d ON c.department_id = d.id
    JOIN users u ON s.user_id = u.id
    WHERE s.user_id=?
  `).get(req.user.id);

  if (!student) return res.status(404).json({ error: 'Student profile not found' });

  // Overall attendance
  const overall = db.prepare(`
    SELECT
      COUNT(*) as total_classes,
      SUM(CASE WHEN ar.status='present' THEN 1 ELSE 0 END) as present,
      SUM(CASE WHEN ar.status='absent'  THEN 1 ELSE 0 END) as absent
    FROM attendance_records ar
    JOIN attendance_sessions ase ON ar.session_id = ase.id
    WHERE ar.student_id=?
  `).get(student.id);

  const percentage = overall.total_classes > 0
    ? ((overall.present / overall.total_classes) * 100).toFixed(1)
    : 0;

  // Safe to bunk (maintain 75%)
  const safeBunk = Math.max(0, Math.floor((overall.present / 0.75) - overall.total_classes));

  res.json({
    student,
    attendance: {
      total_classes: overall.total_classes,
      present: overall.present,
      absent: overall.absent,
      percentage: parseFloat(percentage),
      safe_to_bunk: safeBunk
    }
  });
};

// GET /api/student/attendance/subjects
exports.getSubjectAttendance = (req, res) => {
  const student = db.prepare(`SELECT id FROM students WHERE user_id=?`).get(req.user.id);
  if (!student) return res.status(404).json({ error: 'Student not found' });

  const subjects = db.prepare(`
    SELECT
      sub.id, sub.code, sub.name,
      COUNT(ar.id) as total_classes,
      SUM(CASE WHEN ar.status='present' THEN 1 ELSE 0 END) as present,
      SUM(CASE WHEN ar.status='absent'  THEN 1 ELSE 0 END) as absent
    FROM attendance_records ar
    JOIN attendance_sessions ase ON ar.session_id = ase.id
    JOIN subjects sub ON ase.subject_id = sub.id
    WHERE ar.student_id=?
    GROUP BY sub.id
    ORDER BY sub.name
  `).all(student.id);

  const result = subjects.map(s => ({
    ...s,
    percentage: s.total_classes > 0 ? parseFloat(((s.present / s.total_classes) * 100).toFixed(1)) : 0,
    status: s.total_classes > 0 && (s.present / s.total_classes) * 100 < 75 ? 'at-risk' : 'safe'
  }));

  res.json(result);
};

// GET /api/student/attendance/history?subject_id=&limit=30
exports.getAttendanceHistory = (req, res) => {
  const student = db.prepare(`SELECT id FROM students WHERE user_id=?`).get(req.user.id);
  if (!student) return res.status(404).json({ error: 'Student not found' });

  const { subject_id, limit = 30 } = req.query;
  let query = `
    SELECT
      ar.status, ar.marked_at,
      ase.date,
      sub.name as subject_name, sub.code as subject_code,
      u.name as teacher_name
    FROM attendance_records ar
    JOIN attendance_sessions ase ON ar.session_id = ase.id
    JOIN subjects sub ON ase.subject_id = sub.id
    JOIN teachers t ON ase.teacher_id = t.id
    JOIN users u ON t.user_id = u.id
    WHERE ar.student_id=?
  `;
  const params = [student.id];

  if (subject_id) {
    query += ` AND ase.subject_id=?`;
    params.push(subject_id);
  }

  query += ` ORDER BY ase.date DESC LIMIT ?`;
  params.push(parseInt(limit));

  const records = db.prepare(query).all(...params);
  res.json(records);
};

// GET /api/student/profile
exports.getProfile = (req, res) => {
  const data = db.prepare(`
    SELECT s.*, c.name as class_name, c.section, d.name as department,
           u.name, u.email, u.phone, u.identifier as roll_no_login
    FROM students s
    JOIN classes c ON s.class_id = c.id
    JOIN departments d ON c.department_id = d.id
    JOIN users u ON s.user_id = u.id
    WHERE s.user_id=?
  `).get(req.user.id);

  if (!data) return res.status(404).json({ error: 'Profile not found' });

  const subjects = db.prepare(`
    SELECT sub.code, sub.name, sub.credits
    FROM teacher_subjects ts
    JOIN subjects sub ON ts.subject_id = sub.id
    WHERE ts.class_id=?
    GROUP BY sub.id
  `).all(data.class_id);

  res.json({ ...data, subjects });
};

// PUT /api/student/profile
exports.updateProfile = (req, res) => {
  const { email, phone, address } = req.body;
  const student = db.prepare(`SELECT id FROM students WHERE user_id=?`).get(req.user.id);
  if (!student) return res.status(404).json({ error: 'Student not found' });

  if (email) db.prepare(`UPDATE users SET email=? WHERE id=?`).run(email, req.user.id);
  if (phone) db.prepare(`UPDATE users SET phone=? WHERE id=?`).run(phone, req.user.id);
  if (address) db.prepare(`UPDATE students SET address=? WHERE user_id=?`).run(address, req.user.id);

  res.json({ message: 'Profile updated' });
};
