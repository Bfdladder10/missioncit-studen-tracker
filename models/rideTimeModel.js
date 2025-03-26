// Ride Time Model - handles student ride time with ambulance services
const { pool } = require('../config/database');

class RideTimeModel {
  // Get all ambulance services
  static async getAllServices() {
    try {
      const result = await pool.query(`
        SELECT 
          service_id, 
          service_name, 
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
        FROM ambulance_services
        ORDER BY service_name ASC
      `);
      
      return result.rows;
    } catch (error) {
      console.error('Database error in getAllServices:', error);
      throw new Error('Failed to retrieve ambulance services');
    }
  }

  // Get active ambulance services
  static async getActiveServices() {
    try {
      const result = await pool.query(`
        SELECT 
          service_id, 
          service_name, 
          address, 
          city, 
          state, 
          zip, 
          contact_name, 
          contact_phone, 
          contact_email,
          notes
        FROM ambulance_services
        WHERE is_active = true
        ORDER BY service_name ASC
      `);
      
      return result.rows;
    } catch (error) {
      console.error('Database error in getActiveServices:', error);
      throw new Error('Failed to retrieve active ambulance services');
    }
  }

  // Get service by ID
  static async getServiceById(serviceId) {
    try {
      const result = await pool.query(`
        SELECT 
          service_id, 
          service_name, 
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
        FROM ambulance_services
        WHERE service_id = $1
      `, [serviceId]);
      
      if (result.rows.length === 0) {
        throw new Error(`Ambulance service with ID ${serviceId} not found`);
      }
      
      return result.rows[0];
    } catch (error) {
      console.error(`Database error in getServiceById(${serviceId}):`, error);
      throw error;
    }
  }

  // Add a new ambulance service
  static async addService(serviceName, address, city, state, zip, contactName, contactPhone, contactEmail, notes, isActive = true) {
    try {
      // Check if a service with the same name already exists
      const existingResult = await pool.query(`
        SELECT service_id FROM ambulance_services WHERE service_name = $1
      `, [serviceName]);
      
      if (existingResult.rows.length > 0) {
        throw new Error(`An ambulance service with the name '${serviceName}' already exists`);
      }
      
      const result = await pool.query(`
        INSERT INTO ambulance_services (
          service_name, 
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
        RETURNING service_id
      `, [serviceName, address, city, state, zip, contactName, contactPhone, contactEmail, notes, isActive]);
      
      return { service_id: result.rows[0].service_id };
    } catch (error) {
      console.error('Database error in addService:', error);
      throw error;
    }
  }

  // Update an ambulance service
  static async updateService(serviceId, serviceName, address, city, state, zip, contactName, contactPhone, contactEmail, notes, isActive) {
    try {
      // Check if the service exists
      const serviceExists = await pool.query(`
        SELECT service_id FROM ambulance_services WHERE service_id = $1
      `, [serviceId]);
      
      if (serviceExists.rows.length === 0) {
        throw new Error(`Ambulance service with ID ${serviceId} not found`);
      }
      
      // Check if the new name conflicts with another service
      if (serviceName) {
        const nameConflict = await pool.query(`
          SELECT service_id FROM ambulance_services 
          WHERE service_name = $1 AND service_id != $2
        `, [serviceName, serviceId]);
        
        if (nameConflict.rows.length > 0) {
          throw new Error(`An ambulance service with the name '${serviceName}' already exists`);
        }
      }
      
      const result = await pool.query(`
        UPDATE ambulance_services
        SET 
          service_name = COALESCE($2, service_name),
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
        WHERE service_id = $1
        RETURNING service_id
      `, [serviceId, serviceName, address, city, state, zip, contactName, contactPhone, contactEmail, notes, isActive]);
      
      if (result.rows.length === 0) {
        throw new Error(`Failed to update ambulance service with ID ${serviceId}`);
      }
      
      return { service_id: result.rows[0].service_id, success: true };
    } catch (error) {
      console.error(`Database error in updateService(${serviceId}):`, error);
      throw error;
    }
  }

