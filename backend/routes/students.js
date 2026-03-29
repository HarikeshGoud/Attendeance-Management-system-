const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/studentController');

router.use(authenticate, authorize('student'));

router.get('/dashboard',            ctrl.getDashboard);
router.get('/attendance/subjects',  ctrl.getSubjectAttendance);
router.get('/attendance/history',   ctrl.getAttendanceHistory);
router.get('/profile',              ctrl.getProfile);
router.put('/profile',              ctrl.updateProfile);

module.exports = router;
