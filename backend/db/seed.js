'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const db = require('./database');

console.log('🌱 Seeding database...');
const hash = (pwd) => bcrypt.hashSync(pwd, 10);

// ── Departments ───────────────────────────────────────────────────────────────
const deptStmt = db.prepare(`INSERT OR IGNORE INTO departments (name, code) VALUES (?, ?)`);
deptStmt.run('Computer Science & Engineering', 'CSE');
deptStmt.run('Mechanical Engineering', 'ME');
deptStmt.run('Business Studies', 'BS');
deptStmt.run('Electronics & Communication', 'ECE');

const cseId = db.prepare(`SELECT id FROM departments WHERE code='CSE'`).get().id;
const meId  = db.prepare(`SELECT id FROM departments WHERE code='ME'`).get().id;

// ── Classes ───────────────────────────────────────────────────────────────────
const classStmt = db.prepare(`INSERT OR IGNORE INTO classes (name, section, department_id) VALUES (?, ?, ?)`);
classStmt.run('B.Tech CSE', 'A', cseId);
classStmt.run('B.Tech CSE', 'B', cseId);
classStmt.run('B.Tech CSE', 'C', cseId);
classStmt.run('B.Tech ME',  'A', meId);

const classA = db.prepare(`SELECT id FROM classes WHERE name='B.Tech CSE' AND section='A'`).get().id;
const classB = db.prepare(`SELECT id FROM classes WHERE name='B.Tech CSE' AND section='B'`).get().id;

// ── Subjects ──────────────────────────────────────────────────────────────────
const subStmt = db.prepare(`INSERT OR IGNORE INTO subjects (code, name, department_id, credits) VALUES (?, ?, ?, ?)`);
subStmt.run('CSE-401', 'Data Structures & Algorithms', cseId, 4);
subStmt.run('CSE-402', 'Operating Systems',            cseId, 4);
subStmt.run('CSE-403', 'Compiler Design',              cseId, 4);
subStmt.run('CSE-404', 'DBMS Architecture',            cseId, 4);
subStmt.run('MAT-202', 'Mathematics IV',               cseId, 3);
subStmt.run('CSE-405', 'Computer Networks',            cseId, 4);

const subDSA  = db.prepare(`SELECT id FROM subjects WHERE code='CSE-401'`).get().id;
const subOS   = db.prepare(`SELECT id FROM subjects WHERE code='CSE-402'`).get().id;
const subCD   = db.prepare(`SELECT id FROM subjects WHERE code='CSE-403'`).get().id;
const subDBMS = db.prepare(`SELECT id FROM subjects WHERE code='CSE-404'`).get().id;
const subMAT  = db.prepare(`SELECT id FROM subjects WHERE code='MAT-202'`).get().id;
const subCN   = db.prepare(`SELECT id FROM subjects WHERE code='CSE-405'`).get().id;

// ── Admin Users ───────────────────────────────────────────────────────────────
const userStmt = db.prepare(`INSERT OR IGNORE INTO users (identifier, password, role, name, email) VALUES (?, ?, ?, ?, ?)`);
userStmt.run('admin@ams.edu',       hash('Admin@123'),   'admin', 'Super Admin',      'admin@ams.edu');
userStmt.run('principal@ams.edu',   hash('Principal@1'), 'admin', 'Dr. V.K. Sharma',  'principal@ams.edu');
userStmt.run('hod.cse@ams.edu',     hash('Hod@cse1'),    'admin', 'Prof. A. Nair',    'hod.cse@ams.edu');

// ── Teacher Users ─────────────────────────────────────────────────────────────
userStmt.run('FAC-001', hash('Rajesh@123'), 'teacher', 'Dr. Rajesh Kumar',   'rajesh@ams.edu');
userStmt.run('FAC-002', hash('Sarah@123'),  'teacher', 'Prof. Sarah Smith',  'sarah@ams.edu');
userStmt.run('FAC-003', hash('Pradeep@1'),  'teacher', 'Dr. Pradeep Verma',  'pradeep@ams.edu');
userStmt.run('FAC-004', hash('Meena@123'),  'teacher', 'Prof. Meena Iyer',   'meena@ams.edu');

const tUid1 = db.prepare(`SELECT id FROM users WHERE identifier='FAC-001'`).get().id;
const tUid2 = db.prepare(`SELECT id FROM users WHERE identifier='FAC-002'`).get().id;
const tUid3 = db.prepare(`SELECT id FROM users WHERE identifier='FAC-003'`).get().id;
const tUid4 = db.prepare(`SELECT id FROM users WHERE identifier='FAC-004'`).get().id;

