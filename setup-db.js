// This file contains the database setup script
const { Client } = require('pg');

// Function to set up the database tables
async function setupDatabase() {
  // Create a new client for this operation
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  try {
    // Connect to the database
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!');
    
    // Start a transaction
    await client.query('BEGIN');
    
    console.log('Setting up database tables...');
    
    // Enable UUID extension
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    `);
    
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Users table created');
    
    // Create certification_levels table
    await client.query(`
      CREATE TABLE IF NOT EXISTS certification_levels (
        level_id SERIAL PRIMARY KEY,
        level_name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE
      );
    `);
    console.log('Certification levels table created');
    
    // Create students table
    await client.query(`
      CREATE TABLE IF NOT EXISTS students (
        student_id UUID PRIMARY KEY REFERENCES users(user_id),
        certification_level_id INTEGER REFERENCES certification_levels(level_id),
        student_number VARCHAR(50) UNIQUE,
        enrollment_date DATE NOT NULL,
        graduation_date DATE,
        status VARCHAR(20) DEFAULT 'active',
        notes TEXT
      );
    `);
    console.log('Students table created');
    
    // Create skill_categories table
    await client.query(`
      CREATE TABLE IF NOT EXISTS skill_categories (
        category_id SERIAL PRIMARY KEY,
        category_name VARCHAR(100) NOT NULL,
        description TEXT
      );
    `);
    console.log('Skill categories table created');
    
    // Create skills table
    await client.query(`
      CREATE TABLE IF NOT EXISTS skills (
        skill_id SERIAL PRIMARY KEY,
        category_id INTEGER REFERENCES skill_categories(category_id),
        skill_name VARCHAR(100) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE
      );
    `);
    console.log('Skills table created');
    
    // Create certification_skills table
    await client.query(`
      CREATE TABLE IF NOT EXISTS certification_skills (
        cert_skill_id SERIAL PRIMARY KEY,
        certification_level_id INTEGER REFERENCES certification_levels(level_id),
        skill_id INTEGER REFERENCES skills(skill_id),
        repetitions_required INTEGER DEFAULT 1,
        is_required BOOLEAN DEFAULT TRUE,
        is_active BOOLEAN DEFAULT TRUE,
        UNIQUE(certification_level_id, skill_id)
      );
    `);
    console.log('Certification skills table created');
    
    // Create student_skills table
    await client.query(`
      CREATE TABLE IF NOT EXISTS student_skills (
        completion_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        student_id UUID REFERENCES students(student_id),
        skill_id INTEGER REFERENCES skills(skill_id),
        completion_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        location VARCHAR(255),
        notes TEXT,
        verified_by UUID REFERENCES users(user_id),
        verified_at TIMESTAMP,
        is_successful BOOLEAN DEFAULT TRUE
      );
    `);
    console.log('Student skills table created');
    
    // Create clinical_locations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS clinical_locations (
        location_id SERIAL PRIMARY KEY,
        location_name VARCHAR(255) NOT NULL,
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(50),
        zip VARCHAR(20),
        phone VARCHAR(20),
        contact_person VARCHAR(100),
        notes TEXT,
        is_active BOOLEAN DEFAULT TRUE
      );
    `);
    console.log('Clinical locations table created');
    
    // Create clinical_opportunities table
    await client.query(`
      CREATE TABLE IF NOT EXISTS clinical_opportunities (
        opportunity_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        location_id INTEGER REFERENCES clinical_locations(location_id),
        certification_level_id INTEGER REFERENCES certification_levels(level_id),
        start_datetime TIMESTAMP NOT NULL,
        end_datetime TIMESTAMP NOT NULL,
        slots_available INTEGER DEFAULT 1,
        created_by UUID REFERENCES users(user_id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT
      );
    `);
    console.log('Clinical opportunities table created');
    
    // Create student_preferences table
    await client.query(`
      CREATE TABLE IF NOT EXISTS student_preferences (
        preference_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        student_id UUID REFERENCES students(student_id),
        opportunity_id UUID REFERENCES clinical_opportunities(opportunity_id),
        preference_rank INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(student_id, opportunity_id)
      );
    `);
    console.log('Student preferences table created');
    
    // Create student_clinicals table
    await client.query(`
      CREATE TABLE IF NOT EXISTS student_clinicals (
        assignment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        student_id UUID REFERENCES students(student_id),
        opportunity_id UUID REFERENCES clinical_opportunities(opportunity_id),
        status VARCHAR(20) DEFAULT 'scheduled',
        assigned_by UUID REFERENCES users(user_id),
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        hours_completed DECIMAL(5,2),
        UNIQUE(student_id, opportunity_id)
      );
    `);
    console.log('Student clinicals table created');
    
    // Create patient_contacts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS patient_contacts (
        contact_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        student_id UUID REFERENCES students(student_id),
        clinical_id UUID REFERENCES student_clinicals(assignment_id),
        contact_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        patient_age INTEGER,
        patient_gender VARCHAR(10),
        chief_complaint TEXT,
        bp_systolic INTEGER,
        bp_diastolic INTEGER,
        heart_rate INTEGER,
        respiratory_rate INTEGER,
        spo2 DECIMAL(5,2),
        temperature DECIMAL(5,2),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Patient contacts table created');
    
    // Create patient_interventions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS patient_interventions (
        intervention_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        contact_id UUID REFERENCES patient_contacts(contact_id),
        skill_id INTEGER REFERENCES skills(skill_id),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Patient interventions table created');
    
    // Create system_config table
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_config (
        config_id SERIAL PRIMARY KEY,
        certification_level_id INTEGER REFERENCES certification_levels(level_id),
        feature_key VARCHAR(100) NOT NULL,
        feature_value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(certification_level_id, feature_key)
      );
    `);
    console.log('System config table created');
    
    // Insert initial data
    
    // Insert certification levels
    await client.query(`
      INSERT INTO certification_levels (level_name, description)
      VALUES 
        ('EMR', 'Emergency Medical Responder'),
        ('EMT', 'Emergency Medical Technician'),
        ('AEMT', 'Advanced Emergency Medical Technician'),
        ('Paramedic', 'Paramedic')
      ON CONFLICT (level_name) DO NOTHING;
    `);
    console.log('Certification levels data inserted');
    
    // Insert skill categories
    await client.query(`
      INSERT INTO skill_categories (category_name, description)
      VALUES
        ('Airway', 'Airway management skills'),
        ('Assessment', 'Patient assessment skills'),
        ('Circulation', 'Circulatory support skills'),
        ('Medical', 'Medical emergency skills'),
        ('Trauma', 'Trauma management skills')
      ON CONFLICT DO NOTHING;
    `);
    console.log('Skill categories data inserted');
    
    // Commit the transaction
    await client.query('COMMIT');
    console.log('Database setup completed successfully');
    
  } catch (error) {
    // If any error occurs, rollback the transaction
    await client.query('ROLLBACK');
    console.error('Error setting up database:', error);
    throw error;
  } finally {
    // Close the client connection
    await client.end();
    console.log('Database connection closed');
  }
}

module.exports = {
  setupDatabase
};
