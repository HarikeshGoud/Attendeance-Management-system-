const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');

exports.login = (req, res) => {
  const { identifier, password, role } = req.body;

  if (!identifier || !password || !role) {
    return res.status(400).json({ error: 'identifier, password and role are required' });
  }

  const user = db.prepare(`SELECT * FROM users WHERE identifier=? AND role=?`).get(identifier, role);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

  // Fetch role-specific profile id
  let profileId = null;
  if (role === 'student') {
    const s = db.prepare(`SELECT id, roll_no, class_id, semester FROM students WHERE user_id=?`).get(user.id);
    profileId = s;
  } else if (role === 'teacher') {
    const t = db.prepare(`SELECT id, staff_id, department_id, designation FROM teachers WHERE user_id=?`).get(user.id);
    profileId = t;
  }

  const payload = { id: user.id, role: user.role, name: user.name };
  if (profileId) payload.profile = profileId;

  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN });

  res.json({
    token,
    user: { id: user.id, name: user.name, role: user.role, email: user.email, profile: profileId }
  });
};

exports.changePassword = (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'currentPassword and newPassword required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const user = db.prepare(`SELECT * FROM users WHERE id=?`).get(req.user.id);
  if (!bcrypt.compareSync(currentPassword, user.password)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const hashed = bcrypt.hashSync(newPassword, 10);
  db.prepare(`UPDATE users SET password=? WHERE id=?`).run(hashed, req.user.id);
  res.json({ message: 'Password updated successfully' });
};

exports.me = (req, res) => {
  const user = db.prepare(`SELECT id, identifier, role, name, email, phone, created_at FROM users WHERE id=?`).get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  let profile = null;
  if (user.role === 'student') {
    profile = db.prepare(`
      SELECT s.*, c.name as class_name, c.section, d.name as department
      FROM students s
      JOIN classes c ON s.class_id = c.id
      JOIN departments d ON c.department_id = d.id
      WHERE s.user_id=?
    `).get(user.id);
  } else if (user.role === 'teacher') {
    profile = db.prepare(`
      SELECT t.*, d.name as department_name
      FROM teachers t
      JOIN departments d ON t.department_id = d.id
      WHERE t.user_id=?
    `).get(user.id);
  }

  res.json({ ...user, profile });
};
