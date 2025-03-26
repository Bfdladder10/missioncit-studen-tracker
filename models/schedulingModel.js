// Scheduling Model - handles clinical scheduling and assignments
const { pool } = require('../config/database');

class SchedulingModel {
  // Get all available clinical slots
  static async getAvailableSlots(startDate, endDate) {
    try {
      const result = await pool.query(`
        SELECT 
          slot_id,
          site_id,
          (SELECT site_name FROM clinical_sites WHERE site_id = clinical_slots.site_id) as site_name,
          slot_date,
          start_time,
          end_time,
          max_students,
          (SELECT COUNT(*) FROM clinical_assignments WHERE slot_id = clinical_slots.slot_id) as assigned_students,
          preceptor_name,
          notes,
          is_active,
          created_at,
          updated_at
        FROM clinical_slots
        WHERE 
          is_active = true AND
          slot_date >= $1 AND
          slot_date <= $2 AND
          (SELECT COUNT(*) FROM clinical_assignments WHERE slot_id = clinical_slots.slot_id) < max_students
        ORDER BY slot_date ASC, start_time ASC
      `, [startDate, endDate]);
      
      return result.rows;
    } catch (error) {
      console.error('Database error in getAvailableSlots:', error);
      throw new Error('Failed to retrieve available clinical slots');
    }
  }

  // Get slot by ID
  static async getSlotById(slotId) {
    try {
      const result = await pool.query(`
        SELECT 
          slot_id,
          site_id,
          (SELECT site_name FROM clinical_sites WHERE site_id = clinical_slots.site_id) as site_name,
          slot_date,
          start_time,
          end_time,
          max_students,
          (SELECT COUNT(*) FROM clinical_assignments WHERE slot_id = clinical_slots.slot_id) as assigned_students,
          preceptor_name,
          notes,
          is_active,
          created_at,
          updated_at
        FROM clinical_slots
        WHERE slot_id = $1
      `, [slotId]);
      
      if (result.rows.length === 0) {
        throw new Error(`Clinical slot with ID ${slotId} not found`);
      }
      
      return result.rows[0];
    } catch (error) {
      console.error(`Database error in getSlotById(${slotId}):`, error);
      throw error;
    }
  }

  // Create a new clinical slot
  static async createSlot(siteId, slotDate, startTime, endTime, maxStudents, preceptorName, notes, isActive = true) {
    try {
      // Verify that the site exists and is active
      const siteExists = await pool.query(`
        SELECT site_id FROM clinical_sites WHERE site_id = $1 AND is_active = true
      `, [siteId]);
      
      if (siteExists.rows.length === 0) {
        throw new Error(`Clinical site with ID ${siteId} not found or is inactive`);
      }
      
      const result = await pool.query(`
        INSERT INTO clinical_slots (
          site_id,
          slot_date,
          start_time,
          end_time,
          max_students,
          preceptor_name,
          notes,
          is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING slot_id
      `, [siteId, slotDate, startTime, endTime, maxStudents, preceptorName, notes, isActive]);
      
      return { slot_id: result.rows[0].slot_id };
    } catch (error) {
      console.error('Database error in createSlot:', error);
      throw error;
    }
  }

  // Update a clinical slot
  static async updateSlot(slotId, siteId, slotDate, startTime, endTime, maxStudents, preceptorName, notes, isActive) {
    try {
      // Check if the slot exists
      const slotExists = await pool.query(`
        SELECT slot_id FROM clinical_slots WHERE slot_id = $1
      `, [slotId]);
      
      if (slotExists.rows.length === 0) {
        throw new Error(`Clinical slot with ID ${slotId} not found`);
      }
      
      // Check if we can reduce max_students if there are assignments
      if (maxStudents !== undefined) {
        const assignmentCount = await pool.query(`
          SELECT COUNT(*) as count FROM clinical_assignments WHERE slot_id = $1
        `, [slotId]);
        
        if (parseInt(assignmentCount.rows[0].count) > maxStudents) {
          throw new Error(`Cannot reduce max students below current assignment count (${assignmentCount.rows[0].count})`);
        }
      }
      
      // If changing site, verify the new site exists and is active
      if (siteId) {
        const siteExists = await pool.query(`
          SELECT site_id FROM clinical_sites WHERE site_id = $1 AND is_active = true
        `, [siteId]);
        
        if (siteExists.rows.length === 0) {
          throw new Error(`Clinical site with ID ${siteId} not found or is inactive`);
        }
      }
      
      const result = await pool.query(`
        UPDATE clinical_slots
        SET 
          site_id = COALESCE($2, site_id),
          slot_date = COALESCE($3, slot_date),
          start_time = COALESCE($4, start_time),
          end_time = COALESCE($5, end_time),
          max_students = COALESCE($6, max_students),
          preceptor_name = COALESCE($7, preceptor_name),
          notes = COALESCE($8, notes),
          is_active = COALESCE($9, is_active),
          updated_at = NOW()
        WHERE slot_id = $1
        RETURNING slot_id
      `, [slotId, siteId, slotDate, startTime, endTime, maxStudents, preceptorName, notes, isActive]);
      
      if (result.rows.length === 0) {
        throw new Error(`Failed to update clinical slot with ID ${slotId}`);
      }
      
      return { slot_id: result.rows[0].slot_id, success: true };
    } catch (error) {
      console.error(`Database error in updateSlot(${slotId}):`, error);
      throw error;
    }
  }

