// Scheduling Controller - handles clinical scheduling and student assignments
const SchedulingModel = require('../models/schedulingModel');

class SchedulingController {
  // Get available clinical slots
  static async getAvailableSlots(req, res) {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start date and end date are required' });
      }
      
      const slots = await SchedulingModel.getAvailableSlots(startDate, endDate);
      return res.json({ slots });
    } catch (error) {
      console.error('Error fetching available slots:', error);
      return res.status(500).json({ error: 'Failed to fetch available clinical slots' });
    }
  }

  // Get slot by ID
  static async getSlotById(req, res) {
    try {
      const slotId = req.params.id;
      const slot = await SchedulingModel.getSlotById(slotId);
      return res.json(slot);
    } catch (error) {
      console.error(`Error fetching slot ${req.params.id}:`, error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to fetch clinical slot' });
    }
  }

  // Create a new clinical slot (admin only)
  static async createSlot(req, res) {
    try {
      const { 
        siteId, 
        slotDate, 
        startTime, 
        endTime, 
        maxStudents, 
        preceptorName, 
        notes,
        isActive 
      } = req.body;
      
      if (!siteId || !slotDate || !startTime || !endTime || !maxStudents) {
        return res.status(400).json({ 
          error: 'Site ID, date, start time, end time, and max students are required' 
        });
      }
      
      const result = await SchedulingModel.createSlot(
        siteId, 
        slotDate, 
        startTime, 
        endTime, 
        maxStudents, 
        preceptorName, 
        notes,
        isActive
      );
      
      return res.status(201).json({ 
        success: true, 
        slotId: result.slot_id 
      });
    } catch (error) {
      console.error('Error creating clinical slot:', error);
      
      if (error.message.includes('not found') || error.message.includes('inactive')) {
        return res.status(400).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to create clinical slot' });
    }
  }

  // Update a clinical slot (admin only)
  static async updateSlot(req, res) {
    try {
      const slotId = req.params.id;
      const { 
        siteId, 
        slotDate, 
        startTime, 
        endTime, 
        maxStudents, 
        preceptorName, 
        notes,
        isActive 
      } = req.body;
      
      const result = await SchedulingModel.updateSlot(
        slotId,
        siteId, 
        slotDate, 
        startTime, 
        endTime, 
        maxStudents, 
        preceptorName, 
        notes,
        isActive
      );
      
      return res.json(result);
    } catch (error) {
      console.error(`Error updating slot ${req.params.id}:`, error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      if (error.message.includes('cannot reduce') || 
          error.message.includes('inactive')) {
        return res.status(400).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to update clinical slot' });
    }
  }

  // Delete a clinical slot (admin only)
  static async deleteSlot(req, res) {
    try {
      const slotId = req.params.id;
      const result = await SchedulingModel.deleteSlot(slotId);
      
      return res.json(result);
    } catch (error) {
      console.error(`Error deleting slot ${req.params.id}:`, error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      if (error.message.includes('existing assignments')) {
        return res.status(400).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to delete clinical slot' });
    }
  }

  // Get student's preferences
  static async getStudentPreferences(req, res) {
    try {
      let studentId;
      
      // If user is a student, they can only see their own preferences
      if (req.user.role === 'student') {
        studentId = req.user.userId;
      } else {
        // For instructors/admins, they can see any student's preferences
        studentId = req.params.studentId;
        
        if (!studentId) {
          return res.status(400).json({ error: 'Student ID is required' });
        }
      }
      
      const preferences = await SchedulingModel.getStudentPreferences(studentId);
      
      return res.json({ preferences });
    } catch (error) {
      console.error('Error fetching student preferences:', error);
      return res.status(500).json({ error: 'Failed to fetch student preferences' });
    }
  }

  // Set student preference
  static async setStudentPreference(req, res) {
    try {
      let studentId;
      
      // If user is a student, they can only set their own preferences
      if (req.user.role === 'student') {
        studentId = req.user.userId;
      } else {
        // For instructors/admins, they can set any student's preferences
        studentId = req.body.studentId;
        
        if (!studentId) {
          return res.status(400).json({ error: 'Student ID is required' });
        }
      }
      
      const { slotId, rank } = req.body;
      
      if (!slotId || rank === undefined) {
        return res.status(400).json({ error: 'Slot ID and rank are required' });
      }
      
      const result = await SchedulingModel.setStudentPreference(studentId, slotId, rank);
      
      return res.json(result);
    } catch (error) {
      console.error('Error setting student preference:', error);
      
      if (error.message.includes('not found') || 
          error.message.includes('is not a student') || 
          error.message.includes('inactive')) {
        return res.status(400).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to set student preference' });
    }
  }

  // Delete student preference
  static async deleteStudentPreference(req, res) {
    try {
      let studentId;
      
      // If user is a student, they can only delete their own preferences
      if (req.user.role === 'student') {
        studentId = req.user.userId;
      } else {
        // For instructors/admins, they can delete any student's preferences
        studentId = req.body.studentId;
        
        if (!studentId) {
          return res.status(400).json({ error: 'Student ID is required' });
        }
      }
      
      const { slotId } = req.body;
      
      if (!slotId) {
        return res.status(400).json({ error: 'Slot ID is required' });
      }
      
      const result = await SchedulingModel.deleteStudentPreference(studentId, slotId);
      
      return res.json(result);
    } catch (error) {
      console.error('Error deleting student preference:', error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to delete student preference' });
    }
  }

  // Assign student to a clinical slot (admin/instructor only)
  static async assignStudentToSlot(req, res) {
    try {
      const { studentId, slotId, notes } = req.body;
      
      if (!studentId || !slotId) {
        return res.status(400).json({ error: 'Student ID and slot ID are required' });
      }
      
      const result = await SchedulingModel.assignStudentToSlot(
        studentId, 
        slotId, 
        req.user.userId, // The user making the assignment
        notes
      );
      
      return res.status(201).json({ 
        success: true, 
        assignmentId: result.assignment_id 
      });
    } catch (error) {
      console.error('Error assigning student to slot:', error);
      
      if (error.message.includes('not found') || 
          error.message.includes('is not a student') || 
          error.message.includes('inactive') || 
          error.message.includes('maximum capacity') || 
          error.message.includes('already assigned') || 
          error.message.includes('during this time period')) {
        return res.status(400).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to assign student to clinical slot' });
    }
  }

  // Remove student assignment (admin/instructor only)
  static async removeAssignment(req, res) {
    try {
      const { assignmentId } = req.body;
      
      if (!assignmentId) {
        return res.status(400).json({ error: 'Assignment ID is required' });
      }
      
      const result = await SchedulingModel.removeAssignment(assignmentId);
      
      return res.json(result);
    } catch (error) {
      console.error('Error removing assignment:', error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to remove clinical assignment' });
    }
  }

  // Get student assignments
  static async getStudentAssignments(req, res) {
    try {
      let studentId;
      
      // If user is a student, they can only see their own assignments
      if (req.user.role === 'student') {
        studentId = req.user.userId;
      } else {
        // For instructors/admins, they can see any student's assignments
        studentId = req.params.studentId;
        
        if (!studentId) {
          return res.status(400).json({ error: 'Student ID is required' });
        }
      }
      
      const assignments = await SchedulingModel.getStudentAssignments(studentId);
      
      return res.json({ assignments });
    } catch (error) {
      console.error('Error fetching student assignments:', error);
      return res.status(500).json({ error: 'Failed to fetch student assignments' });
    }
  }

  // Get slot assignments
  static async getSlotAssignments(req, res) {
    try {
      const { slotId } = req.params;
      
      if (!slotId) {
        return res.status(400).json({ error: 'Slot ID is required' });
      }
      
      const assignments = await SchedulingModel.getSlotAssignments(slotId);
      
      return res.json({ assignments });
    } catch (error) {
      console.error('Error fetching slot assignments:', error);
      return res.status(500).json({ error: 'Failed to fetch slot assignments' });
    }
  }

  // Auto-assign students based on preferences (admin/instructor only)
  static async autoAssignStudents(req, res) {
    try {
      const { slotIds } = req.body;
      
      if (!slotIds || !Array.isArray(slotIds) || slotIds.length === 0) {
        return res.status(400).json({ error: 'At least one slot ID is required' });
      }
      
      const result = await SchedulingModel.autoAssignStudents(slotIds, req.user.userId);
      
      return res.json(result);
    } catch (error) {
      console.error('Error auto-assigning students:', error);
      return res.status(500).json({ error: 'Failed to auto-assign students to clinical slots' });
    }
  }
}

module.exports = SchedulingController;
