// Ride Time Controller - handles student ride time with ambulance services
const RideTimeModel = require('../models/rideTimeModel');

class RideTimeController {
  // Get all ambulance services (admin only)
  static async getAllServices(req, res) {
    try {
      const services = await RideTimeModel.getAllServices();
      return res.json({ services });
    } catch (error) {
      console.error('Error fetching ambulance services:', error);
      return res.status(500).json({ error: 'Failed to fetch ambulance services' });
    }
  }

  // Get active ambulance services (all users)
  static async getActiveServices(req, res) {
    try {
      const services = await RideTimeModel.getActiveServices();
      return res.json({ services });
    } catch (error) {
      console.error('Error fetching active ambulance services:', error);
      return res.status(500).json({ error: 'Failed to fetch active ambulance services' });
    }
  }

  // Get ambulance service by ID
  static async getServiceById(req, res) {
    try {
      const serviceId = req.params.id;
      const service = await RideTimeModel.getServiceById(serviceId);
      return res.json(service);
    } catch (error) {
      console.error(`Error fetching ambulance service ${req.params.id}:`, error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to fetch ambulance service' });
    }
  }

  // Add a new ambulance service (admin only)
  static async addService(req, res) {
    try {
      const { 
        serviceName, 
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
      
      if (!serviceName) {
        return res.status(400).json({ error: 'Service name is required' });
      }
      
      const result = await RideTimeModel.addService(
        serviceName, 
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
        serviceId: result.service_id 
      });
    } catch (error) {
      console.error('Error adding ambulance service:', error);
      
      if (error.message.includes('already exists')) {
        return res.status(400).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to add ambulance service' });
    }
  }

  // Update an ambulance service (admin only)
  static async updateService(req, res) {
    try {
      const serviceId = req.params.id;
      const { 
        serviceName, 
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
      
      const result = await RideTimeModel.updateService(
        serviceId,
        serviceName, 
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
      console.error(`Error updating ambulance service ${req.params.id}:`, error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      if (error.message.includes('already exists')) {
        return res.status(400).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to update ambulance service' });
    }
  }

  // Toggle ambulance service active status (admin only)
  static async toggleServiceStatus(req, res) {
    try {
      const serviceId = req.params.id;
      const result = await RideTimeModel.toggleServiceStatus(serviceId);
      
      return res.json(result);
    } catch (error) {
      console.error(`Error toggling ambulance service ${req.params.id} status:`, error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to toggle ambulance service status' });
    }
  }

  // Get ride time logs for a student
  static async getStudentRideLogs(req, res) {
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
      
      const logs = await RideTimeModel.getStudentRideLogs(studentId);
      
      return res.json({ logs });
    } catch (error) {
      console.error('Error fetching ride time logs:', error);
      return res.status(500).json({ error: 'Failed to fetch ride time logs' });
    }
  }

  // Get ride log by ID
  static async getRideLogById(req, res) {
    try {
      const logId = req.params.id;
      const log = await RideTimeModel.getRideLogById(logId);
      
      // If user is a student, they can only see their own logs
      if (req.user.role === 'student' && log.student_id !== req.user.userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      return res.json(log);
    } catch (error) {
      console.error(`Error fetching ride log ${req.params.id}:`, error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to fetch ride time log' });
    }
  }

  // Add a new ride time log
  static async addRideLog(req, res) {
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
        serviceId, 
        date, 
        hours, 
        shiftType, 
        unitType, 
        preceptorName, 
        preceptorLicense,
        patientContacts,
        aedUsed,
        cprPerformed,
        spinalImmobilization,
        ventilations,
        tractionSplinting,
        twelveLead,
        medicationAdministrations,
        ivsPlaced,
        notes
      } = req.body;
      
      if (!serviceId || !date || !hours) {
        return res.status(400).json({ 
          error: 'Service ID, date, and hours are required' 
        });
      }
      
      const result = await RideTimeModel.addRideLog(
        studentId,
        serviceId, 
        date, 
        hours, 
        shiftType, 
        unitType, 
        preceptorName, 
        preceptorLicense,
        patientContacts || 0,
        aedUsed || false,
        cprPerformed || false,
        spinalImmobilization || false,
        ventilations || false,
        tractionSplinting || false,
        twelveLead || false,
        medicationAdministrations || 0,
        ivsPlaced || 0,
        notes
      );
      
      return res.status(201).json({ 
        success: true, 
        logId: result.log_id 
      });
    } catch (error) {
      console.error('Error adding ride time log:', error);
      
      if (error.message.includes('not found') || error.message.includes('inactive')) {
        return res.status(400).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to add ride time log' });
    }
  }

  // Update a ride time log
  static async updateRideLog(req, res) {
    try {
      const logId = req.params.id;
      
      // First, get the log to check permissions
      const log = await RideTimeModel.getRideLogById(logId);
      
      // If user is a student, they can only update their own logs
      if (req.user.role === 'student' && log.student_id !== req.user.userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const { 
        serviceId, 
        date, 
        hours, 
        shiftType, 
        unitType, 
        preceptorName, 
        preceptorLicense,
        patientContacts,
        aedUsed,
        cprPerformed,
        spinalImmobilization,
        ventilations,
        tractionSplinting,
        twelveLead,
        medicationAdministrations,
        ivsPlaced,
        notes
      } = req.body;
      
      const result = await RideTimeModel.updateRideLog(
        logId,
        serviceId, 
        date, 
        hours, 
        shiftType, 
        unitType, 
        preceptorName, 
        preceptorLicense,
        patientContacts,
        aedUsed,
        cprPerformed,
        spinalImmobilization,
        ventilations,
        tractionSplinting,
        twelveLead,
        medicationAdministrations,
        ivsPlaced,
        notes
      );
      
      return res.json(result);
    } catch (error) {
      console.error(`Error updating ride time log ${req.params.id}:`, error);
      
      if (error.message.includes('not found') || error.message.includes('inactive')) {
        return res.status(400).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to update ride time log' });
    }
  }

  // Delete a ride time log
  static async deleteRideLog(req, res) {
    try {
      const logId = req.params.id;
      
      // First, get the log to check permissions
      const log = await RideTimeModel.getRideLogById(logId);
      
      // If user is a student, they can only delete their own logs
      if (req.user.role === 'student' && log.student_id !== req.user.userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      
      const result = await RideTimeModel.deleteRideLog(logId);
      
      return res.json(result);
    } catch (error) {
      console.error(`Error deleting ride time log ${req.params.id}:`, error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to delete ride time log' });
    }
  }

  // Get ride time summary for a student
  static async getStudentRideSummary(req, res) {
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
      
      const summary = await RideTimeModel.getStudentRideSummary(studentId);
      
      return res.json(summary);
    } catch (error) {
      console.error('Error fetching ride time summary:', error);
      return res.status(500).json({ error: 'Failed to fetch ride time summary' });
    }
  }
}

module.exports = RideTimeController;