  // Delete a clinical slot (if no assignments exist)
  static async deleteSlot(slotId) {
    try {
      // Check if there are any assignments for this slot
      const assignmentCount = await pool.query(`
        SELECT COUNT(*) as count FROM clinical_assignments WHERE slot_id = $1
      `, [slotId]);
      
      if (parseInt(assignmentCount.rows[0].count) > 0) {
        throw new Error(`Cannot delete slot with existing assignments (${assignmentCount.rows[0].count} found)`);
      }
      
      const result = await pool.query(`
        DELETE FROM clinical_slots
        WHERE slot_id = $1
        RETURNING slot_id
      `, [slotId]);
      
      if (result.rows.length === 0) {
        throw new Error(`Clinical slot with ID ${slotId} not found`);
      }
      
      return { success: true };
    } catch (error) {
      console.error(`Database error in deleteSlot(${slotId}):`, error);
      throw error;
    }
  }

  // Get student's preferences for clinical slots
  static async getStudentPreferences(studentId) {
    try {
      const result = await pool.query(`
        SELECT 
          sp.preference_id,
          sp.student_id,
          sp.slot_id,
          sp.rank,
          sp.created_at,
          cs.slot_date,
          cs.start_time,
          cs.end_time,
          cs.site_id,
          (SELECT site_name FROM clinical_sites WHERE site_id = cs.site_id) as site_name
        FROM student_preferences sp
        JOIN clinical_slots cs ON sp.slot_id = cs.slot_id
        WHERE sp.student_id = $1
        ORDER BY sp.rank ASC
      `, [studentId]);
      
      return result.rows;
    } catch (error) {
      console.error(`Database error in getStudentPreferences(${studentId}):`, error);
      throw new Error('Failed to retrieve student preferences');
    }
  }

  // Add or update student preference for a clinical slot
  static async setStudentPreference(studentId, slotId, rank) {
    try {
      // Verify student exists
      const studentExists = await pool.query(`
        SELECT user_id FROM users WHERE user_id = $1 AND role = 'student'
      `, [studentId]);
      
      if (studentExists.rows.length === 0) {
        throw new Error(`Student with ID ${studentId} not found or is not a student`);
      }
      
      // Verify slot exists and is active
      const slotExists = await pool.query(`
        SELECT slot_id FROM clinical_slots WHERE slot_id = $1 AND is_active = true
      `, [slotId]);
      
      if (slotExists.rows.length === 0) {
        throw new Error(`Clinical slot with ID ${slotId} not found or is inactive`);
      }
      
      // Check if preference already exists
      const existingPreference = await pool.query(`
        SELECT preference_id, rank FROM student_preferences 
        WHERE student_id = $1 AND slot_id = $2
      `, [studentId, slotId]);
      
      // If updating existing preference
      if (existingPreference.rows.length > 0) {
        // Handle rank change - need to adjust other ranks
        if (existingPreference.rows[0].rank !== rank) {
          // If moving to higher priority (lower rank number)
          if (rank < existingPreference.rows[0].rank) {
            await pool.query(`
              UPDATE student_preferences
              SET rank = rank + 1
              WHERE student_id = $1 AND rank >= $2 AND rank < $3
            `, [studentId, rank, existingPreference.rows[0].rank]);
          } 
          // If moving to lower priority (higher rank number)
          else if (rank > existingPreference.rows[0].rank) {
            await pool.query(`
              UPDATE student_preferences
              SET rank = rank - 1
              WHERE student_id = $1 AND rank > $2 AND rank <= $3
            `, [studentId, existingPreference.rows[0].rank, rank]);
          }
          
          // Update the preference rank
          await pool.query(`
            UPDATE student_preferences
            SET rank = $3
            WHERE student_id = $1 AND slot_id = $2
          `, [studentId, slotId, rank]);
        }
        
        return { 
          preference_id: existingPreference.rows[0].preference_id,
          updated: true 
        };
      } 
      // If creating new preference
      else {
        // Make room for the new preference by incrementing ranks
        await pool.query(`
          UPDATE student_preferences
          SET rank = rank + 1
          WHERE student_id = $1 AND rank >= $2
        `, [studentId, rank]);
        
        // Insert the new preference
        const result = await pool.query(`
          INSERT INTO student_preferences (student_id, slot_id, rank)
          VALUES ($1, $2, $3)
          RETURNING preference_id
        `, [studentId, slotId, rank]);
        
        return { 
          preference_id: result.rows[0].preference_id,
          created: true 
        };
      }
    } catch (error) {
      console.error(`Database error in setStudentPreference(${studentId}, ${slotId}, ${rank}):`, error);
      throw error;
    }
  }