const teacherStmt = db.prepare(`INSERT OR IGNORE INTO teachers (user_id, staff_id, department_id, designation) VALUES (?, ?, ?, ?)`);
teacherStmt.run(tUid1, 'FAC-001', cseId, 'Senior Professor');
teacherStmt.run(tUid2, 'FAC-002', cseId, 'Assistant Professor');
teacherStmt.run(tUid3, 'FAC-003', cseId, 'Associate Professor');
teacherStmt.run(tUid4, 'FAC-004', cseId, 'Assistant Professor');

const teacher1 = db.prepare(`SELECT id FROM teachers WHERE staff_id='FAC-001'`).get().id;
const teacher2 = db.prepare(`SELECT id FROM teachers WHERE staff_id='FAC-002'`).get().id;
const teacher3 = db.prepare(`SELECT id FROM teachers WHERE staff_id='FAC-003'`).get().id;
const teacher4 = db.prepare(`SELECT id FROM teachers WHERE staff_id='FAC-004'`).get().id;

// ── Teacher-Subject Assignments ───────────────────────────────────────────────
const assignStmt = db.prepare(`INSERT OR IGNORE INTO teacher_subjects (teacher_id, subject_id, class_id) VALUES (?, ?, ?)`);
assignStmt.run(teacher1, subDSA,  classA);
assignStmt.run(teacher1, subDSA,  classB);
assignStmt.run(teacher1, subCD,   classA);
assignStmt.run(teacher2, subOS,   classA);
assignStmt.run(teacher2, subDBMS, classA);
assignStmt.run(teacher3, subMAT,  classA);
assignStmt.run(teacher3, subCN,   classA);
assignStmt.run(teacher4, subCN,   classB);

// ── 20 Students ───────────────────────────────────────────────────────────────
const studentData = [
  ['2024-CSE-001', 'Rahul Sharma',      'rahul@student.ams.edu',    classA],
  ['2024-CSE-002', 'Priya Patel',       'priya@student.ams.edu',    classA],
  ['2024-CSE-003', 'Alex Johnson',      'alex@student.ams.edu',     classA],
  ['2024-CSE-004', 'Maria Smith',       'maria@student.ams.edu',    classA],
  ['2024-CSE-005', 'Blake Wilson',      'blake@student.ams.edu',    classA],
  ['2024-CSE-006', 'Ananya Gupta',      'ananya@student.ams.edu',   classA],
  ['2024-CSE-007', 'Rohan Mehta',       'rohan@student.ams.edu',    classA],
  ['2024-CSE-008', 'Sneha Reddy',       'sneha@student.ams.edu',    classA],
  ['2024-CSE-009', 'Karan Singh',       'karan@student.ams.edu',    classA],
  ['2024-CSE-010', 'Divya Nair',        'divya@student.ams.edu',    classA],
  ['2024-CSE-011', 'Arjun Kapoor',      'arjun@student.ams.edu',    classA],
  ['2024-CSE-012', 'Pooja Mishra',      'pooja@student.ams.edu',    classA],
  ['2024-CSE-013', 'Vikram Rao',        'vikram@student.ams.edu',   classA],
  ['2024-CSE-014', 'Neha Joshi',        'neha@student.ams.edu',     classA],
  ['2024-CSE-015', 'Siddharth Bose',    'siddharth@student.ams.edu',classA],
  ['2024-CSE-016', 'Kavya Menon',       'kavya@student.ams.edu',    classA],
  ['2024-CSE-017', 'Aditya Tiwari',     'aditya@student.ams.edu',   classA],
  ['2024-CSE-018', 'Riya Desai',        'riya@student.ams.edu',     classA],
  ['2024-CSE-019', 'Harsh Pandey',      'harsh@student.ams.edu',    classA],
  ['2024-CSE-020', 'Tanvi Kulkarni',    'tanvi@student.ams.edu',    classA],
];

const insertStudent = db.prepare(`INSERT OR IGNORE INTO students (user_id, roll_no, class_id, semester) VALUES (?, ?, ?, ?)`);
studentData.forEach(([roll, name, email, cls]) => {
  userStmt.run(roll, hash('Student@123'), 'student', name, email);
  const uid = db.prepare(`SELECT id FROM users WHERE identifier=?`).get(roll).id;
  insertStudent.run(uid, roll, cls, 4);
});

// ── Attendance Sessions & Records ─────────────────────────────────────────────
const allStudents = db.prepare(`SELECT id FROM students WHERE class_id=?`).all(classA);
const subjectList = [subDSA, subOS, subCD, subDBMS, subMAT, subCN];
const teacherMap  = {
  [subDSA]: teacher1, [subCD]: teacher1,
  [subOS]: teacher2,  [subDBMS]: teacher2,
  [subMAT]: teacher3, [subCN]: teacher3
};

