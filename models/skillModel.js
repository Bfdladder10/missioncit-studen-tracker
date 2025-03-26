// Skills Model - handles database operations for skills and skill tracking
const { connectToDb } = require('../config/database');

class SkillModel {
  // Get all skills
  static async getAllSkills() {
    let client;
    try {
      client = await connectToDb();
      const result = await client.query(`
        SELECT s.skill_id, s.skill_name, s.description, s.is_active, 
               c.category_id, c.category_name
        FROM skills s
        LEFT JOIN skill_categories c ON s.category_id = c.category_id
        ORDER BY c.category_name, s.skill_name
      `);
      return result.rows;
    } catch (error) {
      console.error('Error fetching skills:', error);
      throw error;
    } finally {
      if (client) await client.end();
    }
  }

  // Get skills for a specific certification level
  static async getSkillsForLevel(levelId) {
    let client;
    try {
      client = await connectToDb();
      const result = await client.query(`
        SELECT s.skill_id, s.skill_name, s.description, 
               c.category_id, c.category_name,
               cs.repetitions_required, cs.is_required
        FROM certification_skills cs
        JOIN skills s ON cs.skill_id = s.skill_id
        LEFT JOIN skill_categories c ON s.category_id = c.category_id
        WHERE cs.certification_level_id = $1 AND cs.is_active = true AND s.is_active = true
        ORDER BY c.category_name, s.skill_name
      `, [levelId]);
      return result.rows;
    } catch (error) {
      console.error(`Error fetching skills for level ${levelId}:`, error);
      throw error;
    } finally {
      if (client) await client.end();
    }
  }

  // Get skill categories
  static async getSkillCategories() {
    let client;
    try {
      client = await connectToDb();
      const result = await client.query(`
        SELECT category_id, category_name, description
        FROM skill_categories
        ORDER BY category_name
      `);
      return result.rows;
    } catch (error) {
      console.error('Error fetching skill categories:', error);
      throw error;
    } finally {
      if (client) await client.end();
    }
  }