  // Delete student preference
  static async deleteStudentPreference(studentId, slotId) {
    try {
      // Get the current rank of the preference
      const currentRank = await pool.query(`
        SELECT rank FROM student_preferences 
        WHERE student_id = $1 AND slot_id = $2
      `, [studentId, slotId]);
      
      if (currentRank.rows.length === 0) {
        throw new Error(`Preference for student ${studentId} and slot ${slotId} not found`);
      }
      
      // Delete the preference
      const result = await pool.query(`
        DELETE FROM student_preferences
        WHERE student_id = $1 AND slot_id = $2
        RETURNING preference_id
      `, [studentId, slotId]);
      
      // Adjust ranks of remaining preferences
      await pool.query(`
        UPDATE student_preferences
        SET rank = rank - 1
        WHERE student_id = $1 AND rank > $2
      `, [studentId, currentRank.rows[0].rank]);
      
      return { success: true };
    } catch (error) {
      console.error(`Database error in deleteStudentPreference(${studentId}, ${slotId}):`, error);
      throw error;
    }
  }

  // Assign student to a clinical slot
  static async assignStudentToSlot(studentId, slotId, assignedBy, notes = null) {
    try {
      // Verify student exists
      const studentExists = await pool.query(`
        SELECT user_id FROM users WHERE user_id = $1 AND role = 'student'
      `, [studentId]);
      
      if (studentExists.rows.length === 0) {
        throw new Error(`Student with ID ${studentId} not found or is not a student`);
      }
      
      // Verify slot exists, is active, and has capacity
      const slotInfo = await pool.query(`
        SELECT 
          s.slot_id, 
          s.max_students,
          s.slot_date,
          s.start_time,
          s.end_time,
          (SELECT COUNT(*) FROM clinical_assignments WHERE slot_id = s.slot_id) as current_assignments
        FROM clinical_slots s
        WHERE s.slot_id = $1 AND s.is_active = true
      `, [slotId]);
      
      if (slotInfo.rows.length === 0) {
        throw new Error(`Clinical slot with ID ${slotId} not found or is inactive`);
      }
      
      if (slotInfo.rows[0].current_assignments >= slotInfo.rows[0].max_students) {
        throw new Error(`Clinical slot with ID ${slotId} is already at maximum capacity`);
      }
      
      // Check if student is already assigned to this slot
      const existingAssignment = await pool.query(`
        SELECT assignment_id FROM clinical_assignments 
        WHERE student_id = $1 AND slot_id = $2
      `, [studentId, slotId]);
      
      if (existingAssignment.rows.length > 0) {
        throw new Error(`Student with ID ${studentId} is already assigned to slot with ID ${slotId}`);
      }
      
      // Check if student is already assigned to another slot at the same time
      const conflictingAssignment = await pool.query(`
        SELECT 
          ca.assignment_id,
          cs.slot_date,
          cs.start_time,
          cs.end_time
        FROM clinical_assignments ca
        JOIN clinical_slots cs ON ca.slot_id = cs.slot_id
        WHERE 
          ca.student_id = $1 AND
          cs.slot_date = $2 AND
          (
            (cs.start_time <= $3 AND cs.end_time > $3) OR
            (cs.start_time < $4 AND cs.end_time >= $4) OR
            (cs.start_time >= $3 AND cs.end_time <= $4)
          )
      `, [
        studentId, 
        slotInfo.rows[0].slot_date, 
        slotInfo.rows[0].start_time, 
        slotInfo.rows[0].end_time
      ]);
      
      if (conflictingAssignment.rows.length > 0) {
        throw new Error(`Student with ID ${studentId} already has a clinical assignment during this time period`);
      }
      
      // Create the assignment
      const result = await pool.query(`
        INSERT INTO clinical_assignments (
          student_id,
          slot_id,
          assigned_by,
          notes
        ) VALUES ($1, $2, $3, $4)
        RETURNING assignment_id
      `, [studentId, slotId, assignedBy, notes]);
      
      return { assignment_id: result.rows[0].assignment_id };
    } catch (error) {
      console.error(`Database error in assignStudentToSlot(${studentId}, ${slotId}):`, error);
      throw error;
    }
  }

