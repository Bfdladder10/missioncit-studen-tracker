// Class Routes - routes for cohorts/classes of students
const express = require('express');
const router = express.Router();
const ClassController = require('../controllers/classController');
const { authMiddleware } = require('../middleware/auth');
const { roleMiddleware } = require('../middleware/roles');

// Class routes
router.get('/', authMiddleware, ClassController.getActiveClasses);
router.get('/all', authMiddleware, roleMiddleware(['admin']), ClassController.getAllClasses);
router.get('/:id', authMiddleware, ClassController.getClassById);
router.post('/add', authMiddleware, roleMiddleware(['admin']), ClassController.addClass);
router.put('/:id', authMiddleware, roleMiddleware(['admin']), ClassController.updateClass);
router.patch('/:id/toggle-status', authMiddleware, roleMiddleware(['admin']), ClassController.toggleClassStatus);

// Student enrollment routes
router.get('/:id/students', authMiddleware, ClassController.getStudentsInClass);
router.post('/enroll', authMiddleware, roleMiddleware(['admin', 'instructor']), ClassController.addStudentsToClass);
router.post('/unenroll', authMiddleware, roleMiddleware(['admin', 'instructor']), ClassController.removeStudentFromClass);
router.get('/student/:studentId', authMiddleware, roleMiddleware(['admin', 'instructor']), ClassController.getStudentClasses);
router.get('/student', authMiddleware, ClassController.getStudentClasses);

module.exports = router;
