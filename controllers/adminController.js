// Admin Controller - handles admin-related business logic
const CertificationModel = require('../models/certificationModel');
const { connectToDb } = require('../config/database');

class AdminController {
  // Get admin dashboard statistics
  static async getAdminStats(req, res) {
    let client;
    try {
      client = await connectToDb();
      
      // Get count of students
      const studentCountResult = await client.query(`
        SELECT COUNT(*) as count FROM users WHERE role = 'student'
      `);
      
      // Get count of active certification levels
      const levelCountResult = await client.query(`
        SELECT COUNT(*) as count FROM certification_levels WHERE is_active = true
      `);
      
      // Get count of skills
      const skillCountResult = await client.query(`
        SELECT COUNT(*) as count FROM skills
      `);
      
      // Get count of clinical locations
      const locationCountResult = await client.query(`
        SELECT COUNT(*) as count FROM clinical_locations WHERE is_active = true
      `);
      
      const stats = {
        studentCount: parseInt(studentCountResult.rows[0].count) || 0,
        certificationLevelCount: parseInt(levelCountResult.rows[0].count) || 0,
        skillCount: parseInt(skillCountResult.rows[0].count) || 0,
        clinicalLocationCount: parseInt(locationCountResult.rows[0].count) || 0
      };
      
      return res.json(stats);
    } catch (error) {
      console.error('Error getting admin statistics:', error);
      return res.status(500).json({ error: 'Failed to get admin statistics' });
    } finally {
      if (client) await client.end();
    }
  }

  // Get certification level by ID
  static async getCertificationLevel(req, res) {
    try {
      const levelId = req.params.id;
      const level = await CertificationModel.getLevelById(levelId);
      
      if (!level) {
        return res.status(404).json({ error: 'Certification level not found' });
      }
      
      return res.json(level);
    } catch (error) {
      console.error(`Error getting certification level ${req.params.id}:`, error);
      return res.status(500).json({ error: 'Failed to get certification level' });
    }
  }

  // Add a new certification level
  static async addCertificationLevel(req, res) {
    try {
      const { levelName, description, isActive } = req.body;
      
      if (!levelName) {
        return res.status(400).json({ error: 'Level name is required' });
      }
      
      const result = await CertificationModel.addLevel(levelName, description, isActive);
      return res.json({ success: true, levelId: result.level_id });
    } catch (error) {
      console.error('Error adding certification level:', error);
      
      if (error.message.includes('already exists')) {
        return res.status(400).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to add certification level' });
    }
  }

  // Update an existing certification level
  static async updateCertificationLevel(req, res) {
    try {
      const levelId = req.params.id;
      const { levelName, description, isActive } = req.body;
      
      if (!levelName) {
        return res.status(400).json({ error: 'Level name is required' });
      }
      
      const updatedLevel = await CertificationModel.updateLevel(
        levelId, 
        levelName, 
        description, 
        isActive
      );
      
      return res.json(updatedLevel);
    } catch (error) {
      console.error(`Error updating certification level ${req.params.id}:`, error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      if (error.message.includes('already exists')) {
        return res.status(400).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to update certification level' });
    }
  }

  // Toggle certification level active status
  static async toggleCertificationLevelStatus(req, res) {
    try {
      const levelId = req.params.id;
      const updatedLevel = await CertificationModel.toggleLevelStatus(levelId);
      
      return res.json(updatedLevel);
    } catch (error) {
      console.error(`Error toggling certification level ${req.params.id} status:`, error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to toggle certification level status' });
    }
  }

  // Import certification levels from CSV
  static async importCertificationLevels(req, res) {
    try {
      if (!req.files || !req.files.csvFile) {
        return res.status(400).json({ error: 'CSV file is required' });
      }
      
      const csvFile = req.files.csvFile;
      const updateExisting = req.body.updateExisting === 'true';
      
      // Parse CSV content
      const csvContent = csvFile.data.toString('utf8');
      const rows = csvContent.split('\n').filter(row => row.trim());
      
      const result = await CertificationModel.importLevels(rows, updateExisting);
      
      return res.json({
        success: true,
        message: `Import completed: ${result.added} levels added, ${result.updated} levels updated, ${result.skipped} levels skipped.`
      });
    } catch (error) {
      console.error('Error importing certification levels:', error);
      return res.status(500).json({ error: 'Failed to import certification levels: ' + error.message });
    }
  }
}

module.exports = AdminController;
