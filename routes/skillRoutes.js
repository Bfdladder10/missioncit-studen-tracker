// Skills Routes - handles skill management and tracking
const express = require('express');
const router = express.Router();
const SkillController = require('../controllers/skillController');
const { authMiddleware } = require('../middleware/auth');
const { roleMiddleware } = require('../middleware/roles');

// Routes for all authenticated users
router.get('/', authMiddleware, SkillController.getSkillsForUser);
router.get('/categories', authMiddleware, SkillController.getSkillCategories);
router.get('/:skillId/completions', authMiddleware, SkillController.getSkillCompletions);

// Routes for students
router.post('/log', authMiddleware, SkillController.logSkillCompletion);
router.get('/progress', authMiddleware, SkillController.getSkillProgress);

// Routes for admins
router.post('/add', authMiddleware, roleMiddleware(['admin']), SkillController.addSkill);
router.put('/:id', authMiddleware, roleMiddleware(['admin']), SkillController.updateSkill);
router.patch('/:id/toggle-status', authMiddleware, roleMiddleware(['admin']), SkillController.toggleSkillStatus);
router.post('/set-for-level', authMiddleware, roleMiddleware(['admin']), SkillController.setSkillForLevel);
router.post('/remove-from-level', authMiddleware, roleMiddleware(['admin']), SkillController.removeSkillFromLevel);
router.get('/student/:studentId/progress', authMiddleware, roleMiddleware(['admin', 'instructor']), SkillController.getSkillProgress);

module.exports = router;
