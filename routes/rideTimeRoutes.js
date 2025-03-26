// Ride Time Routes - routes for student ride time with ambulance services
const express = require('express');
const router = express.Router();
const RideTimeController = require('../controllers/rideTimeController');
const { authMiddleware } = require('../middleware/auth');
const { roleMiddleware } = require('../middleware/roles');

// Ambulance service routes
router.get('/services', authMiddleware, RideTimeController.getActiveServices);
router.get('/services/all', authMiddleware, roleMiddleware(['admin', 'instructor']), RideTimeController.getAllServices);
router.get('/services/:id', authMiddleware, RideTimeController.getServiceById);
router.post('/services/add', authMiddleware, roleMiddleware(['admin']), RideTimeController.addService);
router.put('/services/:id', authMiddleware, roleMiddleware(['admin']), RideTimeController.updateService);
router.put('/services/:id/toggle', authMiddleware, roleMiddleware(['admin']), RideTimeController.toggleServiceStatus);

// Ride time log routes
router.get('/logs', authMiddleware, RideTimeController.getStudentRideLogs);
router.get('/logs/student/:studentId', authMiddleware, roleMiddleware(['admin', 'instructor']), RideTimeController.getStudentRideLogs);
router.get('/logs/:id', authMiddleware, RideTimeController.getRideLogById);
router.post('/logs/add', authMiddleware, RideTimeController.addRideLog);
router.put('/logs/:id', authMiddleware, RideTimeController.updateRideLog);
router.delete('/logs/:id', authMiddleware, RideTimeController.deleteRideLog);

// Ride time summary routes
router.get('/summary', authMiddleware, RideTimeController.getStudentRideSummary);
router.get('/summary/student/:studentId', authMiddleware, roleMiddleware(['admin', 'instructor']), RideTimeController.getStudentRideSummary);

module.exports = router;
