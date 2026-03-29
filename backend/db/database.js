'use strict';
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const dbPath = path.resolve(__dirname, 'ams.db');
const db = new DatabaseSync(dbPath);

db.exec(`PRAGMA journal_mode = WAL`);
db.exec(`PRAGMA foreign_keys = ON`);

// ── SCHEMA ────────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    identifier  TEXT    NOT NULL UNIQUE,
    password    TEXT    NOT NULL,
    role        TEXT    NOT NULL CHECK(role IN ('student','teacher','admin')),
    name        TEXT    NOT NULL,
    email       TEXT,
    phone       TEXT,
    created_at  TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS departments (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    name  TEXT NOT NULL UNIQUE,
    code  TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS subjects (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    code          TEXT    NOT NULL UNIQUE,
    name          TEXT    NOT NULL,
    department_id INTEGER NOT NULL REFERENCES departments(id),
    credits       INTEGER DEFAULT 4
  );

  CREATE TABLE IF NOT EXISTS classes (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    section       TEXT NOT NULL,
    department_id INTEGER NOT NULL REFERENCES departments(id),
    UNIQUE(name, section, department_id)
  );

  CREATE TABLE IF NOT EXISTS students (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    roll_no    TEXT    NOT NULL UNIQUE,
    class_id   INTEGER NOT NULL REFERENCES classes(id),
    semester   INTEGER DEFAULT 1,
    address    TEXT
  );

  CREATE TABLE IF NOT EXISTS teachers (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    staff_id      TEXT    NOT NULL UNIQUE,
    department_id INTEGER NOT NULL REFERENCES departments(id),
    designation   TEXT    DEFAULT 'Assistant Professor'
  );

  CREATE TABLE IF NOT EXISTS teacher_subjects (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_id INTEGER NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
    subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    class_id   INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    UNIQUE(teacher_id, subject_id, class_id)
  );

  CREATE TABLE IF NOT EXISTS attendance_sessions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER NOT NULL REFERENCES subjects(id),
    class_id   INTEGER NOT NULL REFERENCES classes(id),
    teacher_id INTEGER NOT NULL REFERENCES teachers(id),
    date       TEXT    NOT NULL,
    created_at TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS attendance_records (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES students(id),
    status     TEXT    NOT NULL CHECK(status IN ('present','absent','late')),
    marked_at  TEXT    DEFAULT (datetime('now')),
    UNIQUE(session_id, student_id)
  );
`);

module.exports = db;
