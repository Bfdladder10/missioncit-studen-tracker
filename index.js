// Import required packages
const express = require('express');
const { Client } = require('pg');

// Create Express application
const app = express();
const PORT = process.env.PORT || 3000;

// Set up middleware to parse JSON requests
app.use(express.json());

// Home route - Shows the API is running
app.get('/', (req, res) => {
  res.send('EMS Tracker API is running! Use /test-db to check database connection or /setup-db to initialize the database.');
});

// Simple database test route
app.get('/test-db', async (req, res) => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    const result = await client.query('SELECT NOW()');
    await client.end();
    
    res.send(`Database connection successful! Server time: ${result.rows[0].now}`);
  } catch (err) {
    console.error('Database connection error:', err);
    res.status(500).send(`Error connecting to database: ${err.message}`);
  }
});

// Route to set up the database tables
app.get('/setup-db', async (req, res) => {
  try {
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
});
