const { Pool } = require('pg');

// Simple test connection
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

// Add a new route to your index.js file
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
