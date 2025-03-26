// Scheduling Routes - routes for clinical scheduling and student assignments
const express = require('express');
const router = express.Router();
const SchedulingController = require('../controllers/schedulingController');
const { authMiddleware } = require('../middleware/auth');
const { roleMiddleware } = require('../middleware/roles');

// Clinical slots routes
router.get('/slots', authMiddleware, SchedulingController.getAvailableSlots);
router.get('/slots/:id', authMiddleware, SchedulingController.getSlotById);
router.post('/slots/add', authMiddleware, roleMiddleware(['admin', 'instructor']), SchedulingController.createSlot);
router.put('/slots/:id', authMiddleware, roleMiddleware(['admin', 'instructor']), SchedulingController.updateSlot);
router.delete('/slots/:id', authMiddleware, roleMiddleware(['admin']), SchedulingController.deleteSlot);

// Slot assignments routes
router.get('/slots/:id/assignments', authMiddleware, SchedulingController.getSlotAssignments);

// Student preference routes
router.get('/preferences', authMiddleware, SchedulingController.getStudentPreferences);
router.get('/preferences/student/:studentId', authMiddleware, roleMiddleware(['admin', 'instructor']), SchedulingController.getStudentPreferences);
router.post('/preferences/set', authMiddleware, SchedulingController.setStudentPreference);
router.post('/preferences/delete', authMiddleware, SchedulingController.deleteStudentPreference);

// Assignment routes
router.get('/assignments', authMiddleware, SchedulingController.getStudentAssignments);
router.get('/assignments/student/:studentId', authMiddleware, roleMiddleware(['admin', 'instructor']), SchedulingController.getStudentAssignments);
router.post('/assign', authMiddleware, roleMiddleware(['admin', 'instructor']), SchedulingController.assignStudentToSlot);
router.post('/unassign', authMiddleware, roleMiddleware(['admin', 'instructor']), SchedulingController.removeAssignment);
router.post('/auto-assign', authMiddleware, roleMiddleware(['admin', 'instructor']), SchedulingController.autoAssignStudents);

module.exports = router;
