// index.js - Main server file for EMS Tracker API

// Import required packages
const express = require('express');
const { Pool } = require('pg');

// Create Express application
const app = express();
const PORT = process.env.PORT || 3000;

// Set up middleware to parse JSON requests
app.use(express.json());

// Database connection configuration
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false // Required for Render's PostgreSQL
  }
});

// Test database connection
async function testDatabaseConnection() {
  let client;
  
  try {
    console.log('Testing database connection...');
    client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('Database connection successful!', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Database connection error:', error.message);
    return false;
  } finally {
    if (client) client.release();
  }
}

// Run connection test when server starts
testDatabaseConnection();

// Home route - Shows the API is running
app.get('/', (req, res) => {
  res.send('EMS Tracker API is running! Use /setup-db to initialize the database.');
});

// Simple database test route
app.get('/test-db', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    
    res.send(`Database connection successful! Server time: ${result.rows[0].now}`);
  } catch (err) {
    console.error('Database connection error:', err);
    res.status(500).send(`Error connecting to database: ${err.message}`);
  }
});

// Route to set up the database tables
app.get('/setup-db', async (req, res) => {
  try {
    console.log('Starting database setup...');
    
    // Import the setup-db.js file
    const setupDb = require('./setup-db');
    
    // Run the database setup function
    await setupDb.setupDatabase();
    
    // Return success message
    res.send('Database setup completed successfully!');
  } catch (error) {
    console.error('Error setting up database:', error);
    res.status(500).send(`Error setting up database: ${error.message}`);
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Test database connection at: http://localhost:${PORT}/test-db`);
  console.log(`Set up database at: http://localhost:${PORT}/setup-db`);
});