// Realistic attendance patterns — 20 students × 20 sessions
// 5 at-risk students (below 75%), rest have varied realistic %
const patterns = [
  [1,1,0,1,1,1,0,1,1,1,1,1,1,0,1,1,1,1,1,1], // Rahul       85% — good
  [1,1,1,1,0,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1], // Priya       85% — good
  [1,0,1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,1,0,1], // Alex        80% — good
  [1,1,1,0,1,1,1,1,1,1,0,1,1,1,1,1,0,1,1,1], // Maria       85% — good
  [0,0,1,0,1,0,1,0,0,1,0,1,0,1,0,0,1,0,1,0], // Blake       35% ⚠ AT-RISK
  [1,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1,1,1,1,0], // Ananya      85% — good
  [1,1,1,1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1], // Rohan       85% — good
  [1,0,1,1,1,1,1,1,0,1,1,1,1,0,1,1,1,1,1,1], // Sneha       85% — good
  [0,1,0,0,1,0,1,0,1,0,1,0,0,1,0,1,0,1,0,1], // Karan       40% ⚠ AT-RISK
  [1,1,1,1,1,1,0,1,1,1,1,1,1,0,1,1,1,0,1,1], // Divya       85% — good
  [0,0,0,1,0,1,0,1,0,0,1,0,1,0,1,0,0,1,0,1], // Arjun       35% ⚠ AT-RISK
  [1,1,1,0,1,1,1,1,1,1,1,0,1,1,1,1,1,1,0,1], // Pooja       85% — good
  [1,1,0,1,1,1,0,1,1,1,1,1,1,1,0,1,1,1,1,0], // Vikram      80% — good
  [1,1,1,1,1,0,1,1,1,0,1,1,1,1,1,1,1,0,1,1], // Neha        85% — good
  [0,1,0,1,0,0,1,0,1,0,1,0,1,0,0,1,0,1,0,1], // Siddharth   40% ⚠ AT-RISK
  [1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1,1,0,1,1], // Kavya       85% — good
  [0,0,1,0,1,0,0,1,0,1,0,0,1,0,1,0,1,0,0,1], // Aditya      35% ⚠ AT-RISK
  [1,1,1,1,1,1,1,0,1,1,1,1,0,1,1,1,1,1,0,1], // Riya        85% — good
  [1,0,1,1,1,1,0,1,1,1,0,1,1,1,1,1,1,0,1,1], // Harsh       80% — good
  [1,1,1,0,1,1,1,1,0,1,1,1,1,1,0,1,1,1,1,1], // Tanvi       85% — good
];

const insertSession = db.prepare(`INSERT OR IGNORE INTO attendance_sessions (subject_id, class_id, teacher_id, date) VALUES (?, ?, ?, ?)`);
const insertRecord  = db.prepare(`INSERT OR IGNORE INTO attendance_records (session_id, student_id, status) VALUES (?, ?, ?)`);

db.exec('BEGIN');
subjectList.forEach(subId => {
  for (let i = 0; i < 20; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (20 - i));
    if (d.getDay() === 0) continue;
    const dateStr = d.toISOString().split('T')[0];
    const { lastInsertRowid: sessionId } = insertSession.run(subId, classA, teacherMap[subId], dateStr);
    if (!sessionId) continue;
    allStudents.forEach((stu, idx) => {
      const present = patterns[idx]?.[i] ?? 1;
      insertRecord.run(sessionId, stu.id, present ? 'present' : 'absent');
    });
  }
});
db.exec('COMMIT');

console.log('✅ Database seeded successfully!\n');
console.log('📋 LOGIN CREDENTIALS\n');
console.log('👑 ADMIN');
console.log('  admin@ams.edu       / Admin@123');
console.log('  principal@ams.edu   / Principal@1');
console.log('  hod.cse@ams.edu     / Hod@cse1\n');
console.log('👨‍🏫 TEACHER');
console.log('  FAC-001  / Rajesh@123   (Dr. Rajesh Kumar)');
console.log('  FAC-002  / Sarah@123    (Prof. Sarah Smith)');
console.log('  FAC-003  / Pradeep@1    (Dr. Pradeep Verma)');
console.log('  FAC-004  / Meena@123    (Prof. Meena Iyer)\n');
console.log('👨‍🎓 STUDENT (all use password: Student@123)');
console.log('  2024-CSE-001 to 2024-CSE-020');
