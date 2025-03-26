// Main server entry point for EMS Skills Tracker application
require('dotenv').config();
const express = require('express');
const { Client } = require('pg');
const fileUpload = require('express-fileupload');
const cookieParser = require('cookie-parser');
const path = require('path');

// Import auth middleware
const { authMiddleware } = require('./middleware/auth');

// Import routes
const adminRoutes = require('./routes/adminRoutes');
const authRoutes = require('./routes/authRoutes');
const skillRoutes = require('./routes/skillRoutes');
const clinicalRoutes = require('./routes/clinicalRoutes');
const classRoutes = require('./routes/classRoutes');
const schedulingRoutes = require('./routes/schedulingRoutes');
const rideTimeRoutes = require('./routes/rideTimeRoutes');
// TODO: Import other routes once created (patients)

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max file size
}));
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Mount routes
app.use('/api/admin', adminRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/skills', skillRoutes);
app.use('/api/clinical', clinicalRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/scheduling', schedulingRoutes);
app.use('/api/ridetime', rideTimeRoutes);
// TODO: Mount other routes once created

// Database connection function (legacy support)
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
  res.render('index');
});

// Login route
app.get('/login', (req, res) => {
  res.render('login');
});

// Registration route
app.get('/register', (req, res) => {
  res.render('login');
});

// Admin dashboard route
app.get('/admin/dashboard', (req, res) => {
  res.render('admin/dashboard', { 
    user: req.user,
    title: 'Admin Dashboard',
    path: '/admin/dashboard'
  });
});

// User dashboard route
app.get('/dashboard', authMiddleware, (req, res) => {
  res.render('dashboard', { 
    title: 'Dashboard',
    user: req.user,
    path: '/dashboard'
  });
});

// Admin certification levels route
app.get('/admin/certification-levels', (req, res) => {
  res.render('admin/certification-levels', { 
    user: req.user,
    title: 'Certification Levels',
    path: '/admin/certification-levels'
  });
});

// Admin clinical scheduling route
app.get('/admin/clinical-scheduling', (req, res) => {
  res.render('admin/clinical-scheduling', { 
    user: req.user,
    title: 'Clinical Scheduling',
    path: '/admin/clinical-scheduling'
  });
});

// Student clinical preferences route
app.get('/student/clinical-preferences', (req, res) => {
  res.render('student/clinical-preferences', { 
    user: req.user,
    title: 'Clinical Preferences',
    path: '/student/clinical-preferences'
  });
});

// Student clinical assignments route
app.get('/student/clinical-assignments', (req, res) => {
  res.render('student/clinical-assignments', { 
    user: req.user,
    title: 'My Clinical Assignments',
    path: '/student/clinical-assignments'
  });
});

// Student ride time logs route
app.get('/student/ride-time', (req, res) => {
  res.render('student/ride-time', { 
    user: req.user,
    title: 'Ride Time Logs',
    path: '/student/ride-time'
  });
});

// Database testing route
app.get('/test-db', async (req, res) => {
  try {
    const client = await connectToDb();
    const result = await client.query('SELECT NOW()');
    await client.end();
    
    res.send(`Database connection successful! Server time: ${result.rows[0].now}`);
  } catch (err) {
    console.error('Database connection error:', err);
    res.status(500).send(`Error connecting to database: ${err.message}`);
  }
});

// Database setup route
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

// Legacy routes handling - this will fall back to app.js until we've fully migrated
// Uncomment this if you need to ensure backward compatibility during transition
// const legacyApp = require('./app');
// app.use((req, res, next) => {
//   // If a route hasn't been handled by the new structure, fall back to legacy app
//   legacyApp(req, res, next);
// });

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`View the application at http://localhost:${PORT}`);
});

module.exports = app; // For testing purposes
