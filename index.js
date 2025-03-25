// This is the main server file
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Basic server setup
app.use(express.json());

// Simple home route
app.get('/', (req, res) => {
  res.send('EMS Tracker API is running! Use /setup-db to initialize the database.');
});

// Route to trigger database setup
app.get('/setup-db', async (req, res) => {
  try {
    // Import the setup-db.js file
    const setupDb = require('./setup-db');
    
    // Run the setup function
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
