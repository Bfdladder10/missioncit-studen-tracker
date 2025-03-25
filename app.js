// Complete app.js file with authentication system
const express = require('express');
const { Client } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const app = express();
const PORT = process.env.PORT || 3000;

// JWT secret key (in production this should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware
app.use(express.json());
app.use(cookieParser());

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

// Auth middleware to protect routes
function authMiddleware(req, res, next) {
  try {
    const token = req.cookies.token;
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
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
          <h2>Welcome to EMS Tracker</h2>
          <p>Please <a href="/login">login</a> or <a href="/register">register</a> to continue.</p>
          <a href="/login" class="button">Login</a>
          <a href="/register" class="button">Register</a>
        </div>
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

// Login form
app.get('/login', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>EMS Tracker - Login</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; }
          h1 { color: #c57100; }
          .form-group { margin-bottom: 15px; }
          label { display: block; margin-bottom: 5px; }
          input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
          button { background: #c57100; color: white; border: none; padding: 10px 15px; 
                 border-radius: 4px; cursor: pointer; }
          .error { color: red; margin-top: 15px; }
          a { color: #c57100; }
        </style>
      </head>
      <body>
        <h1>EMS Tracker Login</h1>
        <div id="errorMessage" class="error" style="display: none;"></div>
        <form id="loginForm">
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required>
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" required>
          </div>
          <button type="submit">Log In</button>
        </form>
        <p>Don't have an account? <a href="/register">Register</a></p>
        
        <script>
          document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            try {
              const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
              });
              
              const data = await response.json();
              
              if (!response.ok) {
                throw new Error(data.error || 'Login failed');
              }
              
              // Redirect to dashboard on success
              window.location.href = '/dashboard';
              
            } catch (error) {
              const errorMsg = document.getElementById('errorMessage');
              errorMsg.textContent = error.message;
              errorMsg.style.display = 'block';
            }
          });
        </script>
      </body>
    </html>
  `);
});

// Registration form
app.get('/register', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>EMS Tracker - Register</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; }
          h1 { color: #c57100; }
          .form-group { margin-bottom: 15px; }
          label { display: block; margin-bottom: 5px; }
          input, select { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
          button { background: #c57100; color: white; border: none; padding: 10px 15px; 
                 border-radius: 4px; cursor: pointer; }
          .error { color: red; margin-top: 15px; }
          a { color: #c57100; }
        </style>
      </head>
      <body>
        <h1>EMS Tracker Registration</h1>
        <div id="errorMessage" class="error" style="display: none;"></div>
        <form id="registerForm">
          <div class="form-group">
            <label for="firstName">First Name</label>
            <input type="text" id="firstName" name="firstName" required>
          </div>
          <div class="form-group">
            <label for="lastName">Last Name</label>
            <input type="text" id="lastName" name="lastName" required>
          </div>
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" name="email" required>
          </div>
          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" name="password" required>
          </div>
          <div class="form-group">
            <label for="role">Role</label>
            <select id="role" name="role" required>
              <option value="student">Student</option>
              <option value="instructor">Instructor</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          <button type="submit">Register</button>
        </form>
        <p>Already have an account? <a href="/login">Login</a></p>
        
        <script>
          document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const userData = {
              firstName: document.getElementById('firstName').value,
              lastName: document.getElementById('lastName').value,
              email: document.getElementById('email').value,
              password: document.getElementById('password').value,
              role: document.getElementById('role').value
            };
            
            try {
              const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
              });
              
              const data = await response.json();
              
              if (!response.ok) {
                throw new Error(data.error || 'Registration failed');
              }
              
              // Redirect to dashboard on success
              window.location.href = '/dashboard';
              
            } catch (error) {
              const errorMsg = document.getElementById('errorMessage');
              errorMsg.textContent = error.message;
              errorMsg.style.display = 'block';
            }
          });
        </script>
      </body>
    </html>
  `);
});