  // Toggle ambulance service active status
  static async toggleServiceStatus(serviceId) {
    try {
      const result = await pool.query(`
        UPDATE ambulance_services
        SET 
          is_active = NOT is_active,
          updated_at = NOW()
        WHERE service_id = $1
        RETURNING service_id, is_active
      `, [serviceId]);
      
      if (result.rows.length === 0) {
        throw new Error(`Ambulance service with ID ${serviceId} not found`);
      }
      
      return {
        service_id: result.rows[0].service_id,
        is_active: result.rows[0].is_active,
        success: true
      };
    } catch (error) {
      console.error(`Database error in toggleServiceStatus(${serviceId}):`, error);
      throw error;
    }
  }

  // Get ride time logs for a student
  static async getStudentRideLogs(studentId) {
    try {
      const result = await pool.query(`
        SELECT 
          rl.log_id,
          rl.student_id,
          rl.service_id,
          as.service_name,
          rl.date,
          rl.hours,
          rl.shift_type,
          rl.unit_type,
          rl.preceptor_name,
          rl.preceptor_license,
          rl.patient_contacts,
          rl.aed_used,
          rl.cpr_performed,
          rl.spinal_immobilization,
          rl.ventilations,
          rl.traction_splinting,
          rl.twelve_lead,
          rl.medication_administrations,
          rl.ivs_placed,
          rl.notes,
          rl.created_at
        FROM ride_time_logs rl
        JOIN ambulance_services as ON rl.service_id = as.service_id
        WHERE rl.student_id = $1
        ORDER BY rl.date DESC
      `, [studentId]);
      
      return result.rows;
    } catch (error) {
      console.error(`Database error in getStudentRideLogs(${studentId}):`, error);
      throw new Error('Failed to retrieve ride time logs');
    }
  }

  // Get ride log by ID
  static async getRideLogById(logId) {
    try {
      const result = await pool.query(`
        SELECT 
          rl.log_id,
          rl.student_id,
          rl.service_id,
          as.service_name,
          rl.date,
          rl.hours,
          rl.shift_type,
          rl.unit_type,
          rl.preceptor_name,
          rl.preceptor_license,
          rl.patient_contacts,
          rl.aed_used,
          rl.cpr_performed,
          rl.spinal_immobilization,
          rl.ventilations,
          rl.traction_splinting,
          rl.twelve_lead,
          rl.medication_administrations,
          rl.ivs_placed,
          rl.notes,
          rl.created_at
        FROM ride_time_logs rl
        JOIN ambulance_services as ON rl.service_id = as.service_id
        WHERE rl.log_id = $1
      `, [logId]);
      
      if (result.rows.length === 0) {
        throw new Error(`Ride time log with ID ${logId} not found`);
      }
      
      return result.rows[0];
    } catch (error) {
      console.error(`Database error in getRideLogById(${logId}):`, error);
      throw error;
    }
  }

  // Add a new ride time log
  static async addRideLog(
    studentId, 
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
  ) {
    try {
      // Validate the service exists
      const serviceResult = await pool.query(`
        SELECT service_id FROM ambulance_services WHERE service_id = $1 AND is_active = true
      `, [serviceId]);
      
      if (serviceResult.rows.length === 0) {
        throw new Error(`Ambulance service with ID ${serviceId} not found or is inactive`);
      }
      
      const result = await pool.query(`
        INSERT INTO ride_time_logs (
          student_id,
          service_id,
          date,
          hours,
          shift_type,
          unit_type,
          preceptor_name,
          preceptor_license,
          patient_contacts,
          aed_used,
          cpr_performed,
          spinal_immobilization,
          ventilations,
          traction_splinting,
          twelve_lead,
          medication_administrations,
          ivs_placed,
          notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING log_id
      `, [
        studentId, 
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
      ]);
      
      return { log_id: result.rows[0].log_id };
    } catch (error) {
      console.error('Database error in addRideLog:', error);
      throw error;
    }
  }

