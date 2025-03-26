// Class Model - handles cohorts/classes of students
const { pool } = require('../config/database');

class ClassModel {
  // Get all classes
  static async getAllClasses() {
    try {
      const result = await pool.query(`
        SELECT 
          class_id, 
          class_name, 
          start_date, 
          end_date, 
          certification_level_id,
          (SELECT level_name FROM certification_levels WHERE level_id = classes.certification_level_id) as level_name,
          instructor_id,
          (SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE user_id = classes.instructor_id) as instructor_name,
          notes,
          is_active,
          created_at,
          updated_at
        FROM classes
        ORDER BY start_date DESC
      `);
      
      return result.rows;
    } catch (error) {
      console.error('Database error in getAllClasses:', error);
      throw new Error('Failed to retrieve classes');
    }
  }

  // Get active classes
  static async getActiveClasses() {
    try {
      const result = await pool.query(`
        SELECT 
          class_id, 
          class_name, 
          start_date, 
          end_date, 
          certification_level_id,
          (SELECT level_name FROM certification_levels WHERE level_id = classes.certification_level_id) as level_name,
          instructor_id,
          (SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE user_id = classes.instructor_id) as instructor_name,
          notes
        FROM classes
        WHERE is_active = true
        ORDER BY start_date DESC
      `);
      
      return result.rows;
    } catch (error) {
      console.error('Database error in getActiveClasses:', error);
      throw new Error('Failed to retrieve active classes');
    }
  }

  // Get class by ID
  static async getClassById(classId) {
    try {
      const result = await pool.query(`
        SELECT 
          class_id, 
          class_name, 
          start_date, 
          end_date, 
          certification_level_id,
          (SELECT level_name FROM certification_levels WHERE level_id = classes.certification_level_id) as level_name,
          instructor_id,
          (SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE user_id = classes.instructor_id) as instructor_name,
          notes,
          is_active,
          created_at,
          updated_at
        FROM classes
        WHERE class_id = $1
      `, [classId]);
      
      if (result.rows.length === 0) {
        throw new Error(`Class with ID ${classId} not found`);
      }
      
      return result.rows[0];
    } catch (error) {
      console.error(`Database error in getClassById(${classId}):`, error);
      throw error;
    }
  }

  // Add a new class
  static async addClass(className, startDate, endDate, certificationLevelId, instructorId, notes, isActive = true) {
    try {
      // Check if a class with the same name already exists
      const existingResult = await pool.query(`
        SELECT class_id FROM classes WHERE class_name = $1
      `, [className]);
      
      if (existingResult.rows.length > 0) {
        throw new Error(`A class with the name '${className}' already exists`);
      }
      
      // Verify that the certification level exists
      if (certificationLevelId) {
        const levelExists = await pool.query(`
          SELECT level_id FROM certification_levels WHERE level_id = $1
        `, [certificationLevelId]);
        
        if (levelExists.rows.length === 0) {
          throw new Error(`Certification level with ID ${certificationLevelId} not found`);
        }
      }
      
      // Verify that the instructor exists and is an instructor or admin
      if (instructorId) {
        const instructorExists = await pool.query(`
          SELECT user_id FROM users 
          WHERE user_id = $1 AND (role = 'instructor' OR role = 'admin')
        `, [instructorId]);
        
        if (instructorExists.rows.length === 0) {
          throw new Error(`Instructor with ID ${instructorId} not found or does not have instructor privileges`);
        }
      }
      
      const result = await pool.query(`
        INSERT INTO classes (
          class_name, 
          start_date, 
          end_date, 
          certification_level_id, 
          instructor_id, 
          notes,
          is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING class_id
      `, [className, startDate, endDate, certificationLevelId, instructorId, notes, isActive]);
      
      return { class_id: result.rows[0].class_id };
    } catch (error) {
      console.error('Database error in addClass:', error);
      throw error;
    }
  }

  // Update a class
  static async updateClass(classId, className, startDate, endDate, certificationLevelId, instructorId, notes, isActive) {
    try {
      // Check if the class exists
      const classExists = await pool.query(`
        SELECT class_id FROM classes WHERE class_id = $1
      `, [classId]);
      
      if (classExists.rows.length === 0) {
        throw new Error(`Class with ID ${classId} not found`);
      }
      
      // Check if the new name conflicts with another class
      if (className) {
        const nameConflict = await pool.query(`
          SELECT class_id FROM classes 
          WHERE class_name = $1 AND class_id != $2
        `, [className, classId]);
        
        if (nameConflict.rows.length > 0) {
          throw new Error(`A class with the name '${className}' already exists`);
        }
      }
      
      // Verify that the certification level exists
      if (certificationLevelId) {
        const levelExists = await pool.query(`
          SELECT level_id FROM certification_levels WHERE level_id = $1
        `, [certificationLevelId]);
        
        if (levelExists.rows.length === 0) {
          throw new Error(`Certification level with ID ${certificationLevelId} not found`);
        }
      }
      
      // Verify that the instructor exists and is an instructor or admin
      if (instructorId) {
        const instructorExists = await pool.query(`
          SELECT user_id FROM users 
          WHERE user_id = $1 AND (role = 'instructor' OR role = 'admin')
        `, [instructorId]);
        
        if (instructorExists.rows.length === 0) {
          throw new Error(`Instructor with ID ${instructorId} not found or does not have instructor privileges`);
        }
      }
      
      const result = await pool.query(`
        UPDATE classes
        SET 
          class_name = COALESCE($2, class_name),
          start_date = COALESCE($3, start_date),
          end_date = COALESCE($4, end_date),
          certification_level_id = COALESCE($5, certification_level_id),
          instructor_id = COALESCE($6, instructor_id),
          notes = COALESCE($7, notes),
          is_active = COALESCE($8, is_active),
          updated_at = NOW()
        WHERE class_id = $1
        RETURNING class_id
      `, [classId, className, startDate, endDate, certificationLevelId, instructorId, notes, isActive]);
      
      if (result.rows.length === 0) {
        throw new Error(`Failed to update class with ID ${classId}`);
      }
      
      return { class_id: result.rows[0].class_id, success: true };
    } catch (error) {
      console.error(`Database error in updateClass(${classId}):`, error);
      throw error;
    }
  }

