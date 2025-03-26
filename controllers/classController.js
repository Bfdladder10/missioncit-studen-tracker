// Class Controller - handles cohorts/classes of students
const ClassModel = require('../models/classModel');

class ClassController {
  // Get all classes (admin only)
  static async getAllClasses(req, res) {
    try {
      const classes = await ClassModel.getAllClasses();
      return res.json({ classes });
    } catch (error) {
      console.error('Error fetching classes:', error);
      return res.status(500).json({ error: 'Failed to fetch classes' });
    }
  }

  // Get active classes (all users)
  static async getActiveClasses(req, res) {
    try {
      const classes = await ClassModel.getActiveClasses();
      return res.json({ classes });
    } catch (error) {
      console.error('Error fetching active classes:', error);
      return res.status(500).json({ error: 'Failed to fetch active classes' });
    }
  }

  // Get class by ID
  static async getClassById(req, res) {
    try {
      const classId = req.params.id;
      const classData = await ClassModel.getClassById(classId);
      return res.json(classData);
    } catch (error) {
      console.error(`Error fetching class ${req.params.id}:`, error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to fetch class' });
    }
  }

  // Add a new class (admin only)
  static async addClass(req, res) {
    try {
      const { 
        className, 
        startDate, 
        endDate, 
        certificationLevelId, 
        instructorId, 
        notes,
        isActive 
      } = req.body;
      
      if (!className) {
        return res.status(400).json({ error: 'Class name is required' });
      }
      
      const result = await ClassModel.addClass(
        className, 
        startDate, 
        endDate, 
        certificationLevelId, 
        instructorId, 
        notes,
        isActive
      );
      
      return res.status(201).json({ 
        success: true, 
        classId: result.class_id 
      });
    } catch (error) {
      console.error('Error adding class:', error);
      
      if (error.message.includes('already exists') || 
          error.message.includes('not found') || 
          error.message.includes('does not have instructor privileges')) {
        return res.status(400).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to add class' });
    }
  }

  // Update a class (admin only)
  static async updateClass(req, res) {
    try {
      const classId = req.params.id;
      const { 
        className, 
        startDate, 
        endDate, 
        certificationLevelId, 
        instructorId, 
        notes,
        isActive 
      } = req.body;
      
      const result = await ClassModel.updateClass(
        classId,
        className, 
        startDate, 
        endDate, 
        certificationLevelId, 
        instructorId, 
        notes,
        isActive
      );
      
      return res.json(result);
    } catch (error) {
      console.error(`Error updating class ${req.params.id}:`, error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      if (error.message.includes('already exists') || 
          error.message.includes('does not have instructor privileges')) {
        return res.status(400).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to update class' });
    }
  }

  // Toggle class active status (admin only)
  static async toggleClassStatus(req, res) {
    try {
      const classId = req.params.id;
      const result = await ClassModel.toggleClassStatus(classId);
      
      return res.json(result);
    } catch (error) {
      console.error(`Error toggling class ${req.params.id} status:`, error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to toggle class status' });
    }
  }

  // Get students in a class
  static async getStudentsInClass(req, res) {
    try {
      const classId = req.params.id;
      const students = await ClassModel.getStudentsInClass(classId);
      
      return res.json({ students });
    } catch (error) {
      console.error(`Error fetching students in class ${req.params.id}:`, error);
      return res.status(500).json({ error: 'Failed to fetch students in class' });
    }
  }

  // Add students to a class (batch operation) (admin/instructor only)
  static async addStudentsToClass(req, res) {
    try {
      const { classId, studentIds, enrollmentDate } = req.body;
      
      if (!classId || !studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
        return res.status(400).json({ 
          error: 'Class ID and at least one student ID are required' 
        });
      }
      
      const result = await ClassModel.addStudentsToClass(
        classId, 
        studentIds, 
        enrollmentDate
      );
      
      return res.json(result);
    } catch (error) {
      console.error('Error adding students to class:', error);
      
      if (error.message.includes('not found') || 
          error.message.includes('is not a student')) {
        return res.status(400).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to add students to class' });
    }
  }

  // Remove student from a class (admin/instructor only)
  static async removeStudentFromClass(req, res) {
    try {
      const { classId, studentId } = req.body;
      
      if (!classId || !studentId) {
        return res.status(400).json({ error: 'Class ID and student ID are required' });
      }
      
      const result = await ClassModel.removeStudentFromClass(classId, studentId);
      
      return res.json(result);
    } catch (error) {
      console.error('Error removing student from class:', error);
      
      if (error.message.includes('not enrolled')) {
        return res.status(404).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to remove student from class' });
    }
  }

  // Get classes a student is enrolled in
  static async getStudentClasses(req, res) {
    try {
      let studentId;
      
      // If user is a student, they can only see their own classes
      if (req.user.role === 'student') {
        studentId = req.user.userId;
      } else {
        // For instructors/admins, they can see any student's classes
        studentId = req.params.studentId;
        
        if (!studentId) {
          return res.status(400).json({ error: 'Student ID is required' });
        }
      }
      
      const classes = await ClassModel.getStudentClasses(studentId);
      
      return res.json({ classes });
    } catch (error) {
      console.error('Error fetching student classes:', error);
      return res.status(500).json({ error: 'Failed to fetch student classes' });
    }
  }
}

module.exports = ClassController;
