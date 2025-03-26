// Clinical Model - handles clinical sites and student clinical logs
const { pool } = require('../config/database');

class ClinicalModel {
  // Get all clinical sites
  static async getAllClinicalSites() {
    try {
      const result = await pool.query(`
        SELECT 
          site_id, 
          site_name, 
          address, 
          city, 
          state, 
          zip, 
          contact_name, 
          contact_phone, 
          contact_email, 
          is_active,
          notes,
          created_at,
          updated_at
        FROM clinical_sites
        ORDER BY site_name ASC
      `);
      
      return result.rows;
    } catch (error) {
      console.error('Database error in getAllClinicalSites:', error);
      throw new Error('Failed to retrieve clinical sites');
    }
  }

  // Get active clinical sites
  static async getActiveClinicalSites() {
    try {
      const result = await pool.query(`
        SELECT 
          site_id, 
          site_name, 
          address, 
          city, 
          state, 
          zip, 
          contact_name, 
          contact_phone, 
          contact_email,
          notes
        FROM clinical_sites
        WHERE is_active = true
        ORDER BY site_name ASC
      `);
      
      return result.rows;
    } catch (error) {
      console.error('Database error in getActiveClinicalSites:', error);
      throw new Error('Failed to retrieve active clinical sites');
    }
  }

  // Get clinical site by ID
  static async getClinicalSiteById(siteId) {
    try {
      const result = await pool.query(`
        SELECT 
          site_id, 
          site_name, 
          address, 
          city, 
          state, 
          zip, 
          contact_name, 
          contact_phone, 
          contact_email, 
          is_active,
          notes,
          created_at,
          updated_at
        FROM clinical_sites
        WHERE site_id = $1
      `, [siteId]);
      
      if (result.rows.length === 0) {
        throw new Error(`Clinical site with ID ${siteId} not found`);
      }
      
      return result.rows[0];
    } catch (error) {
      console.error(`Database error in getClinicalSiteById(${siteId}):`, error);
      throw error;
    }
  }

  // Add a new clinical site
  static async addClinicalSite(siteName, address, city, state, zip, contactName, contactPhone, contactEmail, notes, isActive = true) {
    try {
      // Check if a site with the same name already exists
      const existingResult = await pool.query(`
        SELECT site_id FROM clinical_sites WHERE site_name = $1
      `, [siteName]);
      
      if (existingResult.rows.length > 0) {
        throw new Error(`A clinical site with the name '${siteName}' already exists`);
      }
      
      const result = await pool.query(`
        INSERT INTO clinical_sites (
          site_name, 
          address, 
          city, 
          state, 
          zip, 
          contact_name, 
          contact_phone, 
          contact_email, 
          notes,
          is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING site_id
      `, [siteName, address, city, state, zip, contactName, contactPhone, contactEmail, notes, isActive]);
      
      return { site_id: result.rows[0].site_id };
    } catch (error) {
      console.error('Database error in addClinicalSite:', error);
      throw error;
    }
  }

  // Update a clinical site
  static async updateClinicalSite(siteId, siteName, address, city, state, zip, contactName, contactPhone, contactEmail, notes, isActive) {
    try {
      // Check if the site exists
      const siteExists = await pool.query(`
        SELECT site_id FROM clinical_sites WHERE site_id = $1
      `, [siteId]);
      
      if (siteExists.rows.length === 0) {
        throw new Error(`Clinical site with ID ${siteId} not found`);
      }
      
      // Check if the new name conflicts with another site
      if (siteName) {
        const nameConflict = await pool.query(`
          SELECT site_id FROM clinical_sites 
          WHERE site_name = $1 AND site_id != $2
        `, [siteName, siteId]);
        
        if (nameConflict.rows.length > 0) {
          throw new Error(`A clinical site with the name '${siteName}' already exists`);
        }
      }
      
      const result = await pool.query(`
        UPDATE clinical_sites
        SET 
          site_name = COALESCE($2, site_name),
          address = COALESCE($3, address),
          city = COALESCE($4, city),
          state = COALESCE($5, state),
          zip = COALESCE($6, zip),
          contact_name = COALESCE($7, contact_name),
          contact_phone = COALESCE($8, contact_phone),
          contact_email = COALESCE($9, contact_email),
          notes = COALESCE($10, notes),
          is_active = COALESCE($11, is_active),
          updated_at = NOW()
        WHERE site_id = $1
        RETURNING site_id
      `, [siteId, siteName, address, city, state, zip, contactName, contactPhone, contactEmail, notes, isActive]);
      
      if (result.rows.length === 0) {
        throw new Error(`Failed to update clinical site with ID ${siteId}`);
      }
      
      return { site_id: result.rows[0].site_id, success: true };
    } catch (error) {
      console.error(`Database error in updateClinicalSite(${siteId}):`, error);
      throw error;
    }
  }

  // Toggle clinical site active status
  static async toggleClinicalSiteStatus(siteId) {
    try {
      const result = await pool.query(`
        UPDATE clinical_sites
        SET 
          is_active = NOT is_active,
          updated_at = NOW()
        WHERE site_id = $1
        RETURNING site_id, is_active
      `, [siteId]);
      
      if (result.rows.length === 0) {
        throw new Error(`Clinical site with ID ${siteId} not found`);
      }
      
      return {
        site_id: result.rows[0].site_id,
        is_active: result.rows[0].is_active,
        success: true
      };
    } catch (error) {
      console.error(`Database error in toggleClinicalSiteStatus(${siteId}):`, error);
      throw error;
    }
  }

