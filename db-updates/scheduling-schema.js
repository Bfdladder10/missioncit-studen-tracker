// Database schema updates for clinical scheduling and ride time tracking
const { connectToDb } = require('../config/database');

async function updateSchedulingSchema() {
  let client;
  try {
    client = await connectToDb();
    console.log('Updating database schema for clinical scheduling and ride time tracking...');
    
    // PHASE 1: Create all tables - each in its own transaction for safety
    
    // Create clinical sites table
    try {
      await client.query('BEGIN');
      await client.query(`
        CREATE TABLE IF NOT EXISTS clinical_sites (
          site_id SERIAL PRIMARY KEY,
          site_name VARCHAR(255) NOT NULL,
          address VARCHAR(255),
          city VARCHAR(100),
          state VARCHAR(50),
          zip VARCHAR(20),
          contact_name VARCHAR(255),
          contact_phone VARCHAR(20),
          contact_email VARCHAR(255),
          is_active BOOLEAN DEFAULT TRUE,
          notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await client.query('COMMIT');
      console.log('Clinical sites table created or already exists');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating clinical_sites table:', error);
      // Continue with next table rather than failing entirely
    }
    
    // Create clinical slots table
    try {
      await client.query('BEGIN');
      await client.query(`
        CREATE TABLE IF NOT EXISTS clinical_slots (
          slot_id SERIAL PRIMARY KEY,
          site_id INTEGER NOT NULL REFERENCES clinical_sites(site_id),
          slot_date DATE NOT NULL,
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          max_students INTEGER NOT NULL CHECK (max_students > 0),
          preceptor_name VARCHAR(255),
          notes TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      await client.query('COMMIT');
      console.log('Clinical slots table created or already exists');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating clinical_slots table:', error);
    }
    
    // Create student preferences table
    try {
      await client.query('BEGIN');
      // First drop the existing table if it exists to ensure it has the right structure
      await client.query(`
        DROP TABLE IF EXISTS student_preferences CASCADE
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS student_preferences (
          preference_id SERIAL PRIMARY KEY,
          student_id UUID NOT NULL REFERENCES users(user_id),
          slot_id INTEGER NOT NULL REFERENCES clinical_slots(slot_id),
          rank INTEGER NOT NULL CHECK (rank > 0),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(student_id, slot_id)
        )
      `);
      await client.query('COMMIT');
      console.log('Student preferences table recreated with correct schema');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error recreating student_preferences table:', error);
    }
    
    // Create student clinical assignments table
    try {
      await client.query('BEGIN');
      // First drop the existing table if it exists to ensure it has the right structure
      await client.query(`
        DROP TABLE IF EXISTS student_clinical_assignments CASCADE
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS student_clinical_assignments (
          assignment_id SERIAL PRIMARY KEY,
          student_id UUID NOT NULL REFERENCES users(user_id),
          slot_id INTEGER NOT NULL REFERENCES clinical_slots(slot_id),
          assigned_by UUID NOT NULL REFERENCES users(user_id),
          notes TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          UNIQUE(student_id, slot_id)
        )
      `);
      await client.query('COMMIT');
      console.log('Student clinical assignments table recreated with correct schema');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error recreating student_clinical_assignments table:', error);
    }
    
    // Create ambulance services table
    try {
      await client.query('BEGIN');
      await client.query(`
        CREATE TABLE IF NOT EXISTS ambulance_services (
          service_id SERIAL PRIMARY KEY,
          service_name VARCHAR(255) NOT NULL UNIQUE,
          address VARCHAR(255),
          city VARCHAR(100),
          state VARCHAR(50),
          zip VARCHAR(20),
          contact_name VARCHAR(255),
          contact_phone VARCHAR(20),
          contact_email VARCHAR(255),
          is_active BOOLEAN DEFAULT TRUE,
          notes TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      await client.query('COMMIT');
      console.log('Ambulance services table created or already exists');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating ambulance_services table:', error);
    }
    
    // Create ride time logs table
    try {
      await client.query('BEGIN');
      // First drop the existing table if it exists to ensure it has the right structure
      await client.query(`
        DROP TABLE IF EXISTS ride_time_logs CASCADE
      `);
      await client.query(`
        CREATE TABLE IF NOT EXISTS ride_time_logs (
          log_id SERIAL PRIMARY KEY,
          student_id UUID NOT NULL REFERENCES users(user_id),
          service_id INTEGER NOT NULL REFERENCES ambulance_services(service_id),
          date DATE NOT NULL,
          hours NUMERIC(4,2) NOT NULL CHECK (hours > 0),
          shift_type VARCHAR(50),
          unit_type VARCHAR(50),
          preceptor_name VARCHAR(255),
          preceptor_license VARCHAR(255),
          patient_contacts INTEGER DEFAULT 0,
          aed_used BOOLEAN DEFAULT FALSE,
          cpr_performed BOOLEAN DEFAULT FALSE,
          spinal_immobilization BOOLEAN DEFAULT FALSE,
          ventilations BOOLEAN DEFAULT FALSE,
          traction_splinting BOOLEAN DEFAULT FALSE,
          twelve_lead BOOLEAN DEFAULT FALSE,
          medication_administrations BOOLEAN DEFAULT FALSE,
          ivs_placed BOOLEAN DEFAULT FALSE,
          notes TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      await client.query('COMMIT');
      console.log('Ride time logs table recreated with correct schema');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error recreating ride_time_logs table:', error);
    }
    
    // PHASE 2: Create indexes - each in its own transaction for safety
    // clinical_slots indexes
    try {
      await client.query('BEGIN');
      await client.query(`CREATE INDEX IF NOT EXISTS idx_clinical_slots_site_id ON clinical_slots(site_id)`);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating clinical_slots site_id index:', error);
    }
    
    try {
      await client.query('BEGIN');
      await client.query(`CREATE INDEX IF NOT EXISTS idx_clinical_slots_date ON clinical_slots(slot_date)`);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating clinical_slots slot_date index:', error);
    }
    
    // student_preferences indexes
    try {
      await client.query('BEGIN');
      await client.query(`CREATE INDEX IF NOT EXISTS idx_student_preferences_student_id ON student_preferences(student_id)`);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating student_preferences student_id index:', error);
    }
    
    try {
      await client.query('BEGIN');
      await client.query(`CREATE INDEX IF NOT EXISTS idx_student_preferences_slot_id ON student_preferences(slot_id)`);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating student_preferences slot_id index:', error);
    }
    
    // student_clinical_assignments indexes
    try {
      await client.query('BEGIN');
      await client.query(`CREATE INDEX IF NOT EXISTS idx_student_clinical_assignments_student_id ON student_clinical_assignments(student_id)`);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating student_clinical_assignments student_id index:', error);
    }
    
    try {
      await client.query('BEGIN');
      await client.query(`CREATE INDEX IF NOT EXISTS idx_student_clinical_assignments_slot_id ON student_clinical_assignments(slot_id)`);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating student_clinical_assignments slot_id index:', error);
    }
    
    // ride_time_logs indexes
    try {
      await client.query('BEGIN');
      await client.query(`CREATE INDEX IF NOT EXISTS idx_ride_time_logs_student_id ON ride_time_logs(student_id)`);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating ride_time_logs student_id index:', error);
    }
    
    try {
      await client.query('BEGIN');
      await client.query(`CREATE INDEX IF NOT EXISTS idx_ride_time_logs_service_id ON ride_time_logs(service_id)`);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating ride_time_logs service_id index:', error);
    }
    
    try {
      await client.query('BEGIN');
      await client.query(`CREATE INDEX IF NOT EXISTS idx_ride_time_logs_date ON ride_time_logs(date)`);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating ride_time_logs date index:', error);
    }
    
    console.log('Database schema update for scheduling completed successfully!');
    return { success: true, message: 'Schema updated successfully' };
  } catch (error) {
    console.error('Error updating database schema:', error);
    throw error;
  } finally {
    if (client) {
      try {
        await client.end();
      } catch (endError) {
        console.error('Error disconnecting client:', endError);
      }
    }
  }
}

module.exports = { updateSchedulingSchema };
