const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/adminController');

router.use(authenticate, authorize('admin'));

router.get('/dashboard',            ctrl.getDashboard);
router.get('/users',                ctrl.getUsers);
router.post('/users',               ctrl.createUser);
router.put('/users/:id',            ctrl.updateUser);
router.delete('/users/:id',         ctrl.deleteUser);
router.get('/attendance/report',    ctrl.getAttendanceReport);
router.get('/analytics',            ctrl.getAnalytics);
router.get('/subjects',             ctrl.getSubjects);
router.post('/subjects',            ctrl.createSubject);
router.post('/assign-subject',      ctrl.assignSubject);
router.get('/classes',              ctrl.getClasses);
router.get('/departments',          ctrl.getDepartments);

module.exports = router;
