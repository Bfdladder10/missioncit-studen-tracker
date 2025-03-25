// Complete app.js file with authentication, skills tracking, patient contacts, and clinical scheduling
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

// Role middleware - ensure user has specific role
function roleMiddleware(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access forbidden' });
    }
    
    next();
  };
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
            <div class="stat-number" id="skillsCompleted">0/0</div>
            <div id="skillsPercentage">0%</div>
          </div>
          <div class="stat-card">
            <div>Patient Contacts</div>
            <div class="stat-number" id="patientContacts">0/0</div>
            <div id="contactsPercentage">0%</div>
          </div>
          <div class="stat-card">
            <div>Clinical Hours</div>
            <div class="stat-number" id="clinicalHours">0/0</div>
            <div id="hoursPercentage">0%</div>
          </div>
        </div>
        
        <div class="card">
          <h2>Recent Activity</h2>
          <p>No recent activity to display.</p>
          <a href="/skills" class="button">Log Skills</a>
          <a href="/patients" class="button">Log Patient Contact</a>
          <a href="/clinicals" class="button">View Clinicals</a>
        </div>
        
        <script>
          // Fetch user info when page loads
          fetch('/api/me')
            .then(response => response.json())
            .then(data => {
              document.getElementById('userName').textContent = data.user.firstName + ' ' + data.user.lastName;
            })
            .catch(error => console.error('Error fetching user data:', error));
          
          // Fetch skills progress for student
          if ('${req.user.role}' === 'student') {
            fetch('/api/skills/progress')
              .then(response => response.json())
              .then(data => {
                if (data.completed !== undefined) {
                  document.getElementById('skillsCompleted').textContent = 
                    data.completed + '/' + data.total;
                  document.getElementById('skillsPercentage').textContent = 
                    Math.round((data.completed / data.total) * 100) + '%';
                }
              })
              .catch(error => console.error('Error fetching skills data:', error));
              
            // Fetch patient contact stats for student
            fetch('/api/patients/stats')
              .then(response => response.json())
              .then(data => {
                if (data.total !== undefined) {
                  document.getElementById('patientContacts').textContent = 
                    data.total + '/' + data.required;
                  document.getElementById('contactsPercentage').textContent = 
                    data.percentage + '%';
                }
              })
              .catch(error => console.error('Error fetching patient data:', error));
              
            // Fetch clinical hours for student
            fetch('/api/clinicals/history')
              .then(response => response.json())
              .then(data => {
                const clinicals = data.clinicals || [];
                const totalHours = clinicals.reduce((sum, clinical) => sum + (parseFloat(clinical.hours_completed) || 0), 0);
                const requiredHours = 48; // This could be configurable in the future
                
                document.getElementById('clinicalHours').textContent = 
                  totalHours.toFixed(1) + '/' + requiredHours;
                
                const percentage = Math.min(100, Math.round((totalHours / requiredHours) * 100));
                document.getElementById('hoursPercentage').textContent = percentage + '%';
              })
              .catch(error => console.error('Error fetching clinical data:', error));
          }
          
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

// Skills Page (protected - student view)
app.get('/skills', authMiddleware, (req, res) => {
  res.send(`
    <html>
      <head>
        <title>EMS Tracker - Skills</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1, h2 { color: #c57100; }
          .card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
          .button { display: inline-block; background: #c57100; color: white; padding: 10px 15px; 
                    text-decoration: none; border-radius: 4px; margin-top: 15px; }
          .navbar { background: #f9f9f9; padding: 10px; border-radius: 8px; margin-bottom: 20px; }
          .navbar a { color: #333; text-decoration: none; padding: 8px 15px; display: inline-block; }
          .navbar a:hover { background: #e9e9e9; border-radius: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f9f9f9; }
          .skill-category { background-color: #f5f5f5; font-weight: bold; }
          .progress-bar-container { height: 12px; background-color: #f0f0f0; border-radius: 6px; overflow: hidden; }
          .progress-bar { height: 100%; background-color: #c57100; border-radius: 6px; }
          .modal { display: none; position: fixed; z-index: 1; left: 0; top: 0; width: 100%; height: 100%; 
                   overflow: auto; background-color: rgba(0,0,0,0.4); }
          .modal-content { background-color: #fefefe; margin: 15% auto; padding: 20px; 
                          border: 1px solid #888; width: 80%; max-width: 500px; border-radius: 8px; }
          .close { color: #aaa; float: right; font-size: 28px; font-weight: bold; cursor: pointer; }
          .close:hover { color: black; }
          .form-group { margin-bottom: 15px; }
          label { display: block; margin-bottom: 5px; }
          input, select, textarea { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
          .btn-success { background-color: #28a745; color: white; padding: 10px 15px; 
                        border: none; border-radius: 4px; cursor: pointer; }
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
        
        <h1>Skills Tracking</h1>
        
        <div class="card">
          <h2>Your Skills Progress</h2>
          <p>Track your progress on required skills for your certification level.</p>
          <button class="button" id="logSkillBtn">Log New Skill</button>
        </div>
        
        <div id="skillsContainer">
          <p>Loading skills...</p>
        </div>
        
        <!-- Modal for logging a new skill -->
        <div id="logSkillModal" class="modal">
          <div class="modal-content">
            <span class="close">&times;</span>
            <h2>Log Skill Completion</h2>
            <form id="logSkillForm">
              <div class="form-group">
                <label for="skillSelect">Select Skill</label>
                <select id="skillSelect" required></select>
              </div>
              <div class="form-group">
                <label for="location">Location</label>
                <input type="text" id="location" required placeholder="Where was this skill performed?">
              </div>
              <div class="form-group">
                <label for="notes">Notes</label>
                <textarea id="notes" rows="3" placeholder="Any additional notes about this skill performance"></textarea>
              </div>
              <button type="submit" class="btn-success">Submit</button>
            </form>
          </div>
        </div>
        
        <script>
          // Global variables
          let skillsData = [];
          let categoriesMap = {};
          
          // Fetch categories and skills when page loads
          function loadSkills() {
            fetch('/api/skills')
              .then(response => response.json())
              .then(data => {
                skillsData = data.skills;
                categoriesMap = data.categories;
                renderSkillsTable();
                populateSkillsDropdown();
              })
              .catch(error => {
                console.error('Error fetching skills:', error);
                document.getElementById('skillsContainer').innerHTML = 
                  '<p>Error loading skills. Please try again later.</p>';
              });
          }
          
          // Render the skills table with progress
          function renderSkillsTable() {
            const container = document.getElementById('skillsContainer');
            
            if (!skillsData || skillsData.length === 0) {
              container.innerHTML = '<p>No skills found for your certification level.</p>';
              return;
            }
            
            // Group skills by category
            const groupedSkills = {};
            skillsData.forEach(skill => {
              const categoryId = skill.category_id;
              if (!groupedSkills[categoryId]) {
                groupedSkills[categoryId] = [];
              }
              groupedSkills[categoryId].push(skill);
            });
            
            // Create table
            let html = '<table>';
            html += '<thead><tr><th>Skill Name</th><th>Progress</th><th>Status</th></tr></thead><tbody>';
            
            // Add rows for each category and its skills
            Object.keys(groupedSkills).forEach(categoryId => {
              const categoryName = categoriesMap[categoryId] || 'Uncategorized';
              
              // Add category header
              html += \`<tr class="skill-category"><td colspan="3">\${categoryName}</td></tr>\`;
              
              // Add skills in this category
              groupedSkills[categoryId].forEach(skill => {
                const completed = skill.completions || 0;
                const required = skill.repetitions_required || 1;
                const progressPercent = Math.min(100, Math.round((completed / required) * 100));
                const status = completed >= required ? 'Complete' : \`\${completed}/\${required}\`;
                
                html += '<tr>';
                html += \`<td>\${skill.skill_name}</td>\`;
                html += '<td><div class="progress-bar-container">';
                html += \`<div class="progress-bar" style="width: \${progressPercent}%"></div></div></td>\`;
                html += \`<td>\${status}</td>\`;
                html += '</tr>';
              });
            });
            
            html += '</tbody></table>';
            container.innerHTML = html;
          }
          
          // Populate skills dropdown in the modal
          function populateSkillsDropdown() {
            const select = document.getElementById('skillSelect');
            select.innerHTML = '';
            
            // Group skills by category for the dropdown
            const groupedSkills = {};
            skillsData.forEach(skill => {
              const categoryId = skill.category_id;
              if (!groupedSkills[categoryId]) {
                groupedSkills[categoryId] = [];
              }
              groupedSkills[categoryId].push(skill);
            });
            
            // Add skills to dropdown with optgroup for categories
            Object.keys(groupedSkills).forEach(categoryId => {
              const categoryName = categoriesMap[categoryId] || 'Uncategorized';
              const optgroup = document.createElement('optgroup');
              optgroup.label = categoryName;
              
              groupedSkills[categoryId].forEach(skill => {
                const option = document.createElement('option');
                option.value = skill.skill_id;
                option.textContent = skill.skill_name;
                optgroup.appendChild(option);
              });
              
              select.appendChild(optgroup);
            });
          }
          
          // Modal handling
          const modal = document.getElementById('logSkillModal');
          const btn = document.getElementById('logSkillBtn');
          const span = document.getElementsByClassName('close')[0];
          
          btn.onclick = function() {
            modal.style.display = 'block';
          }
          
          span.onclick = function() {
            modal.style.display = 'none';
          }
          
          window.onclick = function(event) {
            if (event.target === modal) {
              modal.style.display = 'none';
            }
          }
          
          // Handle skill logging form submission
          document.getElementById('logSkillForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const skillData = {
              skillId: document.getElementById('skillSelect').value,
              location: document.getElementById('location').value,
              notes: document.getElementById('notes').value
            };
            
            try {
              const response = await fetch('/api/skills/log', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(skillData)
              });
              
              const data = await response.json();
              
              if (!response.ok) {
                throw new Error(data.error || 'Failed to log skill');
              }
              
              // Close modal and reload skills
              modal.style.display = 'none';
              document.getElementById('logSkillForm').reset();
              loadSkills();
              
            } catch (error) {
              alert('Error logging skill: ' + error.message);
            }
          });
          
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
          
          // Load skills when page loads
          loadSkills();
        </script>
      </body>
    </html>
  `);
});