  // Add a new skill
  static async addSkill(skillName, description, categoryId, isActive = true) {
    let client;
    try {
      client = await connectToDb();
      
      // Check if skill name already exists
      const checkResult = await client.query(`
        SELECT skill_id FROM skills WHERE skill_name = $1
      `, [skillName]);
      
      if (checkResult.rows.length > 0) {
        throw new Error('A skill with this name already exists');
      }
      
      const result = await client.query(`
        INSERT INTO skills (skill_name, description, category_id, is_active)
        VALUES ($1, $2, $3, $4)
        RETURNING skill_id
      `, [skillName, description, categoryId, isActive]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error adding skill:', error);
      throw error;
    } finally {
      if (client) await client.end();
    }
  }

  // Update a skill
  static async updateSkill(skillId, skillName, description, categoryId, isActive) {
    let client;
    try {
      client = await connectToDb();
      
      // Check if skill exists
      const checkResult = await client.query(`
        SELECT skill_id FROM skills WHERE skill_id = $1
      `, [skillId]);
      
      if (checkResult.rows.length === 0) {
        throw new Error('Skill not found');
      }
      
      // Check if updated name would cause a duplicate
      const duplicateCheck = await client.query(`
        SELECT skill_id FROM skills 
        WHERE skill_name = $1 AND skill_id != $2
      `, [skillName, skillId]);
      
      if (duplicateCheck.rows.length > 0) {
        throw new Error('A skill with this name already exists');
      }
      
      const result = await client.query(`
        UPDATE skills
        SET skill_name = $1, description = $2, category_id = $3, is_active = $4
        WHERE skill_id = $5
        RETURNING skill_id, skill_name, description, category_id, is_active
      `, [skillName, description, categoryId, isActive, skillId]);
      
      return result.rows[0];
    } catch (error) {
      console.error(`Error updating skill ${skillId}:`, error);
      throw error;
    } finally {
      if (client) await client.end();
    }
  }

  // Toggle skill active status
  static async toggleSkillStatus(skillId) {
    let client;
    try {
      client = await connectToDb();
      
      // Check if skill exists and get current status
      const checkResult = await client.query(`
        SELECT is_active FROM skills WHERE skill_id = $1
      `, [skillId]);
      
      if (checkResult.rows.length === 0) {
        throw new Error('Skill not found');
      }
      
      const currentStatus = checkResult.rows[0].is_active;
      
      // Toggle the status
      const result = await client.query(`
        UPDATE skills
        SET is_active = $1
        WHERE skill_id = $2
        RETURNING skill_id, skill_name, description, category_id, is_active
      `, [!currentStatus, skillId]);
      
      return result.rows[0];
    } catch (error) {
      console.error(`Error toggling skill ${skillId} status:`, error);
      throw error;
    } finally {
      if (client) await client.end();
    }
  }

  // Add or update skill requirement for a certification level
  static async setSkillForLevel(levelId, skillId, repetitionsRequired, isRequired = true) {
    let client;
    try {
      client = await connectToDb();
      
      // Check if certification level exists
      const levelCheck = await client.query(`
        SELECT level_id FROM certification_levels WHERE level_id = $1
      `, [levelId]);
      
      if (levelCheck.rows.length === 0) {
        throw new Error('Certification level not found');
      }
      
      // Check if skill exists
      const skillCheck = await client.query(`
        SELECT skill_id FROM skills WHERE skill_id = $1
      `, [skillId]);
      
      if (skillCheck.rows.length === 0) {
        throw new Error('Skill not found');
      }
      
      // Check if mapping already exists
      const mappingCheck = await client.query(`
        SELECT cert_skill_id FROM certification_skills 
        WHERE certification_level_id = $1 AND skill_id = $2
      `, [levelId, skillId]);
      
      let result;
      
      if (mappingCheck.rows.length > 0) {
        // Update existing mapping
        result = await client.query(`
          UPDATE certification_skills
          SET repetitions_required = $1, is_required = $2, is_active = true
          WHERE certification_level_id = $3 AND skill_id = $4
          RETURNING cert_skill_id
        `, [repetitionsRequired, isRequired, levelId, skillId]);
      } else {
        // Insert new mapping
        result = await client.query(`
          INSERT INTO certification_skills (certification_level_id, skill_id, repetitions_required, is_required)
          VALUES ($1, $2, $3, $4)
          RETURNING cert_skill_id
        `, [levelId, skillId, repetitionsRequired, isRequired]);
      }
      
      return result.rows[0];
    } catch (error) {
      console.error(`Error setting skill ${skillId} for level ${levelId}:`, error);
      throw error;
    } finally {
      if (client) await client.end();
    }
  }

  // Remove skill from certification level
  static async removeSkillFromLevel(levelId, skillId) {
    let client;
    try {
      client = await connectToDb();
      
      // Set is_active to false rather than deleting the record
      const result = await client.query(`
        UPDATE certification_skills
        SET is_active = false
        WHERE certification_level_id = $1 AND skill_id = $2
        RETURNING cert_skill_id
      `, [levelId, skillId]);
      
      if (result.rows.length === 0) {
        throw new Error('Skill not found for this certification level');
      }
      
      return { success: true };
    } catch (error) {
      console.error(`Error removing skill ${skillId} from level ${levelId}:`, error);
      throw error;
    } finally {
      if (client) await client.end();
    }
  }

  // Get student's skill progress
  static async getStudentSkillProgress(studentId) {
    let client;
    try {
      client = await connectToDb();
      
      // Get student's certification level
      const studentLevel = await client.query(`
        SELECT certification_level_id 
        FROM students 
        WHERE student_id = $1
      `, [studentId]);
      
      if (studentLevel.rows.length === 0 || !studentLevel.rows[0].certification_level_id) {
        return { completed: 0, total: 0, percentage: 0, skills: [] };
      }
      
      const levelId = studentLevel.rows[0].certification_level_id;
      
      // Get all required skills for the student's level
      const requiredSkills = await client.query(`
        SELECT cs.skill_id, s.skill_name, cs.repetitions_required, c.category_name,
               (SELECT COUNT(*) FROM student_skills 
                WHERE student_id = $1 AND skill_id = cs.skill_id AND is_successful = true) as completions
        FROM certification_skills cs
        JOIN skills s ON cs.skill_id = s.skill_id
        LEFT JOIN skill_categories c ON s.category_id = c.category_id
        WHERE cs.certification_level_id = $2 
          AND cs.is_active = true 
          AND s.is_active = true
        ORDER BY c.category_name, s.skill_name
      `, [studentId, levelId]);
      
      // Calculate progress
      const skills = requiredSkills.rows.map(skill => {
        const completed = parseInt(skill.completions) >= parseInt(skill.repetitions_required);
        return {
          ...skill,
          completed,
          completion_percentage: Math.min(100, Math.round((parseInt(skill.completions) / parseInt(skill.repetitions_required)) * 100))
        };
      });
      
      const totalSkills = skills.length;
      const completedSkills = skills.filter(skill => skill.completed).length;
      const percentage = totalSkills > 0 ? Math.round((completedSkills / totalSkills) * 100) : 0;
      
      return {
        completed: completedSkills,
        total: totalSkills,
        percentage,
        skills
      };
    } catch (error) {
      console.error(`Error getting skill progress for student ${studentId}:`, error);
      throw error;
    } finally {
      if (client) await client.end();
    }
  }

  // Log a skill completion
  static async logSkillCompletion(studentId, skillId, location, notes, isSuccessful = true) {
    let client;
    try {
      client = await connectToDb();
      
      const result = await client.query(`
        INSERT INTO student_skills (student_id, skill_id, location, notes, is_successful)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING completion_id
      `, [studentId, skillId, location, notes, isSuccessful]);
      
      return result.rows[0];
    } catch (error) {
      console.error(`Error logging skill completion for student ${studentId}:`, error);
      throw error;
    } finally {
      if (client) await client.end();
    }
  }

  // Get student's skill completions for a specific skill
  static async getSkillCompletions(studentId, skillId) {
    let client;
    try {
      client = await connectToDb();
      
      const result = await client.query(`
        SELECT completion_id, completion_date, location, notes, is_successful, 
               verified_by, verified_at
        FROM student_skills
        WHERE student_id = $1 AND skill_id = $2
        ORDER BY completion_date DESC
      `, [studentId, skillId]);
      
      return result.rows;
    } catch (error) {
      console.error(`Error getting skill completions for student ${studentId}, skill ${skillId}:`, error);
      throw error;
    } finally {
      if (client) await client.end();
    }
  }
}

module.exports = SkillModel;