  // Toggle class active status
  static async toggleClassStatus(classId) {
    try {
      const result = await pool.query(`
        UPDATE classes
        SET 
          is_active = NOT is_active,
          updated_at = NOW()
        WHERE class_id = $1
        RETURNING class_id, is_active
      `, [classId]);
      
      if (result.rows.length === 0) {
        throw new Error(`Class with ID ${classId} not found`);
      }
      
      return {
        class_id: result.rows[0].class_id,
        is_active: result.rows[0].is_active,
        success: true
      };
    } catch (error) {
      console.error(`Database error in toggleClassStatus(${classId}):`, error);
      throw error;
    }
  }

  // Get students in a class
  static async getStudentsInClass(classId) {
    try {
      const result = await pool.query(`
        SELECT 
          u.user_id,
          u.first_name,
          u.last_name,
          u.email,
          u.role,
          u.created_at,
          sc.enrollment_date
        FROM 
          users u
        JOIN 
          student_classes sc ON u.user_id = sc.student_id
        WHERE 
          sc.class_id = $1 AND u.role = 'student'
        ORDER BY 
          u.last_name, u.first_name
      `, [classId]);
      
      return result.rows;
    } catch (error) {
      console.error(`Database error in getStudentsInClass(${classId}):`, error);
      throw new Error('Failed to retrieve students in class');
    }
  }

  // Add students to a class (batch operation)
  static async addStudentsToClass(classId, studentIds, enrollmentDate = new Date()) {
    try {
      // Check if the class exists
      const classExists = await pool.query(`
        SELECT class_id FROM classes WHERE class_id = $1
      `, [classId]);
      
      if (classExists.rows.length === 0) {
        throw new Error(`Class with ID ${classId} not found`);
      }
      
      // Prepare for batch insert
      const values = [];
      const params = [];
      let paramIndex = 1;
      
      for (const studentId of studentIds) {
        // Verify the student exists and is a student
        const studentExists = await pool.query(`
          SELECT user_id FROM users 
          WHERE user_id = $1 AND role = 'student'
        `, [studentId]);
        
        if (studentExists.rows.length === 0) {
          throw new Error(`User with ID ${studentId} not found or is not a student`);
        }
        
        // Check if student is already in the class
        const alreadyEnrolled = await pool.query(`
          SELECT student_id FROM student_classes 
          WHERE student_id = $1 AND class_id = $2
        `, [studentId, classId]);
        
        if (alreadyEnrolled.rows.length === 0) {
          values.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2})`);
          params.push(studentId, classId, enrollmentDate);
          paramIndex += 3;
        }
      }
      
      // If no new students to add
      if (values.length === 0) {
        return { success: true, message: 'No new students to add to class' };
      }
      
      // Perform the batch insert
      const query = `
        INSERT INTO student_classes (student_id, class_id, enrollment_date)
        VALUES ${values.join(', ')}
        RETURNING student_id
      `;
      
      const result = await pool.query(query, params);
      
      return { 
        success: true, 
        studentsAdded: result.rows.length 
      };
    } catch (error) {
      console.error(`Database error in addStudentsToClass(${classId}):`, error);
      throw error;
    }
  }

  // Remove student from a class
  static async removeStudentFromClass(classId, studentId) {
    try {
      const result = await pool.query(`
        DELETE FROM student_classes
        WHERE class_id = $1 AND student_id = $2
        RETURNING student_id
      `, [classId, studentId]);
      
      if (result.rows.length === 0) {
        throw new Error(`Student with ID ${studentId} is not enrolled in class with ID ${classId}`);
      }
      
      return { success: true };
    } catch (error) {
      console.error(`Database error in removeStudentFromClass(${classId}, ${studentId}):`, error);
      throw error;
    }
  }

  // Get classes a student is enrolled in
  static async getStudentClasses(studentId) {
    try {
      const result = await pool.query(`
        SELECT 
          c.class_id, 
          c.class_name, 
          c.start_date, 
          c.end_date, 
          c.certification_level_id,
          (SELECT level_name FROM certification_levels WHERE level_id = c.certification_level_id) as level_name,
          c.instructor_id,
          (SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE user_id = c.instructor_id) as instructor_name,
          sc.enrollment_date
        FROM 
          classes c
        JOIN 
          student_classes sc ON c.class_id = sc.class_id
        WHERE 
          sc.student_id = $1 AND c.is_active = true
        ORDER BY 
          c.start_date DESC
      `, [studentId]);
      
      return result.rows;
    } catch (error) {
      console.error(`Database error in getStudentClasses(${studentId}):`, error);
      throw new Error('Failed to retrieve student classes');
    }
  }
}

module.exports = ClassModel;