  // Get clinical logs for a student
  static async getStudentClinicalLogs(studentId) {
    try {
      const result = await pool.query(`
        SELECT 
          cl.log_id,
          cl.student_id,
          cl.site_id,
          cs.site_name,
          cl.date,
          cl.hours,
          cl.preceptor_name,
          cl.patient_contacts,
          cl.notes,
          cl.created_at
        FROM clinical_logs cl
        JOIN clinical_sites cs ON cl.site_id = cs.site_id
        WHERE cl.student_id = $1
        ORDER BY cl.date DESC
      `, [studentId]);
      
      return result.rows;
    } catch (error) {
      console.error(`Database error in getStudentClinicalLogs(${studentId}):`, error);
      throw new Error('Failed to retrieve clinical logs');
    }
  }

  // Get clinical log by ID
  static async getClinicalLogById(logId) {
    try {
      const result = await pool.query(`
        SELECT 
          cl.log_id,
          cl.student_id,
          cl.site_id,
          cs.site_name,
          cl.date,
          cl.hours,
          cl.preceptor_name,
          cl.patient_contacts,
          cl.notes,
          cl.created_at
        FROM clinical_logs cl
        JOIN clinical_sites cs ON cl.site_id = cs.site_id
        WHERE cl.log_id = $1
      `, [logId]);
      
      if (result.rows.length === 0) {
        throw new Error(`Clinical log with ID ${logId} not found`);
      }
      
      return result.rows[0];
    } catch (error) {
      console.error(`Database error in getClinicalLogById(${logId}):`, error);
      throw error;
    }
  }

  // Add a new clinical log
  static async addClinicalLog(studentId, siteId, date, hours, preceptorName, patientContacts, notes) {
    try {
      // Validate the site exists
      const siteResult = await pool.query(`
        SELECT site_id FROM clinical_sites WHERE site_id = $1 AND is_active = true
      `, [siteId]);
      
      if (siteResult.rows.length === 0) {
        throw new Error(`Clinical site with ID ${siteId} not found or is inactive`);
      }
      
      const result = await pool.query(`
        INSERT INTO clinical_logs (
          student_id,
          site_id,
          date,
          hours,
          preceptor_name,
          patient_contacts,
          notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING log_id
      `, [studentId, siteId, date, hours, preceptorName, patientContacts, notes]);
      
      return { log_id: result.rows[0].log_id };
    } catch (error) {
      console.error('Database error in addClinicalLog:', error);
      throw error;
    }
  }

  // Update a clinical log
  static async updateClinicalLog(logId, siteId, date, hours, preceptorName, patientContacts, notes) {
    try {
      // Check if the log exists and belongs to the student
      const logExists = await pool.query(`
        SELECT log_id FROM clinical_logs WHERE log_id = $1
      `, [logId]);
      
      if (logExists.rows.length === 0) {
        throw new Error(`Clinical log with ID ${logId} not found`);
      }
      
      // If we're updating the site, validate it exists
      if (siteId) {
        const siteResult = await pool.query(`
          SELECT site_id FROM clinical_sites WHERE site_id = $1 AND is_active = true
        `, [siteId]);
        
        if (siteResult.rows.length === 0) {
          throw new Error(`Clinical site with ID ${siteId} not found or is inactive`);
        }
      }
      
      const result = await pool.query(`
        UPDATE clinical_logs
        SET 
          site_id = COALESCE($2, site_id),
          date = COALESCE($3, date),
          hours = COALESCE($4, hours),
          preceptor_name = COALESCE($5, preceptor_name),
          patient_contacts = COALESCE($6, patient_contacts),
          notes = COALESCE($7, notes)
        WHERE log_id = $1
        RETURNING log_id
      `, [logId, siteId, date, hours, preceptorName, patientContacts, notes]);
      
      if (result.rows.length === 0) {
        throw new Error(`Failed to update clinical log with ID ${logId}`);
      }
      
      return { log_id: result.rows[0].log_id, success: true };
    } catch (error) {
      console.error(`Database error in updateClinicalLog(${logId}):`, error);
      throw error;
    }
  }

  // Delete a clinical log
  static async deleteClinicalLog(logId) {
    try {
      const result = await pool.query(`
        DELETE FROM clinical_logs
        WHERE log_id = $1
        RETURNING log_id
      `, [logId]);
      
      if (result.rows.length === 0) {
        throw new Error(`Clinical log with ID ${logId} not found`);
      }
      
      return { success: true };
    } catch (error) {
      console.error(`Database error in deleteClinicalLog(${logId}):`, error);
      throw error;
    }
  }

  // Get clinical hours summary for a student
  static async getStudentClinicalSummary(studentId) {
    try {
      const result = await pool.query(`
        SELECT 
          SUM(hours) as total_hours,
          COUNT(DISTINCT site_id) as unique_sites,
          SUM(patient_contacts) as total_patients
        FROM clinical_logs
        WHERE student_id = $1
      `, [studentId]);
      
      return result.rows[0] || { total_hours: 0, unique_sites: 0, total_patients: 0 };
    } catch (error) {
      console.error(`Database error in getStudentClinicalSummary(${studentId}):`, error);
      throw new Error('Failed to retrieve clinical summary');
    }
  }
}

module.exports = ClinicalModel;