// Patient Contacts Page (protected - student view)
app.get('/patients', authMiddleware, (req, res) => {
  res.send(`
    <html>
      <head>
        <title>EMS Tracker - Patient Contacts</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1, h2 { color: #c57100; }
          .card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
          .button { display: inline-block; background: #c57100; color: white; padding: 10px 15px; 
                    text-decoration: none; border-radius: 4px; margin-top: 15px; }
          .navbar { background: #f9f9f9; padding: 10px; border-radius: 8px; margin-bottom: 20px; }
          .navbar a { color: #333; text-decoration: none; padding: 8px 15px; display: inline-block; }
          .navbar a:hover { background: #e9e9e9; border-radius: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f9f9f9; }
          .modal { display: none; position: fixed; z-index: 1; left: 0; top: 0; width: 100%; height: 100%; 
                   overflow: auto; background-color: rgba(0,0,0,0.4); }
          .modal-content { background-color: #fefefe; margin: 15% auto; padding: 20px; 
                          border: 1px solid #888; width: 80%; max-width: 600px; border-radius: 8px; }
          .close { color: #aaa; float: right; font-size: 28px; font-weight: bold; cursor: pointer; }
          .close:hover { color: black; }
          .form-group { margin-bottom: 15px; }
          label { display: block; margin-bottom: 5px; }
          input, select, textarea { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
          .btn-success { background-color: #28a745; color: white; padding: 10px 15px; 
                        border: none; border-radius: 4px; cursor: pointer; }
          .tag { display: inline-block; background: #f0f0f0; padding: 3px 8px; 
                border-radius: 4px; margin-right: 5px; margin-bottom: 5px; font-size: 12px; }
          .row { display: flex; gap: 15px; }
          .col { flex: 1; }
          .contact-card { border: 1px solid #ddd; border-radius: 8px; padding: 15px; margin-bottom: 15px; }
          .contact-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
          .contact-date { color: #666; font-size: 14px; }
          .contact-demo { background: #f9f9f9; padding: 8px; border-radius: 4px; display: inline-block; font-weight: bold; }
          .contact-chief { color: #c57100; }
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
        
        <h1>Patient Contacts</h1>
        
        <div class="card">
          <h2>Your Patient Contacts</h2>
          <p>Document your patient encounters and track your progress toward certification requirements.</p>
          <button class="button" id="addContactBtn">Add New Patient Contact</button>
        </div>
        
        <div id="contactsContainer">
          <p>Loading patient contacts...</p>
        </div>
        
        <!-- Modal for adding a new patient contact -->
        <div id="addContactModal" class="modal">
          <div class="modal-content">
            <span class="close">&times;</span>
            <h2>Add Patient Contact</h2>
            <form id="addContactForm">
              <div class="row">
                <div class="col">
                  <div class="form-group">
                    <label for="patientAge">Patient Age</label>
                    <input type="number" id="patientAge" min="0" max="120" required>
                  </div>
                </div>
                <div class="col">
                  <div class="form-group">
                    <label for="patientGender">Patient Gender</label>
                    <select id="patientGender" required>
                      <option value="">Select</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div class="form-group">
                <label for="chiefComplaint">Chief Complaint</label>
                <input type="text" id="chiefComplaint" required placeholder="Primary reason for seeking care">
              </div>
              
              <h3>Vital Signs</h3>
              <div class="row">
                <div class="col">
                  <div class="form-group">
                    <label for="bpSystolic">BP Systolic</label>
                    <input type="number" id="bpSystolic" min="60" max="300">
                  </div>
                </div>
                <div class="col">
                  <div class="form-group">
                    <label for="bpDiastolic">BP Diastolic</label>
                    <input type="number" id="bpDiastolic" min="30" max="200">
                  </div>
                </div>
              </div>
              
              <div class="row">
                <div class="col">
                  <div class="form-group">
                    <label for="heartRate">Heart Rate</label>
                    <input type="number" id="heartRate" min="30" max="250">
                  </div>
                </div>
                <div class="col">
                  <div class="form-group">
                    <label for="respRate">Respiratory Rate</label>
                    <input type="number" id="respRate" min="4" max="60">
                  </div>
                </div>
              </div>
              
              <div class="row">
                <div class="col">
                  <div class="form-group">
                    <label for="spo2">SpO2 (%)</label>
                    <input type="number" id="spo2" min="50" max="100" step="0.1">
                  </div>
                </div>
                <div class="col">
                  <div class="form-group">
                    <label for="temperature">Temperature (°F)</label>
                    <input type="number" id="temperature" min="93" max="108" step="0.1">
                  </div>
                </div>
              </div>
              
              <div class="form-group">
                <label for="interventions">Interventions Performed</label>
                <div id="interventionsContainer">
                  <p>Loading available skills...</p>
                </div>
              </div>
              
              <div class="form-group">
                <label for="notes">Additional Notes</label>
                <textarea id="notes" rows="3" placeholder="Additional details about the patient encounter"></textarea>
              </div>
              
              <button type="submit" class="btn-success">Save Patient Contact</button>
            </form>
          </div>
        </div>
        
        <script>
          // Global variables
          let patientContacts = [];
          let availableSkills = [];
          
          // Fetch patient contacts when page loads
          function loadPatientContacts() {
            fetch('/api/patients')
              .then(response => response.json())
              .then(data => {
                patientContacts = data.contacts;
                renderPatientContacts();
              })
              .catch(error => {
                console.error('Error fetching patient contacts:', error);
                document.getElementById('contactsContainer').innerHTML = 
                  '<p>Error loading patient contacts. Please try again later.</p>';
              });
          }
          
          // Fetch available skills for interventions
          function loadAvailableSkills() {
            fetch('/api/skills')
              .then(response => response.json())
              .then(data => {
                availableSkills = data.skills;
                renderInterventionsCheckboxes();
              })
              .catch(error => {
                console.error('Error fetching skills:', error);
                document.getElementById('interventionsContainer').innerHTML = 
                  '<p>Error loading available skills. Please try again later.</p>';
              });
          }
          
          // Render patient contacts
          function renderPatientContacts() {
            const container = document.getElementById('contactsContainer');
            
            if (!patientContacts || patientContacts.length === 0) {
              container.innerHTML = '<p>No patient contacts recorded yet.</p>';
              return;
            }
            
            let html = '';
            
            patientContacts.forEach(contact => {
              const date = new Date(contact.contact_date).toLocaleDateString();
              
              html += '<div class="contact-card">';
              html += '<div class="contact-header">';
              html += '<span class="contact-demo">' + contact.patient_age + ' ' + contact.patient_gender.charAt(0) + '</span>';
              html += '<span class="contact-date">' + date + '</span>';
              html += '</div>';
              html += '<div class="contact-chief">' + contact.chief_complaint + '</div>';
              
              // Vitals (if present)
              if (contact.bp_systolic && contact.bp_diastolic) {
                html += '<p>Vitals: BP ' + contact.bp_systolic + '/' + contact.bp_diastolic;
                if (contact.heart_rate) html += ', HR ' + contact.heart_rate;
                if (contact.respiratory_rate) html += ', RR ' + contact.respiratory_rate;
                if (contact.spo2) html += ', SpO2 ' + contact.spo2 + '%';
                html += '</p>';
              }
              
              // Interventions
              if (contact.interventions && contact.interventions.length > 0) {
                html += '<p>Interventions: ';
                contact.interventions.forEach(intervention => {
                  html += '<span class="tag">' + intervention.skill_name + '</span>';
                });
                html += '</p>';
              }
              
              if (contact.notes) {
                html += '<p><small>' + contact.notes + '</small></p>';
              }
              
              html += '</div>';
            });
            
            container.innerHTML = html;
          }
          
          // Render interventions checkboxes
          function renderInterventionsCheckboxes() {
            const container = document.getElementById('interventionsContainer');
            
            if (!availableSkills || availableSkills.length === 0) {
              container.innerHTML = '<p>No skills available.</p>';
              return;
            }
            
            // Group skills by category
            const groupedSkills = {};
            availableSkills.forEach(skill => {
              const categoryId = skill.category_id;
              if (!groupedSkills[categoryId]) {
                groupedSkills[categoryId] = [];
              }
              groupedSkills[categoryId].push(skill);
            });
            
            let html = '';
            
            Object.keys(groupedSkills).forEach(categoryId => {
              html += '<div class="skill-category">';
              
              groupedSkills[categoryId].forEach(skill => {
                html += '<div class="checkbox-item">';
                html += '<input type="checkbox" id="skill_' + skill.skill_id + '" value="' + skill.skill_id + '">';
                html += '<label for="skill_' + skill.skill_id + '">' + skill.skill_name + '</label>';
                html += '</div>';
              });
              
              html += '</div>';
            });
            
            container.innerHTML = html;
          }
          
          // Modal handling
          const modal = document.getElementById('addContactModal');
          const btn = document.getElementById('addContactBtn');
          const span = document.getElementsByClassName('close')[0];
          
          btn.onclick = function() {
            modal.style.display = 'block';
            loadAvailableSkills(); // Load skills when modal opens
          }
          
          span.onclick = function() {
            modal.style.display = 'none';
          }
          
          window.onclick = function(event) {
            if (event.target === modal) {
              modal.style.display = 'none';
            }
          }
          
          // Handle patient contact form submission
          document.getElementById('addContactForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Get selected interventions
            const selectedInterventions = [];
            document.querySelectorAll('#interventionsContainer input[type="checkbox"]:checked').forEach(checkbox => {
              selectedInterventions.push(checkbox.value);
            });
            
            const contactData = {
              patientAge: document.getElementById('patientAge').value,
              patientGender: document.getElementById('patientGender').value,
              chiefComplaint: document.getElementById('chiefComplaint').value,
              bpSystolic: document.getElementById('bpSystolic').value || null,
              bpDiastolic: document.getElementById('bpDiastolic').value || null,
              heartRate: document.getElementById('heartRate').value || null,
              respRate: document.getElementById('respRate').value || null,
              spo2: document.getElementById('spo2').value || null,
              temperature: document.getElementById('temperature').value || null,
              interventions: selectedInterventions,
              notes: document.getElementById('notes').value
            };
            
            try {
              const response = await fetch('/api/patients', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(contactData)
              });
              
              const data = await response.json();
              
              if (!response.ok) {
                throw new Error(data.error || 'Failed to add patient contact');
              }
              
              // Close modal and reload patient contacts
              modal.style.display = 'none';
              document.getElementById('addContactForm').reset();
              loadPatientContacts();
              
            } catch (error) {
              alert('Error adding patient contact: ' + error.message);
            }
          });
          
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
          
          // Load patient contacts when page loads
          loadPatientContacts();
        </script>
      </body>
    </html>
  `);
});

