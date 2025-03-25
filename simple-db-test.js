// A basic PostgreSQL connection test
const http = require('http');
const { Client } = require('pg');

// Create a basic HTTP server
const server = http.createServer(async (req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <html><body>
        <h1>Database Test Server</h1>
        <p>Visit <a href="/test">/test</a> to test the database connection</p>
      </body></html>
    `);
  } 
  else if (req.url === '/test') {
    try {
      // Get connection details and log them (without showing password)
      const connectionString = process.env.DATABASE_URL || '';
      console.log('Connection string (partial):', 
        connectionString.substring(0, connectionString.indexOf(':')) + ':[HIDDEN]' +
        connectionString.substring(connectionString.indexOf('@')));
      
      // Create a new client with explicit parameters
      const connParts = new URL(connectionString);
      const client = new Client({
        user: connParts.username,
        password: connParts.password,
        host: connParts.hostname,
        port: connParts.port || 5432,
        database: connParts.pathname.split('/')[1],
        ssl: {
          rejectUnauthorized: false
        },
        connectionTimeoutMillis: 10000  // 10 second timeout
      });
      
      console.log('Connecting to database...');
      await client.connect();
      console.log('Connected successfully!');
      
      const result = await client.query('SELECT NOW() as time');
      console.log('Query executed:', result.rows[0].time);
      
      await client.end();
      console.log('Connection closed properly');
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html><body>
          <h1>Database Connection Successful!</h1>
          <p>Database server time: ${result.rows[0].time}</p>
        </body></html>
      `);
    } catch (error) {
      console.error('Connection error details:', error);
      
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`
        <html><body>
          <h1>Database Connection Error</h1>
          <p>Error: ${error.message}</p>
          <p>Check server logs for more details</p>
        </body></html>
      `);
    }
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
});
