// AMS API Client — shared across all pages
const API_BASE = 'http://localhost:3000/api';

const AMS = {
  // ── Token helpers ──────────────────────────────────────────────────────────
  getToken() { return localStorage.getItem('ams_token'); },
  getUser()  { return JSON.parse(localStorage.getItem('ams_user') || 'null'); },
  setSession(token, user) {
    localStorage.setItem('ams_token', token);
    localStorage.setItem('ams_user', JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem('ams_token');
    localStorage.removeItem('ams_user');
  },
  isLoggedIn() { return !!this.getToken(); },

  // ── Guard: redirect to login if not authenticated ─────────────────────────
  requireAuth(role) {
    const user = this.getUser();
    if (!user || !this.getToken()) {
      window.location.href = 'LOGIN.html';
      return false;
    }
    if (role && user.role !== role) {
      window.location.href = 'LOGIN.html';
      return false;
    }
    return true;
  },

  // ── Core fetch wrapper ────────────────────────────────────────────────────
  async request(method, path, body) {
    const headers = { 'Content-Type': 'application/json' };
    const token = this.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(API_BASE + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });

    if (res.status === 401) {
      this.clearSession();
      window.location.href = 'LOGIN.html';
      return;
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  },

  get(path)         { return this.request('GET', path); },
  post(path, body)  { return this.request('POST', path, body); },
  put(path, body)   { return this.request('PUT', path, body); },
  del(path)         { return this.request('DELETE', path); },

  // ── Auth ──────────────────────────────────────────────────────────────────
  async login(identifier, password, role) {
    const data = await this.post('/auth/login', { identifier, password, role });
    this.setSession(data.token, data.user);
    return data;
  },
  logout() {
    this.clearSession();
    window.location.href = 'LOGIN.html';
  },

  // ── Student ───────────────────────────────────────────────────────────────
  studentDashboard()          { return this.get('/student/dashboard'); },
  studentSubjects()           { return this.get('/student/attendance/subjects'); },
  studentHistory(params = '') { return this.get('/student/attendance/history' + params); },
  studentProfile()            { return this.get('/student/profile'); },
  updateStudentProfile(body)  { return this.put('/student/profile', body); },

  // ── Teacher ───────────────────────────────────────────────────────────────
  teacherDashboard()                    { return this.get('/teacher/dashboard'); },
  teacherSubjects()                     { return this.get('/teacher/subjects'); },
  teacherStudents(classId, subjectId)   { return this.get(`/teacher/students?class_id=${classId}&subject_id=${subjectId}`); },
  teacherSessions(params = '')          { return this.get('/teacher/attendance/sessions' + params); },
  submitAttendance(body)                { return this.post('/teacher/attendance/session', body); },
  updateAttendance(sessionId, body)     { return this.put(`/teacher/attendance/session/${sessionId}`, body); },
  teacherAnalytics()                    { return this.get('/teacher/analytics'); },

  // ── Admin ─────────────────────────────────────────────────────────────────
  adminDashboard()            { return this.get('/admin/dashboard'); },
  adminUsers(params = '')     { return this.get('/admin/users' + params); },
  createUser(body)            { return this.post('/admin/users', body); },
  updateUser(id, body)        { return this.put(`/admin/users/${id}`, body); },
  deleteUser(id)              { return this.del(`/admin/users/${id}`); },
  adminReport(params = '')    { return this.get('/admin/attendance/report' + params); },
  adminAnalytics()            { return this.get('/admin/analytics'); },
  adminSubjects()             { return this.get('/admin/subjects'); },
  adminClasses()              { return this.get('/admin/classes'); },
  adminDepartments()          { return this.get('/admin/departments'); },
};
