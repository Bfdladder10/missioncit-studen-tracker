// Database schema updates for clinical scheduling and ride time tracking
const { connectToDb } = require('../config/database');

async function updateSchedulingSchema() {
  let client;
  try {
    client = await connectToDb();
    
    console.log('Updating database schema for clinical scheduling and ride time tracking...');
    
    // Use a single transaction for all schema changes
    await client.query('BEGIN');

    // PHASE 1: Create all tables first
    try {
      // Create clinical sites table if it doesn't exist
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
      console.log('Clinical sites table created or already exists');
      
      // Create clinical slots table if it doesn't exist
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
      console.log('Clinical slots table created or already exists');
      
      // Create student preferences table if it doesn't exist
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
      console.log('Student preferences table created or already exists');
      
      // Create student clinical assignments table if it doesn't exist
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
      console.log('Student clinical assignments table created or already exists');
      
      // Create ambulance services table if it doesn't exist
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
      console.log('Ambulance services table created or already exists');
      
      // Create ride time logs table if it doesn't exist
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
      console.log('Ride time logs table created or already exists');
    } catch (error) {
      console.error('Error creating tables:', error);
      await client.query('ROLLBACK');
      throw error;
    }

    // PHASE 2: Verify table existence before creating indexes
    try {
      // Check if clinical_slots exists
      const slotTableExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'clinical_slots'
        )
      `);
      
      if (slotTableExists.rows[0].exists) {
        console.log('Clinical slots table exists, creating indexes');
        try {
          await client.query(`CREATE INDEX IF NOT EXISTS idx_clinical_slots_site_id ON clinical_slots(site_id)`);
          await client.query(`CREATE INDEX IF NOT EXISTS idx_clinical_slots_date ON clinical_slots(slot_date)`);
        } catch (error) {
          console.error('Error creating clinical_slots indexes:', error);
          // Continue execution instead of failing
        }
      }
      
      // Check if student_preferences exists
      const preferencesTableExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'student_preferences'
        )
      `);
      
      if (preferencesTableExists.rows[0].exists) {
        console.log('Student preferences table exists, creating indexes');
        try {
          await client.query(`CREATE INDEX IF NOT EXISTS idx_student_preferences_student_id ON student_preferences(student_id)`);
          await client.query(`CREATE INDEX IF NOT EXISTS idx_student_preferences_slot_id ON student_preferences(slot_id)`);
        } catch (error) {
          console.error('Error creating student_preferences indexes:', error);
          // Continue execution instead of failing
        }
      }
      
      // Check if student_clinical_assignments exists
      const assignmentsTableExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'student_clinical_assignments'
        )
      `);
      
      if (assignmentsTableExists.rows[0].exists) {
        console.log('Student clinical assignments table exists, creating indexes');
        try {
          await client.query(`CREATE INDEX IF NOT EXISTS idx_student_clinical_assignments_student_id ON student_clinical_assignments(student_id)`);
          await client.query(`CREATE INDEX IF NOT EXISTS idx_student_clinical_assignments_slot_id ON student_clinical_assignments(slot_id)`);
        } catch (error) {
          console.error('Error creating student_clinical_assignments indexes:', error);
          // Continue execution instead of failing
        }
      }
      
      // Check if ride_time_logs exists
      const logsTableExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'ride_time_logs'
        )
      `);
      
      if (logsTableExists.rows[0].exists) {
        console.log('Ride time logs table exists, creating indexes');
        try {
          await client.query(`CREATE INDEX IF NOT EXISTS idx_ride_time_logs_student_id ON ride_time_logs(student_id)`);
          await client.query(`CREATE INDEX IF NOT EXISTS idx_ride_time_logs_service_id ON ride_time_logs(service_id)`);
          await client.query(`CREATE INDEX IF NOT EXISTS idx_ride_time_logs_date ON ride_time_logs(date)`);
        } catch (error) {
          console.error('Error creating ride_time_logs indexes:', error);
          // Continue execution instead of failing
        }
      }
    } catch (error) {
      console.error('Error creating indexes:', error);
      await client.query('ROLLBACK');
      throw error;
    }
    
    // Commit all changes
    await client.query('COMMIT');
    console.log('Database schema update for scheduling completed successfully!');
    
    return { success: true, message: 'Schema updated successfully' };
  } catch (error) {
    if (client) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Error during rollback:', rollbackError);
      }
    }
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
