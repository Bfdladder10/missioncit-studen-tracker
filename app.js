// Complete app.js file with authentication, skills tracking, and patient contacts
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

    // Insert some sample skills if skills table is empty
    const skillsCheck = await client.query('SELECT COUNT(*) FROM skills');
    if (parseInt(skillsCheck.rows[0].count) === 0) {
      // Get category IDs
      const categories = await client.query('SELECT category_id, category_name FROM skill_categories');
      const categoryMap = {};
      
      // Create a map of category name to ID
      categories.rows.forEach(cat => {
        categoryMap[cat.category_name] = cat.category_id;
      });
      
      // Insert skills
      await client.query(`
        INSERT INTO skills (category_id, skill_name, description)
        VALUES
          (${categoryMap['Airway']}, 'Oral Airway Insertion', 'Properly insert an oropharyngeal airway'),
          (${categoryMap['Airway']}, 'Bag-Valve-Mask', 'Properly ventilate a patient using a BVM'),
          (${categoryMap['Airway']}, 'Suctioning', 'Properly suction a patient airway'),
          (${categoryMap['Assessment']}, 'Vital Signs', 'Properly assess patient vital signs'),
          (${categoryMap['Assessment']}, 'Patient History', 'Properly obtain a comprehensive patient history'),
          (${categoryMap['Circulation']}, 'CPR', 'Properly perform CPR on an adult patient'),
          (${categoryMap['Circulation']}, 'Bleeding Control', 'Properly control external bleeding'),
          (${categoryMap['Circulation']}, 'Tourniquet Application', 'Properly apply a tourniquet to control bleeding'),
          (${categoryMap['Medical']}, 'Medication Administration', 'Properly administer medications per protocol'),
          (${categoryMap['Trauma']}, 'Bandaging', 'Properly apply bandages to wounds'),
          (${categoryMap['Trauma']}, 'Splinting', 'Properly apply splints to suspected fractures');
      `);
      console.log('Inserted sample skills');
    }

    // Insert system configuration if empty
    const configCheck = await client.query('SELECT COUNT(*) FROM system_config');
    if (parseInt(configCheck.rows[0].count) === 0) {
      // Get certification level IDs
      const levels = await client.query('SELECT level_id, level_name FROM certification_levels');
      const levelMap = {};
      
      // Create a map of level name to ID
      levels.rows.forEach(level => {
        levelMap[level.level_name] = level.level_id;
      });
      
      // Insert configuration
      await client.query(`
        INSERT INTO system_config (certification_level_id, feature_key, feature_value)
        VALUES
          (${levelMap['EMR']}, 'enable_clinical_hours_tracking', 'false'),
          (${levelMap['EMR']}, 'enable_patient_contacts_tracking', 'true'),
          (${levelMap['EMT']}, 'enable_clinical_hours_tracking', 'false'),
          (${levelMap['EMT']}, 'enable_patient_contacts_tracking', 'true'),
          (${levelMap['AEMT']}, 'enable_clinical_hours_tracking', 'true'),
          (${levelMap['AEMT']}, 'enable_patient_contacts_tracking', 'true'),
          (${levelMap['Paramedic']}, 'enable_clinical_hours_tracking', 'true'),
          (${levelMap['Paramedic']}, 'enable_patient_contacts_tracking', 'true');
      `);
      console.log('Inserted system configuration');
      
      // Add patient contact requirements for each level
      await client.query(`
        INSERT INTO system_config (certification_level_id, feature_key, feature_value)
        VALUES
          (${levelMap['EMR']}, 'patient_contacts_required', '5'),
          (${levelMap['EMT']}, 'patient_contacts_required', '10'),
          (${levelMap['AEMT']}, 'patient_contacts_required', '15'),
          (${levelMap['Paramedic']}, 'patient_contacts_required', '20')
        ON CONFLICT (certification_level_id, feature_key) DO NOTHING;
      `);
      console.log('Inserted patient contact requirements');
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
            ul { line-height: 1.6; }
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
            <li>certification_skills</li>
            <li>student_skills</li>
            <li>clinical_locations</li>
            <li>clinical_opportunities</li>
            <li>student_preferences</li>
            <li>student_clinicals</li>
            <li>patient_contacts</li>
            <li>patient_interventions</li>
            <li>system_config</li>
          </ul>
          <p>Initial data for certification levels, skill categories, sample skills, and system configuration has been inserted.</p>
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
