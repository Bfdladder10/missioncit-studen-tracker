// Clinical Controller - handles clinical sites and student clinical logs
const ClinicalModel = require('../models/clinicalModel');

class ClinicalController {
  // Get all clinical sites (admin only)
  static async getAllClinicalSites(req, res) {
    try {
      const sites = await ClinicalModel.getAllClinicalSites();
      return res.json({ sites });
    } catch (error) {
      console.error('Error fetching clinical sites:', error);
      return res.status(500).json({ error: 'Failed to fetch clinical sites' });
    }
  }

  // Get active clinical sites (all users)
  static async getActiveClinicalSites(req, res) {
    try {
      const sites = await ClinicalModel.getActiveClinicalSites();
      return res.json({ sites });
    } catch (error) {
      console.error('Error fetching active clinical sites:', error);
      return res.status(500).json({ error: 'Failed to fetch active clinical sites' });
    }
  }

  // Get clinical site by ID
  static async getClinicalSiteById(req, res) {
    try {
      const siteId = req.params.id;
      const site = await ClinicalModel.getClinicalSiteById(siteId);
      return res.json(site);
    } catch (error) {
      console.error(`Error fetching clinical site ${req.params.id}:`, error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to fetch clinical site' });
    }
  }

  // Add a new clinical site (admin only)
  static async addClinicalSite(req, res) {
    try {
      const { 
        siteName, 
        address, 
        city, 
        state, 
        zip, 
        contactName, 
        contactPhone, 
        contactEmail, 
        notes,
        isActive 
      } = req.body;
      
      if (!siteName) {
        return res.status(400).json({ error: 'Site name is required' });
      }
      
      const result = await ClinicalModel.addClinicalSite(
        siteName, 
        address, 
        city, 
        state, 
        zip, 
        contactName, 
        contactPhone, 
        contactEmail, 
        notes,
        isActive
      );
      
      return res.status(201).json({ 
        success: true, 
        siteId: result.site_id 
      });
    } catch (error) {
      console.error('Error adding clinical site:', error);
      
      if (error.message.includes('already exists')) {
        return res.status(400).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to add clinical site' });
    }
  }

  // Update a clinical site (admin only)
  static async updateClinicalSite(req, res) {
    try {
      const siteId = req.params.id;
      const { 
        siteName, 
        address, 
        city, 
        state, 
        zip, 
        contactName, 
        contactPhone, 
        contactEmail, 
        notes,
        isActive 
      } = req.body;
      
      const result = await ClinicalModel.updateClinicalSite(
        siteId,
        siteName, 
        address, 
        city, 
        state, 
        zip, 
        contactName, 
        contactPhone, 
        contactEmail, 
        notes,
        isActive
      );
      
      return res.json(result);
    } catch (error) {
      console.error(`Error updating clinical site ${req.params.id}:`, error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      if (error.message.includes('already exists')) {
        return res.status(400).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to update clinical site' });
    }
  }

  // Toggle clinical site active status (admin only)
  static async toggleClinicalSiteStatus(req, res) {
    try {
      const siteId = req.params.id;
      const result = await ClinicalModel.toggleClinicalSiteStatus(siteId);
      
      return res.json(result);
    } catch (error) {
      console.error(`Error toggling clinical site ${req.params.id} status:`, error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to toggle clinical site status' });
    }
  }

  // Get clinical logs for a student
  static async getStudentClinicalLogs(req, res) {
    try {
      let studentId;
      
      // If user is a student, they can only see their own logs
      if (req.user.role === 'student') {
        studentId = req.user.userId;
      } else {
        // For instructors/admins, they can see any student's logs
        studentId = req.params.studentId;
        
        if (!studentId) {
          return res.status(400).json({ error: 'Student ID is required' });
        }
      }
      
      const logs = await ClinicalModel.getStudentClinicalLogs(studentId);
      
      return res.json({ logs });
    } catch (error) {
      console.error('Error fetching clinical logs:', error);
      return res.status(500).json({ error: 'Failed to fetch clinical logs' });
    }
  }

  // Get clinical log by ID
  static async getClinicalLogById(req, res) {
    try {
      const logId = req.params.id;
      const log = await ClinicalModel.getClinicalLogById(logId);
      
      // If user is a student, they can only see their own logs
      if (req.user.role === 'student' && log.student_id !== req.user.userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      return res.json(log);
    } catch (error) {
      console.error(`Error fetching clinical log ${req.params.id}:`, error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to fetch clinical log' });
    }
  }

  // Add a new clinical log
  static async addClinicalLog(req, res) {
    try {
      let studentId;
      
      // If user is a student, they can only add logs for themselves
      if (req.user.role === 'student') {
        studentId = req.user.userId;
      } else {
        // For instructors/admins, they can add logs for any student
        studentId = req.body.studentId;
        
        if (!studentId) {
          return res.status(400).json({ error: 'Student ID is required' });
        }
      }
      
      const { 
        siteId, 
        date, 
        hours, 
        preceptorName, 
        patientContacts, 
        notes 
      } = req.body;
      
      if (!siteId || !date || !hours) {
        return res.status(400).json({ 
          error: 'Site ID, date, and hours are required' 
        });
      }
      
      const result = await ClinicalModel.addClinicalLog(
        studentId,
        siteId, 
        date, 
        hours, 
        preceptorName, 
        patientContacts, 
        notes
      );
      
      return res.status(201).json({ 
        success: true, 
        logId: result.log_id 
      });
    } catch (error) {
      console.error('Error adding clinical log:', error);
      
      if (error.message.includes('not found') || error.message.includes('inactive')) {
        return res.status(400).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to add clinical log' });
    }
  }

  // Update a clinical log
  static async updateClinicalLog(req, res) {
    try {
      const logId = req.params.id;
      
      // First, get the log to check permissions
      const log = await ClinicalModel.getClinicalLogById(logId);
      
      // If user is a student, they can only update their own logs
      if (req.user.role === 'student' && log.student_id !== req.user.userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const { 
        siteId, 
        date, 
        hours, 
        preceptorName, 
        patientContacts, 
        notes 
      } = req.body;
      
      const result = await ClinicalModel.updateClinicalLog(
        logId,
        siteId, 
        date, 
        hours, 
        preceptorName, 
        patientContacts, 
        notes
      );
      
      return res.json(result);
    } catch (error) {
      console.error(`Error updating clinical log ${req.params.id}:`, error);
      
      if (error.message.includes('not found') || error.message.includes('inactive')) {
        return res.status(400).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to update clinical log' });
    }
  }

  // Delete a clinical log
  static async deleteClinicalLog(req, res) {
    try {
      const logId = req.params.id;
      
      // First, get the log to check permissions
      const log = await ClinicalModel.getClinicalLogById(logId);
      
      // If user is a student, they can only delete their own logs
      if (req.user.role === 'student' && log.student_id !== req.user.userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const result = await ClinicalModel.deleteClinicalLog(logId);
      
      return res.json(result);
    } catch (error) {
      console.error(`Error deleting clinical log ${req.params.id}:`, error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to delete clinical log' });
    }
  }

  // Get clinical hours summary for a student
  static async getStudentClinicalSummary(req, res) {
    try {
      let studentId;
      
      // If user is a student, they can only see their own summary
      if (req.user.role === 'student') {
        studentId = req.user.userId;
      } else {
        // For instructors/admins, they can see any student's summary
        studentId = req.params.studentId;
        
        if (!studentId) {
          return res.status(400).json({ error: 'Student ID is required' });
        }
      }
      
      const summary = await ClinicalModel.getStudentClinicalSummary(studentId);
      
      return res.json(summary);
    } catch (error) {
      console.error('Error fetching clinical summary:', error);
      return res.status(500).json({ error: 'Failed to fetch clinical summary' });
    }
  }
}

module.exports = ClinicalController;
