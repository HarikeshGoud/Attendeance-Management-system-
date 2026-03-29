const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/teacherController');

router.use(authenticate, authorize('teacher'));

router.get('/dashboard',                    ctrl.getDashboard);
router.get('/subjects',                     ctrl.getSubjects);
router.get('/students',                     ctrl.getStudents);
router.get('/attendance/sessions',          ctrl.getSessions);
router.post('/attendance/session',          ctrl.createSession);
router.put('/attendance/session/:sessionId', ctrl.updateSession);
router.get('/analytics',                    ctrl.getAnalytics);

module.exports = router;
