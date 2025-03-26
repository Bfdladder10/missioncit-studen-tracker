// Clinical Routes - routes for clinical sites and logs
const express = require('express');
const router = express.Router();
const ClinicalController = require('../controllers/clinicalController');
const { authMiddleware } = require('../middleware/auth');
const { roleMiddleware } = require('../middleware/roles');

// Clinical sites routes
router.get('/sites', authMiddleware, ClinicalController.getActiveClinicalSites);
router.get('/sites/all', authMiddleware, roleMiddleware(['admin']), ClinicalController.getAllClinicalSites);
router.get('/sites/:id', authMiddleware, ClinicalController.getClinicalSiteById);
router.post('/sites/add', authMiddleware, roleMiddleware(['admin']), ClinicalController.addClinicalSite);
router.put('/sites/:id', authMiddleware, roleMiddleware(['admin']), ClinicalController.updateClinicalSite);
router.patch('/sites/:id/toggle-status', authMiddleware, roleMiddleware(['admin']), ClinicalController.toggleClinicalSiteStatus);

// Clinical logs routes
router.get('/logs', authMiddleware, ClinicalController.getStudentClinicalLogs);
router.get('/logs/student/:studentId', authMiddleware, roleMiddleware(['admin', 'instructor']), ClinicalController.getStudentClinicalLogs);
router.get('/logs/:id', authMiddleware, ClinicalController.getClinicalLogById);
router.post('/logs/add', authMiddleware, ClinicalController.addClinicalLog);
router.put('/logs/:id', authMiddleware, ClinicalController.updateClinicalLog);
router.delete('/logs/:id', authMiddleware, ClinicalController.deleteClinicalLog);

// Summary routes
router.get('/summary', authMiddleware, ClinicalController.getStudentClinicalSummary);
router.get('/summary/student/:studentId', authMiddleware, roleMiddleware(['admin', 'instructor']), ClinicalController.getStudentClinicalSummary);

module.exports = router;