// Dashboard page (protected)
app.get('/dashboard', authMiddleware, (req, res) => {
  res.send(`
    <html>
      <head>
        <title>EMS Tracker - Dashboard</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1, h2 { color: #c57100; }
          .card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
          .button { display: inline-block; background: #c57100; color: white; padding: 10px 15px; 
                    text-decoration: none; border-radius: 4px; margin-top: 15px; }
          .stats { display: flex; gap: 20px; margin: 20px 0; }
          .stat-card { flex: 1; background: #f9f9f9; border-radius: 8px; padding: 15px; text-align: center; }
          .stat-number { font-size: 32px; font-weight: bold; margin: 10px 0; color: #c57100; }
          .navbar { background: #f9f9f9; padding: 10px; border-radius: 8px; margin-bottom: 20px; }
          .navbar a { color: #333; text-decoration: none; padding: 8px 15px; display: inline-block; }
          .navbar a:hover { background: #e9e9e9; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="navbar">
          <a href="/dashboard">Dashboard</a>
          <a href="/skills">Skills</a>
          <a href="/patients">Patient Contacts</a>
          <a href="/clinicals">Clinicals</a>
          <a href="#" id="logoutButton" style="float: right;">Logout</a>
        </div>
        
        <h1>Welcome <span id="userName"></span>!</h1>
        
        <div class="stats">
          <div class="stat-card">
            <div>Skills Completed</div>
            <div class="stat-number">0/0</div>
            <div>0%</div>
          </div>
          <div class="stat-card">
            <div>Patient Contacts</div>
            <div class="stat-number">0/0</div>
            <div>0%</div>
          </div>
          <div class="stat-card">
            <div>Clinical Hours</div>
            <div class="stat-number">0/0</div>
            <div>0%</div>
          </div>
        </div>
        
        <div class="card">
          <h2>Recent Activity</h2>
          <p>No recent activity to display.</p>
        </div>
        
        <script>
          // Fetch user info when page loads
          fetch('/api/me')
            .then(response => response.json())
            .then(data => {
              document.getElementById('userName').textContent = data.user.firstName + ' ' + data.user.lastName;
            })
            .catch(error => console.error('Error fetching user data:', error));
          
          // Logout functionality
          document.getElementById('logoutButton').addEventListener('click', async (e) => {
            e.preventDefault();
            
            try {
              await fetch('/api/logout', { method: 'POST' });
              window.location.href = '/login';
            } catch (error) {
              console.error('Logout error:', error);
            }
          });
        </script>
      </body>
    </html>
  `);
});

// API Routes

// User data endpoint
app.get('/api/me', authMiddleware, async (req, res) => {
  let client;
  try {
    client = await connectToDb();
    
    const result = await client.query(
      'SELECT user_id, email, first_name, last_name, role FROM users WHERE user_id = $1',
      [req.user.userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    res.json({
      user: {
        userId: user.user_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ error: 'Failed to fetch user data' });
  } finally {
    if (client) await client.end();
  }
});

// Registration endpoint
app.post('/api/register', async (req, res) => {
  let client;
  try {
    const { email, password, firstName, lastName, role } = req.body;
    
    // Validate input
    if (!email || !password || !firstName || !lastName || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Check if role is valid
    if (!['student', 'admin', 'instructor'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    client = await connectToDb();
    
    // Check if user already exists
    const userCheck = await client.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Start transaction
    await client.query('BEGIN');
    
    // Insert user
    const result = await client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role)
       VALUES ($1, $2, $3, $4, $5) RETURNING user_id`,
      [email, passwordHash, firstName, lastName, role]
    );
    
    const userId = result.rows[0].user_id;
    
    // If role is student, create student record
    if (role === 'student') {
      // Get certification level ID for EMT (default)
      const certResult = await client.query(
        'SELECT level_id FROM certification_levels WHERE level_name = $1',
        ['EMT']
      );
      
      const certLevelId = certResult.rows[0].level_id;
      
      // Create student record
      await client.query(
        `INSERT INTO students (student_id, certification_level_id, enrollment_date)
         VALUES ($1, $2, CURRENT_DATE)`,
        [userId, certLevelId]
      );
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId, 
        email, 
        role,
        firstName,
        lastName
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Set token as HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'strict'
    });
    
    res.status(201).json({
      message: 'User registered successfully',
      user: { userId, email, firstName, lastName, role }
    });
    
  } catch (error) {
    // Rollback transaction on error
    if (client) {
      await client.query('ROLLBACK');
    }
    
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  } finally {
    if (client) {
      await client.end();
    }
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  let client;
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    client = await connectToDb();
    
    // Find user
    const result = await client.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    // Verify password
    const passwordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.user_id, 
        email: user.email, 
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Set token as HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'strict'
    });
    
    res.json({
      message: 'Login successful',
      user: {
        userId: user.user_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  } finally {
    if (client) {
      await client.end();
    }
  }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logout successful' });
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
          ('Paramedic',