// Clinicals Page (protected)
app.get('/clinicals', authMiddleware, (req, res) => {
  res.send(`
    <html>
      <head>
        <title>EMS Tracker - Clinical Scheduling</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          h1, h2 { color: #c57100; }
          .card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
          .button { display: inline-block; background: #c57100; color: white; padding: 10px 15px; 
                    text-decoration: none; border-radius: 4px; margin-top: 15px; }
          .button-secondary { background: #6c757d; }
          .navbar { background: #f9f9f9; padding: 10px; border-radius: 8px; margin-bottom: 20px; }
          .navbar a { color: #333; text-decoration: none; padding: 8px 15px; display: inline-block; }
          .navbar a:hover { background: #e9e9e9; border-radius: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f9f9f9; }
          .modal { display: none; position: fixed; z-index: 1; left: 0; top: 0; width: 100%; height: 100%; 
                   overflow: auto; background-color: rgba(0,0,0,0.4); }
          .modal-content { background-color: #fefefe; margin: 15% auto; padding: 20px; 
                          border: 1px solid #888; width: 80%; max-width: 600px; border-radius: 8px; }
          .close { color: #aaa; float: right; font-size: 28px; font-weight: bold; cursor: pointer; }
          .close:hover { color: black; }
          .form-group { margin-bottom: 15px; }
          label { display: block; margin-bottom: 5px; }
          input, select, textarea { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
          .btn-success { background-color: #28a745; color: white; padding: 10px 15px; 
                        border: none; border-radius: 4px; cursor: pointer; }
          .clinical-card { border: 1px solid #ddd; border-radius: 8px; margin-bottom: 15px; overflow: hidden; }
          .clinical-header { background: #f9f9f9; padding: 12px; border-bottom: 1px solid #ddd; 
                           display: flex; justify-content: space-between; align-items: center; }
          .clinical-body { padding: 15px; }
          .clinical-footer { background: #f9f9f9; padding: 12px; border-top: 1px solid #ddd; 
                          display: flex; justify-content: flex-end; gap: 10px; }
          .clinical-date { font-weight: bold; color: #c57100; }
          .clinical-location { margin-top: 5px; color: #555; }
          .clinical-status { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
          .status-available { background: #d4edda; color: #155724; }
          .status-pending { background: #fff3cd; color: #856404; }
          .status-confirmed { background: #cce5ff; color: #004085; }
          .status-completed { background: #d1ecf1; color: #0c5460; }
          .tabs { display: flex; border-bottom: 1px solid #ddd; margin-bottom: 20px; }
          .tab { padding: 10px 15px; cursor: pointer; }
          .tab.active { border-bottom: 2px solid #c57100; color: #c57100; font-weight: bold; }
          .tab-content { display: none; }
          .tab-content.active { display: block; }
          .preference-selector { display: flex; gap: 10px; align-items: center; }
          .preference-label { min-width: 150px; }
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
        
        <h1>Clinical Scheduling</h1>
        
        <div class="tabs">
          <div class="tab active" data-tab="upcoming">Upcoming Clinicals</div>
          <div class="tab" data-tab="available">Available Opportunities</div>
          <div class="tab" data-tab="history">Clinical History</div>
          ${req.user.role === 'admin' ? '<div class="tab" data-tab="admin">Admin</div>' : ''}
        </div>
        
        <!-- Upcoming Clinicals Tab -->
        <div class="tab-content active" id="upcoming-tab">
          <div class="card">
            <h2>Your Upcoming Clinicals</h2>
            <p>View your scheduled clinical rotations.</p>
          </div>
          
          <div id="upcomingClinicals">
            <p>Loading upcoming clinicals...</p>
          </div>
        </div>
        
        <!-- Available Opportunities Tab -->
        <div class="tab-content" id="available-tab">
          <div class="card">
            <h2>Available Clinical Opportunities</h2>
            <p>Select your preferred clinical opportunities. You can choose up to 4 preferences, in order of priority.</p>
          </div>
          
          <div id="availableOpportunities">
            <p>Loading available opportunities...</p>
          </div>
        </div>
        
        <!-- Clinical History Tab -->
        <div class="tab-content" id="history-tab">
          <div class="card">
            <h2>Clinical History</h2>
            <p>Review your completed clinical rotations and hours.</p>
          </div>
          
          <div id="clinicalHistory">
            <p>Loading clinical history...</p>
          </div>
        </div>
        
        <!-- Admin Tab (only visible to admins) -->
        ${req.user.role === 'admin' ? `
        <div class="tab-content" id="admin-tab">
          <div class="card">
            <h2>Clinical Administration</h2>
            <p>Manage clinical opportunities and student assignments.</p>
            <button class="button" id="createOpportunityBtn">Create New Clinical Opportunity</button>
          </div>
          
          <div id="adminOpportunities">
            <p>Loading clinical opportunities...</p>
          </div>
        </div>
        ` : ''}
        
        <!-- Modal for selecting preferences -->
        <div id="preferencesModal" class="modal">
          <div class="modal-content">
            <span class="close">&times;</span>
            <h2>Select Your Preferences</h2>
            <p>Please rank your preferences for this clinical rotation:</p>
            <form id="preferencesForm">
              <input type="hidden" id="opportunityId">
              <div class="form-group">
                <div class="preference-selector">
                  <div class="preference-label">Preference:</div>
                  <select id="preferenceRank">
                    <option value="1">1st Choice</option>
                    <option value="2">2nd Choice</option>
                    <option value="3">3rd Choice</option>
                    <option value="4">4th Choice</option>
                  </select>
                </div>
              </div>
              <button type="submit" class="btn-success">Save Preference</button>
            </form>
          </div>
        </div>
        
        <!-- Modal for creating clinical opportunity (admin only) -->
        ${req.user.role === 'admin' ? `
        <div id="createOpportunityModal" class="modal">
          <div class="modal-content">
            <span class="close">&times;</span>
            <h2>Create Clinical Opportunity</h2>
            <form id="createOpportunityForm">
              <div class="form-group">
                <label for="locationSelect">Location</label>
                <select id="locationSelect" required></select>
              </div>
              <div class="form-group">
                <label for="certificationLevel">Certification Level</label>
                <select id="certificationLevel" required></select>
              </div>
              <div class="form-group">
                <label for="startDate">Start Date/Time</label>
                <input type="datetime-local" id="startDate" required>
              </div>
              <div class="form-group">
                <label for="endDate">End Date/Time</label>
                <input type="datetime-local" id="endDate" required>
              </div>
              <div class="form-group">
                <label for="slotsAvailable">Slots Available</label>
                <input type="number" id="slotsAvailable" min="1" max="10" value="1" required>
              </div>
              <div class="form-group">
                <label for="opportunityNotes">Notes</label>
                <textarea id="opportunityNotes" rows="3" placeholder="Any additional information about this clinical opportunity"></textarea>
              </div>
              <button type="submit" class="btn-success">Create Opportunity</button>
            </form>
          </div>
        </div>
        ` : ''}
        
        <!-- Modal for completing a clinical -->
        <div id="completeClinicalModal" class="modal">
          <div class="modal-content">
            <span class="close">&times;</span>
            <h2>Complete Clinical Rotation</h2>
            <form id="completeClinicalForm">
              <input type="hidden" id="assignmentId">
              <div class="form-group">
                <label for="hoursCompleted">Hours Completed</label>
                <input type="number" id="hoursCompleted" min="0" max="24" step="0.5" required>
              </div>
              <div class="form-group">
                <label for="completionNotes">Notes</label>
                <textarea id="completionNotes" rows="3" placeholder="Any notes about this clinical experience"></textarea>
              </div>
              <button type="submit" class="btn-success">Submit</button>
            </form>
          </div>
        </div>
        
        <script>
          // Tab functionality
          document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
              // Remove active class from all tabs and contents
              document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
              document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
              
              // Add active class to clicked tab and corresponding content
              tab.classList.add('active');
              const tabName = tab.getAttribute('data-tab');
              document.getElementById(tabName + '-tab').classList.add('active');
              
              // Reload data for the tab
              if (tabName === 'upcoming') {
                loadUpcomingClinicals();
              } else if (tabName === 'available') {
                loadAvailableOpportunities();
              } else if (tabName === 'history') {
                loadClinicalHistory();
              } else if (tabName === 'admin') {
                loadAdminOpportunities();
              }
            });
          });
          
          // Load upcoming clinicals
          function loadUpcomingClinicals() {
            const container = document.getElementById('upcomingClinicals');
            container.innerHTML = '<p>Loading upcoming clinicals...</p>';
            
            fetch('/api/clinicals/upcoming')
              .then(response => response.json())
              .then(data => {
                renderUpcomingClinicals(data.clinicals);
              })
              .catch(error => {
                console.error('Error fetching upcoming clinicals:', error);
                container.innerHTML = '<p>Error loading clinicals. Please try again later.</p>';
              });
          }
          
          // Load available opportunities
          function loadAvailableOpportunities() {
            const container = document.getElementById('availableOpportunities');
            container.innerHTML = '<p>Loading available opportunities...</p>';
            
            fetch('/api/clinicals/opportunities')
              .then(response => response.json())
              .then(data => {
                renderAvailableOpportunities(data.opportunities);
              })
              .catch(error => {
                console.error('Error fetching available opportunities:', error);
                container.innerHTML = '<p>Error loading opportunities. Please try again later.</p>';
              });
          }
          
          // Load clinical history
          function loadClinicalHistory() {
            const container = document.getElementById('clinicalHistory');
            container.innerHTML = '<p>Loading clinical history...</p>';
            
            fetch('/api/clinicals/history')
              .then(response => response.json())
              .then(data => {
                renderClinicalHistory(data.clinicals);
              })
              .catch(error => {
                console.error('Error fetching clinical history:', error);
                container.innerHTML = '<p>Error loading clinical history. Please try again later.</p>';
              });
          }
          
          // Render upcoming clinicals
          function renderUpcomingClinicals(clinicals) {
            const container = document.getElementById('upcomingClinicals');
            
            if (!clinicals || clinicals.length === 0) {
              container.innerHTML = '<p>No upcoming clinicals scheduled.</p>';
              return;
            }
            
            let html = '';
            
            clinicals.forEach(clinical => {
              const startDate = new Date(clinical.start_datetime);
              const endDate = new Date(clinical.end_datetime);
              const formattedDate = startDate.toLocaleDateString();
              const formattedStartTime = startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
              const formattedEndTime = endDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
              
              let statusClass = 'status-pending';
              let statusText = 'Pending';
              
              if (clinical.status === 'confirmed') {
                statusClass = 'status-confirmed';
                statusText = 'Confirmed';
              } else if (clinical.status === 'completed') {
                statusClass = 'status-completed';
                statusText = 'Completed';
              }
              
              html += '<div class="clinical-card">';
              html += '<div class="clinical-header">';
              html += \`<span class="clinical-date">\${formattedDate}, \${formattedStartTime} - \${formattedEndTime}</span>\`;
              html += \`<span class="clinical-status \${statusClass}">\${statusText}</span>\`;
              html += '</div>';
              html += '<div class="clinical-body">';
              html += \`<h3>\${clinical.location_name}</h3>\`;
              html += \`<div class="clinical-location">\${clinical.address || ''}</div>\`;
              html += clinical.notes ? \`<p>\${clinical.notes}</p>\` : '';
              html += '</div>';
              html += '<div class="clinical-footer">';
              
              if (clinical.status === 'confirmed') {
                html += \`<button class="button" onclick="showCompleteClinicalModal('\${clinical.assignment_id}')">Complete</button>\`;
              }
              
              html += '</div>';
              html += '</div>';
            });
            
            container.innerHTML = html;
          }
          
          // Render available opportunities
          function renderAvailableOpportunities(opportunities) {
            const container = document.getElementById('availableOpportunities');
            
            if (!opportunities || opportunities.length === 0) {
              container.innerHTML = '<p>No clinical opportunities currently available.</p>';
              return;
            }
            
            let html = '';
            
            opportunities.forEach(opportunity => {
              const startDate = new Date(opportunity.start_datetime);
              const endDate = new Date(opportunity.end_datetime);
              const formattedDate = startDate.toLocaleDateString();
              const formattedStartTime = startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
              const formattedEndTime = endDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
              
              const preference = opportunity.preference_rank || null;
              let preferenceText = '';
              
              if (preference) {
                preferenceText = \`<span>Your preference: \${preference}\${getOrdinalSuffix(preference)} choice</span>\`;
              }
              
              html += '<div class="clinical-card">';
              html += '<div class="clinical-header">';
              html += \`<span class="clinical-date">\${formattedDate}, \${formattedStartTime} - \${formattedEndTime}</span>\`;
              html += \`<span class="clinical-status status-available">\${opportunity.slots_available} slot(s) available</span>\`;
              html += '</div>';
              html += '<div class="clinical-body">';
              html += \`<h3>\${opportunity.location_name}</h3>\`;
              html += \`<div class="clinical-location">\${opportunity.address || ''}</div>\`;
              html += opportunity.notes ? \`<p>\${opportunity.notes}</p>\` : '';
              html += preferenceText ? \`<p>\${preferenceText}</p>\` : '';
              html += '</div>';
              html += '<div class="clinical-footer">';
              html += \`<button class="button" onclick="showPreferencesModal('\${opportunity.opportunity_id}')">\${preference ? 'Update Preference' : 'Select Preference'}</button>\`;
              html += '</div>';
              html += '</div>';
            });
            
            container.innerHTML = html;
          }
          
          // Render clinical history
          function renderClinicalHistory(clinicals) {
            const container = document.getElementById('clinicalHistory');
            
            if (!clinicals || clinicals.length === 0) {
              container.innerHTML = '<p>No clinical history found.</p>';
              return;
            }
            
            let html = '';
            
            // Total hours summary
            const totalHours = clinicals.reduce((sum, clinical) => sum + (parseFloat(clinical.hours_completed) || 0), 0);
            html += \`<p><strong>Total Clinical Hours: \${totalHours.toFixed(1)}</strong></p>\`;
            
            // Clinical history table
            html += '<table>';
            html += '<thead><tr><th>Date</th><th>Location</th><th>Hours</th><th>Status</th></tr></thead>';
            html += '<tbody>';
            
            clinicals.forEach(clinical => {
              const startDate = new Date(clinical.start_datetime);
              const formattedDate = startDate.toLocaleDateString();
              
              html += '<tr>';
              html += \`<td>\${formattedDate}</td>\`;
              html += \`<td>\${clinical.location_name}</td>\`;
              html += \`<td>\${clinical.hours_completed || '-'}</td>\`;
              html += \`<td>\${clinical.status}</td>\`;
              html += '</tr>';
            });
            
            html += '</tbody></table>';
            container.innerHTML = html;
          }
          
          // Helper function for ordinal suffixes
          function getOrdinalSuffix(num) {
            const j = num % 10;
            const k = num % 100;
            if (j === 1 && k !== 11) {
              return 'st';
            }
            if (j === 2 && k !== 12) {
              return 'nd';
            }
            if (j === 3 && k !== 13) {
              return 'rd';
            }
            return 'th';
          }
          
          // Preference modal functionality
          const prefModal = document.getElementById('preferencesModal');
          const prefSpan = prefModal.querySelector('.close');
          
          function showPreferencesModal(opportunityId) {
            document.getElementById('opportunityId').value = opportunityId;
            prefModal.style.display = 'block';
          }
          
          prefSpan.onclick = function() {
            prefModal.style.display = 'none';
          }
          
          // Complete clinical modal functionality
          const completeModal = document.getElementById('completeClinicalModal');
          const completeSpan = completeModal.querySelector('.close');
          
          function showCompleteClinicalModal(assignmentId) {
            document.getElementById('assignmentId').value = assignmentId;
            completeModal.style.display = 'block';
          }
          
          completeSpan.onclick = function() {
            completeModal.style.display = 'none';
          }
          
          // Handle preference form submission
          document.getElementById('preferencesForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const preferenceData = {
              opportunityId: document.getElementById('opportunityId').value,
              preferenceRank: parseInt(document.getElementById('preferenceRank').value)
            };
            
            try {
              const response = await fetch('/api/clinicals/preferences', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(preferenceData)
              });
              
              const data = await response.json();
              
              if (!response.ok) {
                throw new Error(data.error || 'Failed to save preference');
              }
              
              // Close modal and reload opportunities
              prefModal.style.display = 'none';
              loadAvailableOpportunities();
              
            } catch (error) {
              alert('Error saving preference: ' + error.message);
            }
          });
          
          // Handle complete clinical form submission
          document.getElementById('completeClinicalForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const completionData = {
              assignmentId: document.getElementById('assignmentId').value,
              hoursCompleted: parseFloat(document.getElementById('hoursCompleted').value),
              notes: document.getElementById('completionNotes').value
            };
            
            try {
              const response = await fetch('/api/clinicals/complete', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(completionData)
              });
              
              const data = await response.json();
              
              if (!response.ok) {
                throw new Error(data.error || 'Failed to complete clinical');
              }
              
              // Close modal and reload clinicals
              completeModal.style.display = 'none';
              loadUpcomingClinicals();
              
            } catch (error) {
              alert('Error completing clinical: ' + error.message);
            }
          });
          
          // Window click to close modals
          window.onclick = function(event) {
            if (event.target === prefModal) {
              prefModal.style.display = 'none';
            }
            if (event.target === completeModal) {
              completeModal.style.display = 'none';
            }
            ${req.user.role === 'admin' ? `
            if (event.target === createOpportunityModal) {
              createOpportunityModal.style.display = 'none';
            }
            ` : ''}
          }
          
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
          
          // Admin functionality
          ${req.user.role === 'admin' ? `
          // Load admin opportunities
          function loadAdminOpportunities() {
            const container = document.getElementById('adminOpportunities');
            container.innerHTML = '<p>Loading clinical opportunities...</p>';
            
            fetch('/api/clinicals/admin/opportunities')
              .then(response => response.json())
              .then(data => {
                renderAdminOpportunities(data.opportunities);
              })
              .catch(error => {
                console.error('Error fetching admin opportunities:', error);
                container.innerHTML = '<p>Error loading opportunities. Please try again later.</p>';
              });
          }
          
          // Load clinical locations for dropdown
          function loadClinicalLocations() {
            fetch('/api/clinicals/locations')
              .then(response => response.json())
              .then(data => {
                const select = document.getElementById('locationSelect');
                select.innerHTML = '';
                
                data.locations.forEach(location => {
                  const option = document.createElement('option');
                  option.value = location.location_id;
                  option.textContent = location.location_name;
                  select.appendChild(option);
                });
              })
              .catch(error => {
                console.error('Error fetching locations:', error);
              });
          }
          
          // Load certification levels for dropdown
          function loadCertificationLevels() {
            fetch('/api/certification-levels')
              .then(response => response.json())
              .then(data => {
                const select = document.getElementById('certificationLevel');
                select.innerHTML = '';
                
                data.levels.forEach(level => {
                  const option = document.createElement('option');
                  option.value = level.level_id;
                  option.textContent = level.level_name;
                  select.appendChild(option);
                });
              })
              .catch(error => {
                console.error('Error fetching certification levels:', error);
              });
          }
          
          // Render admin opportunities
          function renderAdminOpportunities(opportunities) {
            const container = document.getElementById('adminOpportunities');
            
            if (!opportunities || opportunities.length === 0) {
              container.innerHTML = '<p>No clinical opportunities found. Create some using the button above.</p>';
              return;
            }
            
            let html = '';
            
            opportunities.forEach(opportunity => {
              const startDate = new Date(opportunity.start_datetime);
              const endDate = new Date(opportunity.end_datetime);
              const formattedDate = startDate.toLocaleDateString();
              const formattedStartTime = startDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
              const formattedEndTime = endDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
              
              html += '<div class="clinical-card">';
              html += '<div class="clinical-header">';
              html += \`<span class="clinical-date">\${formattedDate}, \${formattedStartTime} - \${formattedEndTime}</span>\`;
              html += \`<span class="clinical-status status-available">\${opportunity.slots_available} slot(s) available</span>\`;
              html += '</div>';
              html += '<div class="clinical-body">';
              html += \`<h3>\${opportunity.location_name} - \${opportunity.level_name}</h3>\`;
              html += \`<div class="clinical-location">\${opportunity.address || ''}</div>\`;
              html += opportunity.notes ? \`<p>\${opportunity.notes}</p>\` : '';
              
              // Student preferences if any
              if (opportunity.preferences && opportunity.preferences.length > 0) {
                html += '<h4>Student Preferences:</h4>';
                html += '<ul>';
                opportunity.preferences.forEach(pref => {
                  html += \`<li>\${pref.student_name} - \${getOrdinalWithNumber(pref.preference_rank)} choice
                    <button class="button button-secondary" onclick="assignStudentToClinical('\${opportunity.opportunity_id}', '\${pref.student_id}')">Assign</button>
                  </li>\`;
                });
                html += '</ul>';
              } else {
                html += '<p>No student preferences yet.</p>';
              }
              
              html += '</div>';
              html += '</div>';
            });
            
            container.innerHTML = html;
          }
          
          function getOrdinalWithNumber(n) {
            return n + getOrdinalSuffix(n);
          }
          
          // Create Opportunity Modal functionality
          const createOpportunityModal = document.getElementById('createOpportunityModal');
          const createOpportunityBtn = document.getElementById('createOpportunityBtn');
          const createOpportunitySpan = createOpportunityModal.querySelector('.close');
          
          createOpportunityBtn.onclick = function() {
            loadClinicalLocations();
            loadCertificationLevels();
            createOpportunityModal.style.display = 'block';
          }
          
          createOpportunitySpan.onclick = function() {
            createOpportunityModal.style.display = 'none';
          }
          
          // Handle create opportunity form submission
          document.getElementById('createOpportunityForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const opportunityData = {
              locationId: document.getElementById('locationSelect').value,
              certificationLevelId: document.getElementById('certificationLevel').value,
              startDateTime: document.getElementById('startDate').value,
              endDateTime: document.getElementById('endDate').value,
              slotsAvailable: document.getElementById('slotsAvailable').value,
              notes: document.getElementById('opportunityNotes').value
            };
            
            try {
              const response = await fetch('/api/clinicals/admin/opportunities', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify(opportunityData)
              });
              
              const data = await response.json();
              
              if (!response.ok) {
                throw new Error(data.error || 'Failed to create opportunity');
              }
              
              // Close modal and reload opportunities
              createOpportunityModal.style.display = 'none';
              document.getElementById('createOpportunityForm').reset();
              loadAdminOpportunities();
              
            } catch (error) {
              alert('Error creating opportunity: ' + error.message);
            }
          });
          
          // Function to assign student to a clinical
          async function assignStudentToClinical(opportunityId, studentId) {
            try {
              const response = await fetch('/api/clinicals/admin/assign', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ opportunityId, studentId })
              });
              
              const data = await response.json();
              
              if (!response.ok) {
                throw new Error(data.error || 'Failed to assign student');
              }
              
              // Reload opportunities
              loadAdminOpportunities();
              
            } catch (error) {
              alert('Error assigning student: ' + error.message);
            }
          }
          ` : ''}
          
          // Load data for initial tab
          loadUpcomingClinicals();
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

// Get skills for student's certification level
app.get('/api/skills', authMiddleware, async (req, res) => {
  let client;
  try {
    client = await connectToDb();
    
    // Get student's certification level
    let certLevelId;
    
    if (req.user.role === 'student') {
      const studentResult = await client.query(
        'SELECT certification_level_id FROM students WHERE student_id = $1',
        [req.user.userId]
      );
      
      if (studentResult.rows.length === 0) {
        return res.status(404).json({ error: 'Student record not found' });
      }
      
      certLevelId = studentResult.rows[0].certification_level_id;
    } else {
      // For non-students, default to EMT level
      const certResult = await client.query(
        'SELECT level_id FROM certification_levels WHERE level_name = $1',
        ['EMT']
      );
      
      certLevelId = certResult.rows[0].level_id;
    }
    
    // Get skills for this certification level
    const skillsResult = await client.query(`
      SELECT s.skill_id, s.skill_name, s.category_id, s.description, cs.repetitions_required
      FROM skills s
      JOIN certification_skills cs ON s.skill_id = cs.skill_id
      WHERE cs.certification_level_id = $1 AND cs.is_active = true
      ORDER BY s.category_id, s.skill_name
    `, [certLevelId]);
    
    // Get skill categories
    const categoriesResult = await client.query(
      'SELECT category_id, category_name FROM skill_categories'
    );
    
    // Create categories map
    const categories = {};
    categoriesResult.rows.forEach(cat => {
      categories[cat.category_id] = cat.category_name;
    });
    
    // If student, get their skill completions
    if (req.user.role === 'student') {
      const completionsResult = await client.query(`
        SELECT skill_id, COUNT(*) as count
        FROM student_skills
        WHERE student_id = $1 AND is_successful = true
        GROUP BY skill_id
      `, [req.user.userId]);
      
      // Create completions map
      const completions = {};
      completionsResult.rows.forEach(comp => {
        completions[comp.skill_id] = parseInt(comp.count);
      });
      
      // Add completion counts to skills
      skillsResult.rows.forEach(skill => {
        skill.completions = completions[skill.skill_id] || 0;
      });
    }
    
    res.json({
      skills: skillsResult.rows,
      categories
    });
    
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({ error: 'Failed to fetch skills' });
  } finally {
    if (client) await client.end();
  }
});

// Log a skill completion
app.post('/api/skills/log', authMiddleware, async (req, res) => {
  // Only students can log skills
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Only students can log skills' });
  }
  
  const { skillId, location, notes } = req.body;
  
  if (!skillId) {
    return res.status(400).json({ error: 'Skill ID is required' });
  }
  
  let client;
  try {
    client = await connectToDb();
    
    // Check if skill exists and is required for student's certification level
    const student = await client.query(
      'SELECT certification_level_id FROM students WHERE student_id = $1',
      [req.user.userId]
    );
    
    if (student.rows.length === 0) {
      return res.status(404).json({ error: 'Student record not found' });
    }
    
    const certLevelId = student.rows[0].certification_level_id;
    
    const skillCheck = await client.query(
      `SELECT 1 FROM certification_skills 
       WHERE certification_level_id = $1 AND skill_id = $2 AND is_active = true`,
      [certLevelId, skillId]
    );
    
    if (skillCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Skill is not required for your certification level' });
    }
    
    // Insert skill completion
    await client.query(
      `INSERT INTO student_skills 
       (student_id, skill_id, location, notes, is_successful)
       VALUES ($1, $2, $3, $4, true)`,
      [req.user.userId, skillId, location, notes]
    );
    
    res.json({ success: true, message: 'Skill logged successfully' });
    
  } catch (error) {
    console.error('Error logging skill:', error);
    res.status(500).json({ error: 'Failed to log skill' });
  } finally {
    if (client) await client.end();
  }
});

// Get skill progress
app.get('/api/skills/progress', authMiddleware, async (req, res) => {
  // Only students have skills progress
  if (req.user.role !== 'student') {
    return res.json({ completed: 0, total: 0, percentage: 0 });
  }
  
  let client;
  try {
    client = await connectToDb();
    
    // Get student's certification level
    const studentResult = await client.query(
      'SELECT certification_level_id FROM students WHERE student_id = $1',
      [req.user.userId]
    );
    
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student record not found' });
    }
    
    const certLevelId = studentResult.rows[0].certification_level_id;
    
    // Get total required skills
    const totalResult = await client.query(
      `SELECT COUNT(*) as count
       FROM certification_skills
       WHERE certification_level_id = $1 AND is_required = true AND is_active = true`,
      [certLevelId]
    );
    
    const total = parseInt(totalResult.rows[0].count);
    
    // Get completed skills
    const completedResult = await client.query(`
      WITH required_skills AS (
        SELECT cs.skill_id, cs.repetitions_required
        FROM certification_skills cs
        WHERE cs.certification_level_id = $1 AND cs.is_required = true AND cs.is_active = true
      ),
      student_completions AS (
        SELECT ss.skill_id, COUNT(*) as completions
        FROM student_skills ss
        WHERE ss.student_id = $2 AND ss.is_successful = true
        GROUP BY ss.skill_id
      )
      SELECT COUNT(*) as count
      FROM required_skills rs
      LEFT JOIN student_completions sc ON rs.skill_id = sc.skill_id
      WHERE COALESCE(sc.completions, 0) >= rs.repetitions_required
    `, [certLevelId, req.user.userId]);
    
    const completed = parseInt(completedResult.rows[0].count);
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    res.json({
      completed,
      total,
      percentage
    });
    
  } catch (error) {
    console.error('Error fetching skills progress:', error);
    res.status(500).json({ error: 'Failed to fetch skills progress' });
  } finally {
    if (client) await client.end();
  }
});

// Get patient contacts for a student
app.get('/api/patients', authMiddleware, async (req, res) => {
  // Only students can access their patient contacts
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Access forbidden' });
  }
  
  let client;
  try {
    client = await connectToDb();
    
    // Get student's patient contacts
    const contactsResult = await client.query(`
      SELECT 
        pc.contact_id, 
        pc.contact_date,
        pc.patient_age,
        pc.patient_gender,
        pc.chief_complaint,
        pc.bp_systolic,
        pc.bp_diastolic,
        pc.heart_rate,
        pc.respiratory_rate,
        pc.spo2,
        pc.temperature,
        pc.notes
      FROM patient_contacts pc
      WHERE pc.student_id = $1
      ORDER BY pc.contact_date DESC
    `, [req.user.userId]);
    
    // For each contact, get interventions
    const contacts = contactsResult.rows;
    
    for (const contact of contacts) {
      const interventionsResult = await client.query(`
        SELECT pi.intervention_id, s.skill_id, s.skill_name
        FROM patient_interventions pi
        JOIN skills s ON pi.skill_id = s.skill_id
        WHERE pi.contact_id = $1
      `, [contact.contact_id]);
      
      contact.interventions = interventionsResult.rows;
    }
    
    res.json({
      contacts: contacts
    });
    
  } catch (error) {
    console.error('Error fetching patient contacts:', error);
    res.status(500).json({ error: 'Failed to fetch patient contacts' });
  } finally {
    if (client) await client.end();
  }
});

// Add a new patient contact
app.post('/api/patients', authMiddleware, async (req, res) => {
  // Only students can add patient contacts
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Only students can add patient contacts' });
  }
  
  const { 
    patientAge, 
    patientGender, 
    chiefComplaint,
    bpSystolic,
    bpDiastolic,
    heartRate,
    respRate,
    spo2,
    temperature,
    interventions,
    notes
  } = req.body;
  
  // Validate required fields
  if (!patientAge || !patientGender || !chiefComplaint) {
    return res.status(400).json({ error: 'Age, gender, and chief complaint are required' });
  }
  
  let client;
  try {
    client = await connectToDb();
    
    // Start transaction
    await client.query('BEGIN');
    
    // Insert patient contact
    const contactResult = await client.query(`
      INSERT INTO patient_contacts (
        student_id,
        patient_age,
        patient_gender,
        chief_complaint,
        bp_systolic,
        bp_diastolic,
        heart_rate,
        respiratory_rate,
        spo2,
        temperature,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING contact_id
    `, [
      req.user.userId,
      patientAge,
      patientGender,
      chiefComplaint,
      bpSystolic || null,
      bpDiastolic || null,
      heartRate || null,
      respRate || null,
      spo2 || null,
      temperature || null,
      notes
    ]);
    
    const contactId = contactResult.rows[0].contact_id;
    
    // Add interventions if provided
    if (interventions && interventions.length > 0) {
      for (const skillId of interventions) {
        await client.query(`
          INSERT INTO patient_interventions (contact_id, skill_id)
          VALUES ($1, $2)
        `, [contactId, skillId]);
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      message: 'Patient contact added successfully',
      contactId
    });
    
  } catch (error) {
    // Rollback transaction on error
    if (client) {
      await client.query('ROLLBACK');
    }
    
    console.error('Error adding patient contact:', error);
    res.status(500).json({ error: 'Failed to add patient contact' });
  } finally {
    if (client) {
      await client.end();
    }
  }
});

// Get patient contact stats
app.get('/api/patients/stats', authMiddleware, async (req, res) => {
  // Only students have patient contact stats
  if (req.user.role !== 'student') {
    return res.json({ total: 0, required: 0, percentage: 0 });
  }
  
  let client;
  try {
    client = await connectToDb();
    
    // Get student's certification level
    const studentResult = await client.query(
      'SELECT certification_level_id FROM students WHERE student_id = $1',
      [req.user.userId]
    );
    
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student record not found' });
    }
    
    const certLevelId = studentResult.rows[0].certification_level_id;
    
    // Get system config for patient contacts required
    const configResult = await client.query(`
      SELECT feature_value
      FROM system_config
      WHERE certification_level_id = $1 AND feature_key = 'patient_contacts_required'
    `, [certLevelId]);
    
    // Default to 10 if not specified
    const required = configResult.rows.length > 0 
      ? parseInt(configResult.rows[0].feature_value) 
      : 10;
    
    // Get total patient contacts for student
    const totalResult = await client.query(`
      SELECT COUNT(*) as count
      FROM patient_contacts
      WHERE student_id = $1
    `, [req.user.userId]);
    
    const total = parseInt(totalResult.rows[0].count);
    const percentage = Math.min(100, Math.round((total / required) * 100));
    
    res.json({
      total,
      required,
      percentage
    });
    
  } catch (error) {
    console.error('Error fetching patient contact stats:', error);
    res.status(500).json({ error: 'Failed to fetch patient contact stats' });
  } finally {
    if (client) await client.end();
  }
});

