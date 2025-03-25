// Complete application with database setup
const express = require('express');
const { Client } = require('pg');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Database connection function
async function connectToDb() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });
  
  await client.connect();
  return client;
}

// Home route
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>EMS Tracker</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #c57100; }
          .button { display: inline-block; background: #c57100; color: white; padding: 10px 15px; 
                    text-decoration: none; border-radius: 4px; margin-top: 15px; }
          .card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <h1>EMS Student Tracker</h1>
        <div class="card">
          <h2>Database Tools</h2>
          <p>Database is successfully connected!</p>
          <a href="/test-db" class="button">Test Database</a>
          <a href="/setup-db" class="button">Setup Database</a>
        </div>
      </body>
    </html>
  `);
});

// Test database connection
app.get('/test-db', async (req, res) => {
  try {
    const client = await connectToDb();
    const result = await client.query('SELECT NOW() as time');
    await client.end();
    
    res.send(`
      <html>
        <head>
          <title>Database Test</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            h1 { color: #c57100; }
            .success { color: green; }
          </style>
        </head>
        <body>
          <h1>Database Test</h1>
          <p class="success">Connection successful!</p>
          <p>Database server time: ${result.rows[0].time}</p>
          <p><a href="/">Back to home</a></p>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send(`
      <html>
        <head>
          <title>Database Error</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            h1 { color: #c57100; }
            .error { color: red; }
          </style>
        </head>
        <body>
          <h1>Database Error</h1>
          <p class="error">Error: ${error.message}</p>
          <p><a href="/">Back to home</a></p>
        </body>
      </html>
    `);
  }
});

// Setup database tables
app.get('/setup-db', async (req, res) => {
  let client;
  try {
    client = await connectToDb();
    
    // Start transaction
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
    
    // Create certification_levels table
    await client.query(`
      CREATE TABLE IF NOT EXISTS certification_levels (
        level_id SERIAL PRIMARY KEY,
        level_name VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE
      );
    `);
    
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
    
    // Create skill_categories table
    await client.query(`
      CREATE TABLE IF NOT EXISTS skill_categories (
        category_id SERIAL PRIMARY KEY,
        category_name VARCHAR(100) NOT NULL,
        description TEXT
      );
    `);
    
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
    
    // Insert initial data if tables are empty
    
    // Check if certification_levels is empty
    const certLevelsCheck = await client.query('SELECT COUNT(*) FROM certification_levels');
    if (parseInt(certLevelsCheck.rows[0].count) === 0) {
      // Insert certification levels
      await client.query(`
        INSERT INTO certification_levels (level_name, description)
        VALUES 
          ('EMR', 'Emergency Medical Responder'),
          ('EMT', 'Emergency Medical Technician'),
          ('AEMT', 'Advanced Emergency Medical Technician'),
          ('Paramedic', 'Paramedic');
      `);
      console.log('Inserted certification levels');
    }
    
    // Check if skill_categories is empty
    const skillCategoriesCheck = await client.query('SELECT COUNT(*) FROM skill_categories');
    if (parseInt(skillCategoriesCheck.rows[0].count) === 0) {
      // Insert skill categories
      await client.query(`
        INSERT INTO skill_categories (category_name, description)
        VALUES
          ('Airway', 'Airway management skills'),
          ('Assessment', 'Patient assessment skills'),
          ('Circulation', 'Circulatory support skills'),
          ('Medical', 'Medical emergency skills'),
          ('Trauma', 'Trauma management skills');
      `);
      console.log('Inserted skill categories');
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    res.send(`
      <html>
        <head>
          <title>Database Setup</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            h1 { color: #c57100; }
            .success { color: green; }
          </style>
        </head>
        <body>
          <h1>Database Setup</h1>
          <p class="success">Database tables created successfully!</p>
          <p>The following tables were created:</p>
          <ul>
            <li>users</li>
            <li>certification_levels</li>
            <li>students</li>
            <li>skill_categories</li>
            <li>skills</li>
          </ul>
          <p>Initial data for certification levels and skill categories has been inserted.</p>
          <p><a href="/">Back to home</a></p>
        </body>
      </html>
    `);
  } catch (error) {
    // Rollback transaction on error
    if (client) {
      await client.query('ROLLBACK');
    }
    
    console.error('Error setting up database:', error);
    
    res.status(500).send(`
      <html>
        <head>
          <title>Database Setup Error</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            h1 { color: #c57100; }
            .error { color: red; }
          </style>
        </head>
        <body>
          <h1>Database Setup Error</h1>
          <p class="error">Error: ${error.message}</p>
          <p><a href="/">Back to home</a></p>
        </body>
      </html>
    `);
  } finally {
    if (client) {
      await client.end();
    }
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