  // Remove student assignment from a clinical slot
  static async removeAssignment(assignmentId) {
    try {
      const result = await pool.query(`
        DELETE FROM clinical_assignments
        WHERE assignment_id = $1
        RETURNING assignment_id
      `, [assignmentId]);
      
      if (result.rows.length === 0) {
        throw new Error(`Clinical assignment with ID ${assignmentId} not found`);
      }
      
      return { success: true };
    } catch (error) {
      console.error(`Database error in removeAssignment(${assignmentId}):`, error);
      throw error;
    }
  }

  // Get all assignments for a student
  static async getStudentAssignments(studentId) {
    try {
      const result = await pool.query(`
        SELECT 
          ca.assignment_id,
          ca.student_id,
          ca.slot_id,
          ca.assigned_by,
          ca.notes,
          ca.created_at,
          cs.slot_date,
          cs.start_time,
          cs.end_time,
          cs.site_id,
          (SELECT site_name FROM clinical_sites WHERE site_id = cs.site_id) as site_name,
          cs.preceptor_name,
          (SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE user_id = ca.assigned_by) as assigned_by_name
        FROM clinical_assignments ca
        JOIN clinical_slots cs ON ca.slot_id = cs.slot_id
        WHERE ca.student_id = $1
        ORDER BY cs.slot_date ASC, cs.start_time ASC
      `, [studentId]);
      
      return result.rows;
    } catch (error) {
      console.error(`Database error in getStudentAssignments(${studentId}):`, error);
      throw new Error('Failed to retrieve student assignments');
    }
  }

  // Get all assignments for a slot
  static async getSlotAssignments(slotId) {
    try {
      const result = await pool.query(`
        SELECT 
          ca.assignment_id,
          ca.student_id,
          ca.slot_id,
          ca.assigned_by,
          ca.notes,
          ca.created_at,
          (SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE user_id = ca.student_id) as student_name,
          (SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE user_id = ca.assigned_by) as assigned_by_name
        FROM clinical_assignments ca
        WHERE ca.slot_id = $1
        ORDER BY ca.created_at ASC
      `, [slotId]);
      
      return result.rows;
    } catch (error) {
      console.error(`Database error in getSlotAssignments(${slotId}):`, error);
      throw new Error('Failed to retrieve slot assignments');
    }
  }

  // Auto-assign students based on preferences
  static async autoAssignStudents(slotIds, assignedBy) {
    try {
      let assignments = [];
      
      // For each slot, find students who have it as a preference and assign them
      for (const slotId of slotIds) {
        // Get slot information and current assignment count
        const slotInfo = await pool.query(`
          SELECT 
            slot_id, 
            max_students,
            (SELECT COUNT(*) FROM clinical_assignments WHERE slot_id = clinical_slots.slot_id) as current_assignments
          FROM clinical_slots
          WHERE slot_id = $1 AND is_active = true
        `, [slotId]);
        
        if (slotInfo.rows.length === 0 || !slotInfo.rows[0].is_active) {
          continue; // Skip inactive or non-existent slots
        }
        
        const availableSpots = slotInfo.rows[0].max_students - slotInfo.rows[0].current_assignments;
        
        if (availableSpots <= 0) {
          continue; // Skip slots that are already full
        }
        
        // Find students who have this slot as a preference, ordered by rank
        const studentPreferences = await pool.query(`
          SELECT 
            sp.student_id,
            sp.rank
          FROM student_preferences sp
          WHERE 
            sp.slot_id = $1 AND
            NOT EXISTS (
              SELECT 1 FROM clinical_assignments ca
              WHERE ca.student_id = sp.student_id AND ca.slot_id = sp.slot_id
            )
          ORDER BY sp.rank ASC
        `, [slotId]);
        
        // Assign students until we run out of spots or students
        for (let i = 0; i < Math.min(availableSpots, studentPreferences.rows.length); i++) {
          try {
            // Check if student already has a conflicting assignment
            const student = studentPreferences.rows[i];
            
            // Try to assign the student
            const assignment = await this.assignStudentToSlot(
              student.student_id, 
              slotId, 
              assignedBy, 
              `Auto-assigned based on student preference (rank ${student.rank})`
            );
            
            assignments.push({
              student_id: student.student_id,
              slot_id: slotId,
              assignment_id: assignment.assignment_id,
              rank: student.rank
            });
          } catch (error) {
            // Log error but continue with next student
            console.error(`Failed to auto-assign student ${studentPreferences.rows[i].student_id} to slot ${slotId}:`, error.message);
          }
        }
      }
      
      return { 
        success: true, 
        assignments_created: assignments.length,
        assignments 
      };
    } catch (error) {
      console.error('Database error in autoAssignStudents:', error);
      throw error;
    }
  }
}

module.exports = SchedulingModel;
