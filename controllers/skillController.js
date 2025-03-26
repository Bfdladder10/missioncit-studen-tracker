// Skills Controller - handles skill management and tracking
const SkillModel = require('../models/skillModel');

class SkillController {
  // Get skills for current user's certification level
  static async getSkillsForUser(req, res) {
    try {
      // For students, get skills for their certification level
      if (req.user.role === 'student') {
        const studentId = req.user.userId;
        const progress = await SkillModel.getStudentSkillProgress(studentId);
        return res.json(progress);
      }
      
      // For instructors/admins, get all skills
      const skills = await SkillModel.getAllSkills();
      return res.json({ skills });
      
    } catch (error) {
      console.error('Error fetching skills:', error);
      return res.status(500).json({ error: 'Failed to fetch skills' });
    }
  }

  // Get skill categories
  static async getSkillCategories(req, res) {
    try {
      const categories = await SkillModel.getSkillCategories();
      return res.json(categories);
    } catch (error) {
      console.error('Error fetching skill categories:', error);
      return res.status(500).json({ error: 'Failed to fetch skill categories' });
    }
  }

  // Add a new skill (admin only)
  static async addSkill(req, res) {
    try {
      const { skillName, description, categoryId, isActive } = req.body;
      
      if (!skillName) {
        return res.status(400).json({ error: 'Skill name is required' });
      }
      
      const result = await SkillModel.addSkill(skillName, description, categoryId, isActive);
      return res.status(201).json({ 
        success: true, 
        skillId: result.skill_id 
      });
    } catch (error) {
      console.error('Error adding skill:', error);
      
      if (error.message.includes('already exists')) {
        return res.status(400).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to add skill' });
    }
  }

  // Update a skill (admin only)
  static async updateSkill(req, res) {
    try {
      const skillId = req.params.id;
      const { skillName, description, categoryId, isActive } = req.body;
      
      if (!skillName) {
        return res.status(400).json({ error: 'Skill name is required' });
      }
      
      const result = await SkillModel.updateSkill(
        skillId, 
        skillName, 
        description, 
        categoryId, 
        isActive
      );
      
      return res.json(result);
    } catch (error) {
      console.error(`Error updating skill ${req.params.id}:`, error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      if (error.message.includes('already exists')) {
        return res.status(400).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to update skill' });
    }
  }

  // Toggle skill active status (admin only)
  static async toggleSkillStatus(req, res) {
    try {
      const skillId = req.params.id;
      const result = await SkillModel.toggleSkillStatus(skillId);
      
      return res.json(result);
    } catch (error) {
      console.error(`Error toggling skill ${req.params.id} status:`, error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to toggle skill status' });
    }
  }

  // Set skill for certification level (admin only)
  static async setSkillForLevel(req, res) {
    try {
      const { levelId, skillId, repetitionsRequired, isRequired } = req.body;
      
      if (!levelId || !skillId || !repetitionsRequired) {
        return res.status(400).json({ 
          error: 'Level ID, skill ID, and repetitions required are required' 
        });
      }
      
      const result = await SkillModel.setSkillForLevel(
        levelId, 
        skillId, 
        repetitionsRequired, 
        isRequired
      );
      
      return res.json({ 
        success: true, 
        certSkillId: result.cert_skill_id 
      });
    } catch (error) {
      console.error('Error setting skill for level:', error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to set skill for certification level' });
    }
  }

  // Remove skill from certification level (admin only)
  static async removeSkillFromLevel(req, res) {
    try {
      const { levelId, skillId } = req.body;
      
      if (!levelId || !skillId) {
        return res.status(400).json({ error: 'Level ID and skill ID are required' });
      }
      
      const result = await SkillModel.removeSkillFromLevel(levelId, skillId);
      
      return res.json(result);
    } catch (error) {
      console.error('Error removing skill from level:', error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to remove skill from certification level' });
    }
  }

  // Log a skill completion (student only)
  static async logSkillCompletion(req, res) {
    try {
      // Only students can log skills
      if (req.user.role !== 'student') {
        return res.status(403).json({ error: 'Only students can log skill completions' });
      }
      
      const studentId = req.user.userId;
      const { skillId, location, notes, isSuccessful } = req.body;
      
      if (!skillId) {
        return res.status(400).json({ error: 'Skill ID is required' });
      }
      
      const result = await SkillModel.logSkillCompletion(
        studentId, 
        skillId, 
        location, 
        notes, 
        isSuccessful
      );
      
      return res.status(201).json({ 
        success: true, 
        completionId: result.completion_id 
      });
    } catch (error) {
      console.error('Error logging skill completion:', error);
      return res.status(500).json({ error: 'Failed to log skill completion' });
    }
  }

  // Get skill completions for a specific skill
  static async getSkillCompletions(req, res) {
    try {
      const skillId = req.params.skillId;
      let studentId;
      
      // If user is a student, they can only see their own completions
      if (req.user.role === 'student') {
        studentId = req.user.userId;
      } else {
        // For instructors/admins, they can see any student's completions
        studentId = req.query.studentId;
        
        if (!studentId) {
          return res.status(400).json({ error: 'Student ID is required' });
        }
      }
      
      const completions = await SkillModel.getSkillCompletions(studentId, skillId);
      
      return res.json(completions);
    } catch (error) {
      console.error('Error fetching skill completions:', error);
      return res.status(500).json({ error: 'Failed to fetch skill completions' });
    }
  }

  // Get skill progress for a student
  static async getSkillProgress(req, res) {
    try {
      let studentId;
      
      // If user is a student, they can only see their own progress
      if (req.user.role === 'student') {
        studentId = req.user.userId;
      } else {
        // For instructors/admins, they can see any student's progress
        studentId = req.params.studentId;
        
        if (!studentId) {
          return res.status(400).json({ error: 'Student ID is required' });
        }
      }
      
      const progress = await SkillModel.getStudentSkillProgress(studentId);
      
      return res.json(progress);
    } catch (error) {
      console.error('Error fetching skill progress:', error);
      return res.status(500).json({ error: 'Failed to fetch skill progress' });
    }
  }
}

module.exports = SkillController;