  // Update a ride time log
  static async updateRideLog(
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
  ) {
    try {
      // Check if the log exists
      const logExists = await pool.query(`
        SELECT log_id FROM ride_time_logs WHERE log_id = $1
      `, [logId]);
      
      if (logExists.rows.length === 0) {
        throw new Error(`Ride time log with ID ${logId} not found`);
      }
      
      // If we're updating the service, validate it exists
      if (serviceId) {
        const serviceResult = await pool.query(`
          SELECT service_id FROM ambulance_services WHERE service_id = $1 AND is_active = true
        `, [serviceId]);
        
        if (serviceResult.rows.length === 0) {
          throw new Error(`Ambulance service with ID ${serviceId} not found or is inactive`);
        }
      }
      
      const result = await pool.query(`
        UPDATE ride_time_logs
        SET 
          service_id = COALESCE($2, service_id),
          date = COALESCE($3, date),
          hours = COALESCE($4, hours),
          shift_type = COALESCE($5, shift_type),
          unit_type = COALESCE($6, unit_type),
          preceptor_name = COALESCE($7, preceptor_name),
          preceptor_license = COALESCE($8, preceptor_license),
          patient_contacts = COALESCE($9, patient_contacts),
          aed_used = COALESCE($10, aed_used),
          cpr_performed = COALESCE($11, cpr_performed),
          spinal_immobilization = COALESCE($12, spinal_immobilization),
          ventilations = COALESCE($13, ventilations),
          traction_splinting = COALESCE($14, traction_splinting),
          twelve_lead = COALESCE($15, twelve_lead),
          medication_administrations = COALESCE($16, medication_administrations),
          ivs_placed = COALESCE($17, ivs_placed),
          notes = COALESCE($18, notes)
        WHERE log_id = $1
        RETURNING log_id
      `, [
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
      ]);
      
      if (result.rows.length === 0) {
        throw new Error(`Failed to update ride time log with ID ${logId}`);
      }
      
      return { log_id: result.rows[0].log_id, success: true };
    } catch (error) {
      console.error(`Database error in updateRideLog(${logId}):`, error);
      throw error;
    }
  }

  // Delete a ride time log
  static async deleteRideLog(logId) {
    try {
      const result = await pool.query(`
        DELETE FROM ride_time_logs
        WHERE log_id = $1
        RETURNING log_id
      `, [logId]);
      
      if (result.rows.length === 0) {
        throw new Error(`Ride time log with ID ${logId} not found`);
      }
      
      return { success: true };
    } catch (error) {
      console.error(`Database error in deleteRideLog(${logId}):`, error);
      throw error;
    }
  }

  // Get ride time summary for a student
  static async getStudentRideSummary(studentId) {
    try {
      const result = await pool.query(`
        SELECT 
          SUM(hours) as total_hours,
          COUNT(DISTINCT service_id) as unique_services,
          SUM(patient_contacts) as total_patients,
          SUM(CASE WHEN aed_used = true THEN 1 ELSE 0 END) as aed_count,
          SUM(CASE WHEN cpr_performed = true THEN 1 ELSE 0 END) as cpr_count,
          SUM(CASE WHEN spinal_immobilization = true THEN 1 ELSE 0 END) as spinal_count,
          SUM(CASE WHEN ventilations = true THEN 1 ELSE 0 END) as ventilation_count,
          SUM(CASE WHEN traction_splinting = true THEN 1 ELSE 0 END) as traction_count,
          SUM(CASE WHEN twelve_lead = true THEN 1 ELSE 0 END) as twelve_lead_count,
          SUM(medication_administrations) as medication_count,
          SUM(ivs_placed) as iv_count
        FROM ride_time_logs
        WHERE student_id = $1
      `, [studentId]);
      
      return result.rows[0] || { 
        total_hours: 0, 
        unique_services: 0, 
        total_patients: 0,
        aed_count: 0,
        cpr_count: 0,
        spinal_count: 0,
        ventilation_count: 0,
        traction_count: 0,
        twelve_lead_count: 0,
        medication_count: 0,
        iv_count: 0
      };
    } catch (error) {
      console.error(`Database error in getStudentRideSummary(${studentId}):`, error);
      throw new Error('Failed to retrieve ride time summary');
    }
  }
}

module.exports = RideTimeModel;
