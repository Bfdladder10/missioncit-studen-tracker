// Admin Routes - defines all admin-related routes
const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/adminController');
const { authMiddleware } = require('../middleware/auth');
const { roleMiddleware } = require('../middleware/roles');

// Admin dashboard statistics
router.get('/stats', authMiddleware, roleMiddleware(['admin']), AdminController.getAdminStats);

// Certification levels CRUD operations
router.get('/certification-levels/:id', authMiddleware, roleMiddleware(['admin']), AdminController.getCertificationLevel);
router.post('/certification-levels/add', authMiddleware, roleMiddleware(['admin']), AdminController.addCertificationLevel);
router.put('/certification-levels/:id', authMiddleware, roleMiddleware(['admin']), AdminController.updateCertificationLevel);
router.patch('/certification-levels/:id/toggle-status', authMiddleware, roleMiddleware(['admin']), AdminController.toggleCertificationLevelStatus);
router.post('/certification-levels/import', authMiddleware, roleMiddleware(['admin']), AdminController.importCertificationLevels);

module.exports = router;