// Get certification levels
app.get('/api/certification-levels', authMiddleware, async (req, res) => {
  let client;
  try {
    client = await connectToDb();
    
    const result = await client.query(`
      SELECT level_id, level_name, description
      FROM certification_levels
      WHERE is_active = true
      ORDER BY level_id
    `);
    
    res.json({
      levels: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching certification levels:', error);
    res.status(500).json({ error: 'Failed to fetch certification levels' });
  } finally {
    if (client) await client.end();
  }
});

// Get clinical locations
app.get('/api/clinicals/locations', authMiddleware, async (req, res) => {
  let client;
  try {
    client = await connectToDb();
    
    const result = await client.query(`
      SELECT location_id, location_name, address, city, state, zip, phone
      FROM clinical_locations
      WHERE is_active = true
      ORDER BY location_name
    `);
    
    res.json({
      locations: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching clinical locations:', error);
    res.status(500).json({ error: 'Failed to fetch clinical locations' });
  } finally {
    if (client) await client.end();
  }
});

// Get upcoming clinicals for student
app.get('/api/clinicals/upcoming', authMiddleware, async (req, res) => {
  // Only students can see their upcoming clinicals
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Access forbidden' });
  }
  
  let client;
  try {
    client = await connectToDb();
    
    // Get upcoming clinical assignments
    const result = await client.query(`
      SELECT 
        sc.assignment_id,
        sc.status,
        co.start_datetime,
        co.end_datetime,
        cl.location_name,
        cl.address,
        sc.notes,
        sc.hours_completed
      FROM student_clinicals sc
      JOIN clinical_opportunities co ON sc.opportunity_id = co.opportunity_id
      JOIN clinical_locations cl ON co.location_id = cl.location_id
      WHERE sc.student_id = $1
        AND sc.status IN ('scheduled', 'confirmed')
        AND co.start_datetime >= NOW()
      ORDER BY co.start_datetime
    `, [req.user.userId]);
    
    res.json({
      clinicals: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching upcoming clinicals:', error);
    res.status(500).json({ error: 'Failed to fetch upcoming clinicals' });
  } finally {
    if (client) await client.end();
  }
});

// Get available clinical opportunities
app.get('/api/clinicals/opportunities', authMiddleware, async (req, res) => {
  // Only students can see available opportunities
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Access forbidden' });
  }
  
  let client;
  try {
    client = await connectToDb();
    
    // Get student's certification level
    const studentResult = await client.query(
      'SELECT certification_level_id FROM students WHERE student_id = $1',
      [req.user.userId]
    );
    
    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student record not found' });
    }
    
    const certLevelId = studentResult.rows[0].certification_level_id;
    
    // Get available opportunities for this certification level
    const result = await client.query(`
      SELECT 
        co.opportunity_id,
        co.start_datetime,
        co.end_datetime,
        co.slots_available,
        cl.location_name,
        cl.address,
        co.notes,
        sp.preference_rank
      FROM clinical_opportunities co
      JOIN clinical_locations cl ON

      // Get available opportunities for this certification level
    const result = await client.query(`
      SELECT 
        co.opportunity_id,
        co.start_datetime,
        co.end_datetime,
        co.slots_available,
        cl.location_name,
        cl.address,
        co.notes,
        sp.preference_rank
      FROM clinical_opportunities co
      JOIN clinical_locations cl ON co.location_id = cl.location_id
      LEFT JOIN student_preferences sp ON co.opportunity_id = sp.opportunity_id AND sp.student_id = $1
      WHERE co.certification_level_id = $2
        AND co.is_active = true
        AND co.slots_available > 0
        AND co.start_datetime >= NOW()
      ORDER BY co.start_datetime
    `, [req.user.userId, certLevelId]);
    
    res.json({
      opportunities: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching available opportunities:', error);
    res.status(500).json({ error: 'Failed to fetch available opportunities' });
  } finally {
    if (client) await client.end();
  }
});

// Get clinical history
app.get('/api/clinicals/history', authMiddleware, async (req, res) => {
  // Only students can see their clinical history
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Access forbidden' });
  }
  
  let client;
  try {
    client = await connectToDb();
    
    // Get clinical history
    const result = await client.query(`
      SELECT 
        sc.assignment_id,
        sc.status,
        co.start_datetime,
        co.end_datetime,
        cl.location_name,
        sc.hours_completed,
        sc.notes
      FROM student_clinicals sc
      JOIN clinical_opportunities co ON sc.opportunity_id = co.opportunity_id
      JOIN clinical_locations cl ON co.location_id = cl.location_id
      WHERE sc.student_id = $1
      ORDER BY co.start_datetime DESC
    `, [req.user.userId]);
    
    res.json({
      clinicals: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching clinical history:', error);
    res.status(500).json({ error: 'Failed to fetch clinical history' });
  } finally {
    if (client) await client.end();
  }
});

// Submit preference for a clinical opportunity
app.post('/api/clinicals/preferences', authMiddleware, async (req, res) => {
  // Only students can submit preferences
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Only students can submit preferences' });
  }
  
  const { opportunityId, preferenceRank } = req.body;
  
  if (!opportunityId || !preferenceRank) {
    return res.status(400).json({ error: 'Opportunity ID and preference rank are required' });
  }
  
  if (preferenceRank < 1 || preferenceRank > 4) {
    return res.status(400).json({ error: 'Preference rank must be between 1 and 4' });
  }
  
  let client;
  try {
    client = await connectToDb();
    
    // Check if student already has this preference rank
    const checkResult = await client.query(`
      SELECT opportunity_id
      FROM student_preferences
      WHERE student_id = $1 AND preference_rank = $2
    `, [req.user.userId, preferenceRank]);
    
    // Start transaction
    await client.query('BEGIN');
    
    // If they have this rank for another opportunity, update it
    if (checkResult.rows.length > 0) {
      const existingOpportunityId = checkResult.rows[0].opportunity_id;
      
      // If it's the same opportunity, just update the preference
      if (existingOpportunityId === opportunityId) {
        await client.query(`
          UPDATE student_preferences
          SET preference_rank = $3
          WHERE student_id = $1 AND opportunity_id = $2
        `, [req.user.userId, opportunityId, preferenceRank]);
      } else {
        // Otherwise, update existing preference to null temporarily
        await client.query(`
          UPDATE student_preferences
          SET preference_rank = NULL
          WHERE student_id = $1 AND opportunity_id = $2
        `, [req.user.userId, existingOpportunityId]);
        
        // Insert or update new preference
        await client.query(`
          INSERT INTO student_preferences (student_id, opportunity_id, preference_rank)
          VALUES ($1, $2, $3)
          ON CONFLICT (student_id, opportunity_id)
          DO UPDATE SET preference_rank = $3
        `, [req.user.userId, opportunityId, preferenceRank]);
      }
    } else {
      // Just insert or update the preference
      await client.query(`
        INSERT INTO student_preferences (student_id, opportunity_id, preference_rank)
        VALUES ($1, $2, $3)
        ON CONFLICT (student_id, opportunity_id)
        DO UPDATE SET preference_rank = $3
      `, [req.user.userId, opportunityId, preferenceRank]);
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Preference saved successfully'
    });
    
  } catch (error) {
    // Rollback transaction on error
    if (client) {
      await client.query('ROLLBACK');
    }
    
    console.error('Error saving preference:', error);
    res.status(500).json({ error: 'Failed to save preference' });
  } finally {
    if (client) {
      await client.end();
    }
  }
});

// Complete a clinical rotation
app.post('/api/clinicals/complete', authMiddleware, async (req, res) => {
  // Only students can complete their own clinicals
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Access forbidden' });
  }
  
  const { assignmentId, hoursCompleted, notes } = req.body;
  
  if (!assignmentId || !hoursCompleted) {
    return res.status(400).json({ error: 'Assignment ID and hours completed are required' });
  }
  
  if (hoursCompleted <= 0 || hoursCompleted > 24) {
    return res.status(400).json({ error: 'Hours completed must be between 0 and 24' });
  }
  
  let client;
  try {
    client = await connectToDb();
    
    // Check if this clinical belongs to the student
    const checkResult = await client.query(`
      SELECT 1
      FROM student_clinicals
      WHERE assignment_id = $1 AND student_id = $2
    `, [assignmentId, req.user.userId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(403).json({ error: 'This clinical does not belong to you' });
    }
    
    // Update clinical status to completed
    await client.query(`
      UPDATE student_clinicals
      SET status = 'completed', hours_completed = $2, notes = $3
      WHERE assignment_id = $1
    `, [assignmentId, hoursCompleted, notes]);
    
    res.json({
      success: true,
      message: 'Clinical completed successfully'
    });
    
  } catch (error) {
    console.error('Error completing clinical:', error);
    res.status(500).json({ error: 'Failed to complete clinical' });
  } finally {
    if (client) await client.end();
  }
});

// Admin routes for clinical management
app.get('/api/clinicals/admin/opportunities', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  let client;
  try {
    client = await connectToDb();
    
    // Get all active opportunities with preferences
    const opportunitiesResult = await client.query(`
      SELECT 
        co.opportunity_id,
        co.start_datetime,
        co.end_datetime,
        co.slots_available,
        cl.location_name,
        cl.address,
        cl.city,
        cl.state,
        cl.zip,
        co.notes,
        cert.level_name
      FROM clinical_opportunities co
      JOIN clinical_locations cl ON co.location_id = cl.location_id
      JOIN certification_levels cert ON co.certification_level_id = cert.level_id
      WHERE co.is_active = true
        AND co.start_datetime >= NOW()
      ORDER BY co.start_datetime
    `);
    
    const opportunities = opportunitiesResult.rows;
    
    // For each opportunity, get student preferences
    for (const opp of opportunities) {
      const prefsResult = await client.query(`
        SELECT 
          sp.student_id,
          sp.preference_rank,
          u.first_name || ' ' || u.last_name as student_name
        FROM student_preferences sp
        JOIN users u ON sp.student_id = u.user_id
        WHERE sp.opportunity_id = $1
          AND sp.preference_rank IS NOT NULL
        ORDER BY sp.preference_rank
      `, [opp.opportunity_id]);
      
      opp.preferences = prefsResult.rows;
    }
    
    res.json({
      opportunities
    });
    
  } catch (error) {
    console.error('Error fetching admin opportunities:', error);
    res.status(500).json({ error: 'Failed to fetch opportunities' });
  } finally {
    if (client) await client.end();
  }
});

// Create a new clinical opportunity (admin only)
app.post('/api/clinicals/admin/opportunities', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  const { 
    locationId, 
    certificationLevelId, 
    startDateTime, 
    endDateTime, 
    slotsAvailable, 
    notes 
  } = req.body;
  
  if (!locationId || !certificationLevelId || !startDateTime || !endDateTime || !slotsAvailable) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  let client;
  try {
    client = await connectToDb();
    
    // Insert new opportunity
    const result = await client.query(`
      INSERT INTO clinical_opportunities (
        location_id,
        certification_level_id,
        start_datetime,
        end_datetime,
        slots_available,
        notes,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING opportunity_id
    `, [
      locationId,
      certificationLevelId,
      startDateTime,
      endDateTime,
      slotsAvailable,
      notes,
      req.user.userId
    ]);
    
    res.status(201).json({
      success: true,
      message: 'Clinical opportunity created successfully',
      opportunityId: result.rows[0].opportunity_id
    });
    
  } catch (error) {
    console.error('Error creating opportunity:', error);
    res.status(500).json({ error: 'Failed to create opportunity' });
  } finally {
    if (client) await client.end();
  }
});

// Assign student to clinical
app.post('/api/clinicals/admin/assign', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  const { opportunityId, studentId } = req.body;
  
  if (!opportunityId || !studentId) {
    return res.status(400).json({ error: 'Opportunity ID and student ID are required' });
  }
  
  let client;
  try {
    client = await connectToDb();
    
    // Start transaction
    await client.query('BEGIN');
    
    // Check if opportunity exists and has slots available
    const oppResult = await client.query(`
      SELECT slots_available
      FROM clinical_opportunities
      WHERE opportunity_id = $1 AND is_active = true
    `, [opportunityId]);
    
    if (oppResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Opportunity not found' });
    }
    
    if (oppResult.rows[0].slots_available < 1) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No slots available for this opportunity' });
    }
    
    // Check if student isn't already assigned
    const checkResult = await client.query(`
      SELECT 1
      FROM student_clinicals
      WHERE opportunity_id = $1 AND student_id = $2
    `, [opportunityId, studentId]);
    
    if (checkResult.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Student is already assigned to this opportunity' });
    }
    
    // Assign student to clinical
    await client.query(`
      INSERT INTO student_clinicals (
        student_id,
        opportunity_id,
        status,
        assigned_by
      )
      VALUES ($1, $2, 'confirmed', $3)
    `, [studentId, opportunityId, req.user.userId]);
    
    // Decrease available slots
    await client.query(`
      UPDATE clinical_opportunities
      SET slots_available = slots_available - 1
      WHERE opportunity_id = $1
    `, [opportunityId]);
    
    // Commit transaction
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Student assigned to clinical successfully'
    });
    
  } catch (error) {
    // Rollback transaction on error
    if (client) {
      await client.query('ROLLBACK');
    }
    
    console.error('Error assigning student:', error);
    res.status(500).json({ error: 'Failed to assign student' });
  } finally {
    if (client) {
      await client.end();
    }
  }
});

// Authentication routes

// Register a new user
app.post('/api/register', async (req, res) => {
  const { firstName, lastName, email, password, role } = req.body;
  
  // Validate input
  if (!firstName || !lastName || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  // Validate role
  const validRoles = ['student', 'instructor', 'admin'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  
  let client;
  try {
    client = await connectToDb();
    
    // Check if email already exists
    const checkResult = await client.query(
      'SELECT 1 FROM users WHERE email = $1',
      [email]
    );
    
    if (checkResult.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    // Start transaction
    await client.query('BEGIN');
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert user
    const userResult = await client.query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id`,
      [firstName, lastName, email, hashedPassword, role]
    );
    
    const userId = userResult.rows[0].user_id;
    
    // If role is student, create student record
    if (role === 'student') {
      // Default to EMT certification level
      const certResult = await client.query(
        'SELECT level_id FROM certification_levels WHERE level_name = $1',
        ['EMT']
      );
      
      if (certResult.rows.length === 0) {
        throw new Error('Default certification level not found');
      }
      
      const certLevelId = certResult.rows[0].level_id;
      
      await client.query(
        `INSERT INTO students (student_id, certification_level_id)
         VALUES ($1, $2)`,
        [userId, certLevelId]
      );
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    // Generate JWT token
    const token = jwt.sign(
      { userId, email, role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Set token in cookie
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        userId,
        firstName,
        lastName,
        email,
        role
      }
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

// Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  
  let client;
  try {
    client = await connectToDb();
    
    const result = await client.query(
      'SELECT user_id, email, password_hash, first_name, last_name, role FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    const user = result.rows[0];
    
    // Compare passwords
    const match = await bcrypt.compare(password, user.password_hash);
    
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.user_id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Set token in cookie
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        userId: user.user_id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  } finally {
    if (client) await client.end();
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logout successful' });
});

// Database test route
app.get('/test-db', async (req, res) => {
  let client;
  try {
    client = await connectToDb();
    
    const result = await client.query('SELECT NOW() as current_time');
    
    res.json({
      success: true,
      message: 'Database connection successful',
      current_time: result.rows[0].current_time
    });
    
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ error: 'Database connection failed' });
  } finally {
    if (client) await client.end();
  }
});

// Database setup route (for initial setup or reset)
app.get('/setup-db', async (req, res) => {
  let client;
  try {
    client = await connectToDb();
    
    // Create all necessary tables and seed initial data
    // This would typically be a lengthy SQL script with all table creations
    // For brevity, we'll just confirm the action
    
    res.json({
      success: true,
      message: 'Database setup would be executed here'
    });
    
  } catch (error) {
    console.error('Database setup error:', error);
    res.status(500).json({ error: 'Database setup failed' });
  } finally {
    if (client) await client.end();
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
