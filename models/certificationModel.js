// Certification Levels model - handles database operations for certification levels
const { connectToDb } = require('../config/database');

class CertificationModel {
  // Get all certification levels
  static async getAllLevels() {
    let client;
    try {
      client = await connectToDb();
      const result = await client.query(`
        SELECT level_id, level_name, description, is_active 
        FROM certification_levels
        ORDER BY level_name
      `);
      return result.rows;
    } catch (error) {
      console.error('Error fetching certification levels:', error);
      throw error;
    } finally {
      if (client) await client.end();
    }
  }

  // Get a specific certification level by ID
  static async getLevelById(levelId) {
    let client;
    try {
      client = await connectToDb();
      const result = await client.query(`
        SELECT level_id, level_name, description, is_active
        FROM certification_levels
        WHERE level_id = $1
      `, [levelId]);
      
      return result.rows[0];
    } catch (error) {
      console.error(`Error fetching certification level ${levelId}:`, error);
      throw error;
    } finally {
      if (client) await client.end();
    }
  }

  // Add a new certification level
  static async addLevel(levelName, description, isActive) {
    let client;
    try {
      client = await connectToDb();
      
      // Check if level name already exists
      const checkResult = await client.query(`
        SELECT level_id FROM certification_levels WHERE level_name = $1
      `, [levelName]);
      
      if (checkResult.rows.length > 0) {
        throw new Error('A certification level with this name already exists');
      }
      
      const result = await client.query(`
        INSERT INTO certification_levels (level_name, description, is_active)
        VALUES ($1, $2, $3)
        RETURNING level_id
      `, [levelName, description || null, isActive === undefined ? true : isActive]);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error adding certification level:', error);
      throw error;
    } finally {
      if (client) await client.end();
    }
  }

  // Update an existing certification level
  static async updateLevel(levelId, levelName, description, isActive) {
    let client;
    try {
      client = await connectToDb();
      
      // Check if level exists
      const checkResult = await client.query(`
        SELECT level_id FROM certification_levels WHERE level_id = $1
      `, [levelId]);
      
      if (checkResult.rows.length === 0) {
        throw new Error('Certification level not found');
      }
      
      // Check if updated name would cause a duplicate
      const duplicateCheck = await client.query(`
        SELECT level_id FROM certification_levels 
        WHERE level_name = $1 AND level_id != $2
      `, [levelName, levelId]);
      
      if (duplicateCheck.rows.length > 0) {
        throw new Error('A certification level with this name already exists');
      }
      
      const result = await client.query(`
        UPDATE certification_levels
        SET level_name = $1, description = $2, is_active = $3
        WHERE level_id = $4
        RETURNING level_id, level_name, description, is_active
      `, [levelName, description, isActive, levelId]);
      
      return result.rows[0];
    } catch (error) {
      console.error(`Error updating certification level ${levelId}:`, error);
      throw error;
    } finally {
      if (client) await client.end();
    }
  }

  // Toggle the active status of a certification level
  static async toggleLevelStatus(levelId) {
    let client;
    try {
      client = await connectToDb();
      
      // Check if level exists and get current status
      const checkResult = await client.query(`
        SELECT is_active FROM certification_levels WHERE level_id = $1
      `, [levelId]);
      
      if (checkResult.rows.length === 0) {
        throw new Error('Certification level not found');
      }
      
      const currentStatus = checkResult.rows[0].is_active;
      
      // Toggle the status
      const result = await client.query(`
        UPDATE certification_levels
        SET is_active = $1
        WHERE level_id = $2
        RETURNING level_id, level_name, description, is_active
      `, [!currentStatus, levelId]);
      
      return result.rows[0];
    } catch (error) {
      console.error(`Error toggling certification level ${levelId} status:`, error);
      throw error;
    } finally {
      if (client) await client.end();
    }
  }

  // Import certification levels from CSV
  static async importLevels(csvRows, updateExisting) {
    let client;
    let added = 0;
    let updated = 0;
    let skipped = 0;
    
    try {
      client = await connectToDb();
      
      // Start transaction
      await client.query('BEGIN');
      
      // Process each row
      for (let i = 0; i < csvRows.length; i++) {
        // Skip header row if present
        if (i === 0 && csvRows[i].toLowerCase().includes('level_name')) {
          continue;
        }
        
        const columns = csvRows[i].split(',').map(col => col.trim());
        
        if (columns.length < 1) {
          continue; // Skip empty rows
        }
        
        const levelName = columns[0];
        const description = columns[1] || null;
        const isActive = columns[2] ? columns[2].toLowerCase() === 'true' : true;
        
        // Check if level already exists
        const checkResult = await client.query(`
          SELECT level_id FROM certification_levels WHERE level_name = $1
        `, [levelName]);
        
        if (checkResult.rows.length > 0) {
          // Update existing level if option is enabled
          if (updateExisting) {
            await client.query(`
              UPDATE certification_levels
              SET description = $1, is_active = $2
              WHERE level_name = $3
            `, [description, isActive, levelName]);
            updated++;
          } else {
            skipped++;
          }
        } else {
          // Insert new level
          await client.query(`
            INSERT INTO certification_levels (level_name, description, is_active)
            VALUES ($1, $2, $3)
          `, [levelName, description, isActive]);
          added++;
        }
      }
      
      // Commit transaction
      await client.query('COMMIT');
      
      return { added, updated, skipped };
    } catch (error) {
      // Rollback transaction on error
      if (client) {
        await client.query('ROLLBACK');
      }
      
      console.error('Error importing certification levels:', error);
      throw error;
    } finally {
      if (client) await client.end();
    }
  }
}

module.exports = CertificationModel;
