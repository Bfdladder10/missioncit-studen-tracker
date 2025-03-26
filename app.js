// Complete app.js file with authentication, skills tracking, patient contacts, and clinical scheduling
const express = require('express');
const { Client } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fileUpload = require('express-fileupload');
const cookieParser = require('cookie-parser');
const app = express();
const PORT = process.env.PORT || 3000;

// JWT secret key (in production this should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Middleware
app.use(fileUpload({
  createParentPath: true,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max file size
}));
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
          .navbar { background: #f9f9f9; padding: 10px; border-radius: 8px; margin-bottom: 20px; }
          .navbar a { color: #333; text-decoration: none; padding: 8px 15px; display: inline-block; }
          .navbar a:hover { background: #e9e9e9; border-radius: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f9f9f9; }
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
              html += `<tr class="skill-category"><td colspan="3">${categoryName}</td></tr>`;
              
              // Add skills in this category
              groupedSkills[categoryId].forEach(skill => {
                const completed = skill.completions || 0;
                const required = skill.repetitions_required || 1;
                const progressPercent = Math.min(100, Math.round((completed / required) * 100));
                const status = completed >= required ? 'Complete' : `${completed}/${required}`;
                
                html += '<tr>';
                html += `<td>${skill.skill_name}</td>`;
                html += '<td><div class="progress-bar-container">';
                html += `<div class="progress-bar" style="width: ${progressPercent}%"></div></div></td>`;
                html += `<td>${status}</td>`;
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
              html += `<span class="clinical-date">${formattedDate}, ${formattedStartTime} - ${formattedEndTime}</span>`;
              html += `<span class="clinical-status ${statusClass}">${statusText}</span>`;
              html += '</div>';
              html += '<div class="clinical-body">';
              html += `<h3>${clinical.location_name}</h3>`;
              html += `<div class="clinical-location">${clinical.address || ''}</div>`;
              html += clinical.notes ? `<p>${clinical.notes}</p>` : '';
              html += '</div>';
              html += '<div class="clinical-footer">';
              
              if (clinical.status === 'confirmed') {
                html += `<button class="button" onclick="showCompleteClinicalModal('${clinical.assignment_id}')">Complete</button>`;
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
                preferenceText = `<span>Your preference: ${preference}${getOrdinalSuffix(preference)} choice</span>`;
              }
              
              html += '<div class="clinical-card">';
              html += '<div class="clinical-header">';
              html += `<span class="clinical-date">${formattedDate}, ${formattedStartTime} - ${formattedEndTime}</span>`;
              html += `<span class="clinical-status status-available">${opportunity.slots_available} slot(s) available</span>`;
              html += '</div>';
              html += '<div class="clinical-body">';
              html += `<h3>${opportunity.location_name}</h3>`;
              html += `<div class="clinical-location">${opportunity.address || ''}</div>`;
              html += opportunity.notes ? `<p>${opportunity.notes}</p>` : '';
              html += preferenceText ? `<p>${preferenceText}</p>` : '';
              html += '</div>';
              html += '<div class="clinical-footer">';
              html += `<button class="button" onclick="showPreferencesModal('${opportunity.opportunity_id}')">${preference ? 'Update Preference' : 'Select Preference'}</button>`;
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
            html += `<p><strong>Total Clinical Hours: ${totalHours.toFixed(1)}</strong></p>`;
            
            // Clinical history table
            html += '<table>';
            html += '<thead><tr><th>Date</th><th>Location</th><th>Hours</th><th>Status</th></tr></thead>';
            html += '<tbody>';
            
            clinicals.forEach(clinical => {
              const startDate = new Date(clinical.start_datetime);
              const formattedDate = startDate.toLocaleDateString();
              
              html += '<tr>';
              html += `<td>${formattedDate}</td>`;
              html += `<td>${clinical.location_name}</td>`;
              html += `<td>${clinical.hours_completed || '-'}</td>`;
              html += `<td>${clinical.status}</td>`;
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
              html += `<span class="clinical-date">${formattedDate}, ${formattedStartTime} - ${formattedEndTime}</span>`;
              html += `<span class="clinical-status status-available">${opportunity.slots_available} slot(s) available</span>`;
              html += '</div>';
              html += '<div class="clinical-body">';
              html += `<h3>${opportunity.location_name} - ${opportunity.level_name}</h3>`;
              html += `<div class="clinical-location">${opportunity.address || ''}</div>`;
              html += opportunity.notes ? `<p>${opportunity.notes}</p>` : '';
              
              // Student preferences if any
              if (opportunity.preferences && opportunity.preferences.length > 0) {
                html += '<h4>Student Preferences:</h4>';
                html += '<ul>';
                opportunity.preferences.forEach(pref => {
                  html += `<li>${pref.student_name} - ${getOrdinalWithNumber(pref.preference_rank)} choice
                    <button class="button button-secondary" onclick="assignStudentToClinical('${opportunity.opportunity_id}', '${pref.student_id}')">Assign</button>
                  </li>`;
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

// Admin dashboard route
app.get('/admin/dashboard', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  res.send(`
    <html>
      <head>
        <title>EMS Tracker - Admin Dashboard</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
          h1, h2, h3 { color: #c57100; }
          .card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
          .button { display: inline-block; background: #c57100; color: white; padding: 10px 15px; 
                    text-decoration: none; border-radius: 4px; margin-top: 15px; margin-right: 10px; }
          .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; }
          .stat-card { flex: 1; background: #f9f9f9; border-radius: 8px; padding: 15px; text-align: center; }
          .stat-number { font-size: 32px; font-weight: bold; margin: 10px 0; color: #c57100; }
          .navbar { background: #f9f9f9; padding: 10px; border-radius: 8px; margin-bottom: 20px; }
          .navbar a { color: #333; text-decoration: none; padding: 8px 15px; display: inline-block; }
          .navbar a:hover { background: #e9e9e9; border-radius: 4px; }
          .navbar a.active { background: #c57100; color: white; }
          .admin-section { margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="navbar">
          <a href="/dashboard">Main Dashboard</a>
          <a href="/admin/dashboard" class="active">Admin Dashboard</a>
          <a href="/admin/certification-levels">Certification Levels</a>
          <a href="/admin/students">Students</a>
          <a href="/admin/skills">Skills</a>
          <a href="/admin/clinicals">Clinical Sites</a>
          <a href="#" id="logoutButton" style="float: right;">Logout</a>
        </div>
        
        <h1>EMS Program Administration</h1>
        
        <div class="card">
          <h2>Program Overview</h2>
          <div class="stats-grid">
            <div class="stat-card">
              <div>Students</div>
              <div class="stat-number" id="studentCount">0</div>
            </div>
            <div class="stat-card">
              <div>Certification Levels</div>
              <div class="stat-number" id="levelCount">0</div>
            </div>
            <div class="stat-card">
              <div>Skills</div>
              <div class="stat-number" id="skillCount">0</div>
            </div>
            <div class="stat-card">
              <div>Clinical Sites</div>
              <div class="stat-number" id="siteCount">0</div>
            </div>
          </div>
        </div>
        
        <div class="admin-section">
          <h2>Administration Tools</h2>
          
          <div class="card">
            <h3>Certification Management</h3>
            <p>Manage certification levels and requirements.</p>
            <a href="/admin/certification-levels" class="button">Manage Levels</a>
            <a href="/admin/skills" class="button">Manage Skills</a>
          </div>
          
          <div class="card">
            <h3>Student Management</h3>
            <p>Manage students, classes, and progress tracking.</p>
            <a href="/admin/students" class="button">Manage Students</a>
            <a href="/admin/classes" class="button">Manage Classes</a>
            <a href="/admin/import" class="button">Import Data</a>
          </div>
          
          <div class="card">
            <h3>Clinical Management</h3>
            <p>Manage clinical sites, schedules, and assignments.</p>
            <a href="/admin/clinicals" class="button">Manage Sites</a>
            <a href="/admin/opportunities" class="button">Manage Opportunities</a>
          </div>
        </div>
        
        <script>
          // Fetch program stats when page loads
          fetch('/api/admin/stats')
            .then(response => response.json())
            .then(data => {
              document.getElementById('studentCount').textContent = data.studentCount || 0;
              document.getElementById('levelCount').textContent = data.levelCount || 0;
              document.getElementById('skillCount').textContent = data.skillCount || 0;
              document.getElementById('siteCount').textContent = data.siteCount || 0;
            })
            .catch(error => console.error('Error fetching admin stats:', error));
          
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

// Certification Levels Management Page
app.get('/admin/certification-levels', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  let client;
  try {
    client = await connectToDb();
    
    // Get all certification levels
    const levelsResult = await client.query(`
      SELECT level_id, level_name, description, is_active
      FROM certification_levels
      ORDER BY level_id
    `);
    
    res.send(`
      <html>
        <head>
          <title>EMS Tracker - Certification Levels</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
            h1, h2, h3 { color: #c57100; }
            .card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
            .button { display: inline-block; background: #c57100; color: white; padding: 10px 15px; 
                      text-decoration: none; border-radius: 4px; margin-top: 15px; }
            .btn-small { padding: 5px 10px; font-size: 14px; }
            .btn-edit { background: #4a6da7; }
            .btn-delete { background: #d63031; }
            .navbar { background: #f9f9f9; padding: 10px; border-radius: 8px; margin-bottom: 20px; }
            .navbar a { color: #333; text-decoration: none; padding: 8px 15px; display: inline-block; }
            .navbar a:hover { background: #e9e9e9; border-radius: 4px; }
            .navbar a.active { background: #c57100; color: white; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f9f9f9; }
            tr:hover { background-color: #f8f8f8; }
            .modal { display: none; position: fixed; z-index: 1; left: 0; top: 0; width: 100%; 
                     height: 100%; overflow: auto; background-color: rgba(0,0,0,0.4); }
            .modal-content { background-color: #fefefe; margin: 15% auto; padding: 20px; 
                            border: 1px solid #888; width: 80%; max-width: 600px; border-radius: 8px; }
            .close { color: #aaa; float: right; font-size: 28px; font-weight: bold; cursor: pointer; }
            .close:hover { color: black; }
            .form-group { margin-bottom: 15px; }
            label { display: block; margin-bottom: 5px; }
            input, select, textarea { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="navbar">
            <a href="/dashboard">Main Dashboard</a>
            <a href="/admin/dashboard">Admin Dashboard</a>
            <a href="/admin/certification-levels" class="active">Certification Levels</a>
            <a href="/admin/students">Students</a>
            <a href="/admin/skills">Skills</a>
            <a href="/admin/clinicals">Clinical Sites</a>
            <a href="#" id="logoutButton" style="float: right;">Logout</a>
          </div>
          
          <h1>Certification Levels Management</h1>
          
          <div class="card">
            <h2>Current Certification Levels</h2>
            <p>Manage the certification levels in your EMS program.</p>
            
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Level Name</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                \${levelsResult.rows.map(level => \`
                  <tr>
                    <td>\${level.level_id}</td>
                    <td>\${level.level_name}</td>
                    <td>\${level.description || '-'}</td>
                    <td>\${level.is_active ? 'Active' : 'Inactive'}</td>
                    <td>
                      <button class="button btn-small btn-edit" onclick="editLevel(\${level.level_id})">Edit</button>
                      <button class="button btn-small btn-delete" onclick="toggleLevelStatus(\${level.level_id}, \${!level.is_active})">
                        \${level.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                \`).join('')}
              </tbody>
            </table>
            
            <button class="button" id="addLevelBtn">Add New Level</button>
            <button class="button" id="importLevelsBtn">Import Levels</button>
          </div>
          
          <!-- Add Level Modal -->
          <div id="addLevelModal" class="modal">
            <div class="modal-content">
              <span class="close">&times;</span>
              <h2>Add New Certification Level</h2>
              <form id="addLevelForm">
                <div class="form-group">
                  <label for="levelName">Level Name</label>
                  <input type="text" id="levelName" name="levelName" required>
                </div>
                <div class="form-group">
                  <label for="description">Description</label>
                  <textarea id="description" name="description" rows="3"></textarea>
                </div>
                <div class="form-group">
                  <label>
                    <input type="checkbox" id="isActive" name="isActive" checked>
                    Active
                  </label>
                </div>
                <button type="submit" class="button">Add Level</button>
              </form>
            </div>
          </div>
          
          <!-- Edit Level Modal -->
          <div id="editLevelModal" class="modal">
            <div class="modal-content">
              <span class="close">&times;</span>
              <h2>Edit Certification Level</h2>
              <form id="editLevelForm">
                <input type="hidden" id="editLevelId">
                <div class="form-group">
                  <label for="editLevelName">Level Name</label>
                  <input type="text" id="editLevelName" name="levelName" required>
                </div>
                <div class="form-group">
                  <label for="editDescription">Description</label>
                  <textarea id="editDescription" name="description" rows="3"></textarea>
                </div>
                <div class="form-group">
                  <label>
                    <input type="checkbox" id="editIsActive" name="isActive">
                    Active
                  </label>
                </div>
                <button type="submit" class="button">Update Level</button>
              </form>
            </div>
          </div>
          
          <!-- Import Levels Modal -->
          <div id="importLevelsModal" class="modal">
            <div class="modal-content">
              <span class="close">&times;</span>
              <h2>Import Certification Levels</h2>
              <p>Upload a CSV file with certification levels information.</p>
              <p><small>CSV Format: level_name,description,is_active (e.g., "EMT,Emergency Medical Technician,true")</small></p>
              <form id="importLevelsForm">
                <div class="form-group">
                  <label for="csvFile">CSV File</label>
                  <input type="file" id="csvFile" name="csvFile" accept=".csv" required>
                </div>
                <div class="form-group">
                  <label>
                    <input type="checkbox" id="updateExisting" name="updateExisting">
                    Update existing levels (if CSV includes levels that already exist)
                  </label>
                </div>
                <button type="submit" class="button">Import Levels</button>
              </form>
            </div>
          </div>
          
          <script>
            // Modal handling
            const addModal = document.getElementById('addLevelModal');
            const editModal = document.getElementById('editLevelModal');
            const importModal = document.getElementById('importLevelsModal');
            const addBtn = document.getElementById('addLevelBtn');
            const importBtn = document.getElementById('importLevelsBtn');
            const closeBtns = document.getElementsByClassName('close');
            
            // Show add modal
            addBtn.onclick = function() {
              addModal.style.display = 'block';
            }
            
            // Show import modal
            importBtn.onclick = function() {
              importModal.style.display = 'block';
            }
            
            // Close modals when clicking X
            for (let i = 0; i < closeBtns.length; i++) {
              closeBtns[i].onclick = function() {
                addModal.style.display = 'none';
                editModal.style.display = 'none';
                importModal.style.display = 'none';
              }
            }
            
            // Close modals when clicking outside
            window.onclick = function(event) {
              if (event.target === addModal) {
                addModal.style.display = 'none';
              }
              if (event.target === editModal) {
                editModal.style.display = 'none';
              }
              if (event.target === importModal) {
                importModal.style.display = 'none';
              }
            }
            
            // Add level form submission
            document.getElementById('addLevelForm').addEventListener('submit', async (e) => {
              e.preventDefault();
              
              const levelData = {
                levelName: document.getElementById('levelName').value,
                description: document.getElementById('description').value,
                isActive: document.getElementById('isActive').checked
              };
              
              try {
                const response = await fetch('/api/admin/certification-levels/add', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(levelData)
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                  throw new Error(data.error || 'Failed to add level');
                }
                
                // Reload page on success
                window.location.reload();
                
              } catch (error) {
                alert('Error adding level: ' + error.message);
              }
            });
            
            // Edit level function
            async function editLevel(levelId) {
              try {
                const response = await fetch('/api/admin/certification-levels/' + levelId);
                const data = await response.json();
                
                if (!response.ok) {
                  throw new Error(data.error || 'Failed to fetch level details');
                }
                
                // Populate edit form
                document.getElementById('editLevelId').value = data.level.level_id;
                document.getElementById('editLevelName').value = data.level.level_name;
                document.getElementById('editDescription').value = data.level.description || '';
                document.getElementById('editIsActive').checked = data.level.is_active;
                
                // Show edit modal
                editModal.style.display = 'block';
                
              } catch (error) {
                alert('Error fetching level details: ' + error.message);
              }
            }
            
            // Edit level form submission
            document.getElementById('editLevelForm').addEventListener('submit', async (e) => {
              e.preventDefault();
              
              const levelId = document.getElementById('editLevelId').value;
              const levelData = {
                levelName: document.getElementById('editLevelName').value,
                description: document.getElementById('editDescription').value,
                isActive: document.getElementById('editIsActive').checked
              };
              
              try {
                const response = await fetch('/api/admin/certification-levels/' + levelId, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(levelData)
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                  throw new Error(data.error || 'Failed to update level');
                }
                
                // Reload page on success
                window.location.reload();
                
              } catch (error) {
                alert('Error updating level: ' + error.message);
              }
            });
            
            // Toggle level status function
            async function toggleLevelStatus(levelId, newStatus) {
              if (!confirm('Are you sure you want to ' + (newStatus ? 'activate' : 'deactivate') + ' this certification level?')) {
                return;
              }
              
              try {
                const response = await fetch('/api/admin/certification-levels/' + levelId + '/toggle-status', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ isActive: newStatus })
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                  throw new Error(data.error || 'Failed to update status');
                }
                
                // Reload page on success
                window.location.reload();
                
              } catch (error) {
                alert('Error updating status: ' + error.message);
              }
            }
            
            // Import levels form submission
            document.getElementById('importLevelsForm').addEventListener('submit', async (e) => {
              e.preventDefault();
              
              const formData = new FormData();
              formData.append('csvFile', document.getElementById('csvFile').files[0]);
              formData.append('updateExisting', document.getElementById('updateExisting').checked);
              
              try {
                const response = await fetch('/api/admin/certification-levels/import', {
                  method: 'POST',
                  body: formData
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                  throw new Error(data.error || 'Failed to import levels');
                }
                
                alert(data.message || 'Import successful');
                window.location.reload();
                
              } catch (error) {
                alert('Error importing levels: ' + error.message);
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
          </script>
        </body>
      </html>
    \`);
    
  } catch (error) {
    console.error('Error loading certification levels page:', error);
    res.status(500).send('Error loading certification levels page');
  } finally {
    if (client) await client.end();
  }
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

// API endpoint for admin dashboard stats
app.get('/api/admin/stats', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  let client;
  try {
    client = await connectToDb();
    
    // Get count of students
    const studentCountResult = await client.query(`
      SELECT COUNT(*) as count FROM users WHERE role = 'student'
    `);
    
    // Get count of certification levels
    const levelCountResult = await client.query(`
      SELECT COUNT(*) as count FROM certification_levels WHERE is_active = true
    `);
    
    // Get count of skills
    const skillCountResult = await client.query(`
      SELECT COUNT(*) as count FROM skills WHERE is_active = true
    `);
    
    // Get count of clinical sites
    const siteCountResult = await client.query(`
      SELECT COUNT(*) as count FROM clinical_locations WHERE is_active = true
    `);
    
    res.json({
      studentCount: parseInt(studentCountResult.rows[0].count),
      levelCount: parseInt(levelCountResult.rows[0].count),
      skillCount: parseInt(skillCountResult.rows[0].count),
      siteCount: parseInt(siteCountResult.rows[0].count)
    });
    
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  } finally {
    if (client) await client.end();
  }
});

// Get certification level details
app.get('/api/admin/certification-levels/:id', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  const levelId = req.params.id;
  
  let client;
  try {
    client = await connectToDb();
    
    const result = await client.query(`
      SELECT level_id, level_name, description, is_active
      FROM certification_levels
      WHERE level_id = $1
    `, [levelId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Certification level not found' });
    }
    
    res.json({
      level: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error fetching certification level:', error);
    res.status(500).json({ error: 'Failed to fetch certification level' });
  } finally {
    if (client) await client.end();
  }
});

// Add new certification level
app.post('/api/admin/certification-levels/add', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  const { levelName, description, isActive } = req.body;
  
  if (!levelName) {
    return res.status(400).json({ error: 'Level name is required' });
  }
  
  let client;
  try {
    client = await connectToDb();
    
    // Check if level already exists
    const checkResult = await client.query(`
      SELECT 1 FROM certification_levels WHERE level_name = $1
    `, [levelName]);
    
    if (checkResult.rows.length > 0) {
      return res.status(400).json({ error: 'A certification level with this name already exists' });
    }
    
    // Insert new level
    const result = await client.query(`
      INSERT INTO certification_levels (level_name, description, is_active)
      VALUES ($1, $2, $3)
      RETURNING level_id
    `, [levelName, description || null, isActive === undefined ? true : isActive]);
    
    res.status(201).json({
      success: true,
      message: 'Certification level added successfully',
      levelId: result.rows[0].level_id
    });
    
  } catch (error) {
    console.error('Error adding certification level:', error);
    res.status(500).json({ error: 'Failed to add certification level' });
  } finally {
    if (client) await client.end();
  }
});

// Update certification level
app.put('/api/admin/certification-levels/:id', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  const levelId = req.params.id;
  const { levelName, description, isActive } = req.body;
  
  if (!levelName) {
    return res.status(400).json({ error: 'Level name is required' });
  }
  
  let client;
  try {
    client = await connectToDb();
    
    // Check if level exists
    const checkResult = await client.query(`
      SELECT 1 FROM certification_levels WHERE level_id = $1
    `, [levelId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Certification level not found' });
    }
    
    // Check if name is already used by another level
    const nameCheckResult = await client.query(`
      SELECT 1 FROM certification_levels WHERE level_name = $1 AND level_id != $2
    `, [levelName, levelId]);
    
    if (nameCheckResult.rows.length > 0) {
      return res.status(400).json({ error: 'Another certification level with this name already exists' });
    }
    
    // Update level
    await client.query(`
      UPDATE certification_levels
      SET level_name = $1, description = $2, is_active = $3
      WHERE level_id = $4
    `, [levelName, description || null, isActive, levelId]);
    
    res.json({
      success: true,
      message: 'Certification level updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating certification level:', error);
    res.status(500).json({ error: 'Failed to update certification level' });
  } finally {
    if (client) await client.end();
  }
});

// Toggle certification level status
app.post('/api/admin/certification-levels/:id/toggle-status', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  const levelId = req.params.id;
  const { isActive } = req.body;
  
  if (isActive === undefined) {
    return res.status(400).json({ error: 'Status is required' });
  }
  
  let client;
  try {
    client = await connectToDb();
    
    // Update level status
    await client.query(`
      UPDATE certification_levels
      SET is_active = $1
      WHERE level_id = $2
    `, [isActive, levelId]);
    
    res.json({
      success: true,
      message: `Certification level ${isActive ? 'activated' : 'deactivated'} successfully`
    });
    
  } catch (error) {
    console.error('Error updating certification level status:', error);
    res.status(500).json({ error: 'Failed to update certification level status' });
  } finally {
    if (client) await client.end();
  }
});

// CSV import for certification levels
app.post('/api/admin/certification-levels/import', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
  if (!req.files || !req.files.csvFile) {
    return res.status(400).json({ error: 'CSV file is required' });
  }
  
  const csvFile = req.files.csvFile;
  const updateExisting = req.body.updateExisting === 'true';
  
  let client;
  try {
    client = await connectToDb();
    
    // Start transaction
    await client.query('BEGIN');
    
    // Parse CSV content
    const csvContent = csvFile.data.toString('utf8');
    const rows = csvContent.split('\n').filter(row => row.trim());
    
    // Process each row
    let added = 0;
    let updated = 0;
    let skipped = 0;
    
    for (let i = 0; i < rows.length; i++) {
      // Skip header row if present
      if (i === 0 && rows[i].toLowerCase().includes('level_name')) {
        continue;
      }
      
      const columns = rows[i].split(',').map(col => col.trim());
      
      if (columns.length < 1) {
        continue; // Skip empty rows
      }
      
      const levelName = columns[0];
      const description = columns[1] || null;
      const isActive = columns[2] ? columns[2].toLowerCase() === 'true' : true;
      
      // Check if level already exists
      const checkResult = await client.query(`
        SELECT level_id FROM certification_levels WHERE level_name = $1
      `, [levelName]);
      
      if (checkResult.rows.length > 0) {
        // Update existing level if option is enabled
        if (updateExisting) {
          await client.query(`
            UPDATE certification_levels
            SET description = $1, is_active = $2
            WHERE level_name = $3
          `, [description, isActive, levelName]);
          updated++;
        } else {
          skipped++;
        }
      } else {
        // Insert new level
        await client.query(`
          INSERT INTO certification_levels (level_name, description, is_active)
          VALUES ($1, $2, $3)
        `, [levelName, description, isActive]);
        added++;
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: `Import completed: ${added} levels added, ${updated} levels updated, ${skipped} levels skipped.`
    });
    
  } catch (error) {
    // Rollback transaction on error
    if (client) {
      await client.query('ROLLBACK');
    }
    
    console.error('Error importing certification levels:', error);
    res.status(500).json({ error: 'Failed to import certification levels: ' + error.message });
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
      JOIN clinical_locations cl ON co.location_id = cl.location_id
      LEFT JOIN student_preferences sp ON co.opportunity_id = sp.opportunity_id AND sp.student_id = $1
      WHERE co.certification_level_id = $2
        AND co.start_datetime > NOW()
        AND co.slots_available > 0
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
    
    // Get completed clinical assignments
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
        AND (sc.status = 'completed' OR co.start_datetime < NOW())
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

// Submit a preference for a clinical opportunity
app.post('/api/clinicals/preferences', authMiddleware, async (req, res) => {
  // Only students can select preferences
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Only students can select preferences' });
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
    
    // Check if student already has this preference rank for another opportunity
    const existingPreference = await client.query(`
      SELECT opportunity_id
      FROM student_preferences
      WHERE student_id = $1 AND preference_rank = $2
    `, [req.user.userId, preferenceRank]);
    
    // Start transaction
    await client.query('BEGIN');
    
    // If student already has this preference rank, update it
    if (existingPreference.rows.length > 0) {
      await client.query(`
        UPDATE student_preferences
        SET preference_rank = NULL
        WHERE student_id = $1 AND preference_rank = $2
      `, [req.user.userId, preferenceRank]);
    }
    
    // Check if student already has a preference for this opportunity
    const currentPreference = await client.query(`
      SELECT preference_id, preference_rank
      FROM student_preferences
      WHERE student_id = $1 AND opportunity_id = $2
    `, [req.user.userId, opportunityId]);
    
    if (currentPreference.rows.length > 0) {
      // Update existing preference
      await client.query(`
        UPDATE student_preferences
        SET preference_rank = $3
        WHERE student_id = $1 AND opportunity_id = $2
      `, [req.user.userId, opportunityId, preferenceRank]);
    } else {
      // Insert new preference
      await client.query(`
        INSERT INTO student_preferences (student_id, opportunity_id, preference_rank)
        VALUES ($1, $2, $3)
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
    if (client) await client.end();
  }
});

// Complete a clinical
app.post('/api/clinicals/complete', authMiddleware, async (req, res) => {
  // Only students can complete their clinicals
  if (req.user.role !== 'student') {
    return res.status(403).json({ error: 'Only students can complete their clinicals' });
  }
  
  const { assignmentId, hoursCompleted, notes } = req.body;
  
  if (!assignmentId || hoursCompleted === undefined) {
    return res.status(400).json({ error: 'Assignment ID and hours completed are required' });
  }
  
  let client;
  try {
    client = await connectToDb();
    
    // Check if this clinical belongs to the student
    const assignmentCheck = await client.query(`
      SELECT 1
      FROM student_clinicals
      WHERE assignment_id = $1 AND student_id = $2
    `, [assignmentId, req.user.userId]);
    
    if (assignmentCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Clinical assignment not found' });
    }
    
    // Update clinical status to completed
    await client.query(`
      UPDATE student_clinicals
      SET status = 'completed', hours_completed = $3, notes = $4
      WHERE assignment_id = $1 AND student_id = $2
    `, [assignmentId, req.user.userId, hoursCompleted, notes]);
    
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

// Admin: Get all clinical opportunities with student preferences
app.get('/api/clinicals/admin/opportunities', authMiddleware, async (req, res) => {
  // Only admins can access this endpoint
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access forbidden' });
  }
  
  let client;
  try {
    client = await connectToDb();
    
    // Get all opportunities
    const opportunitiesResult = await client.query(`
      SELECT 
        co.opportunity_id,
        co.start_datetime,
        co.end_datetime,
        co.slots_available,
        cl.location_name,
        cl.address,
        co.notes,
        cert.level_name
      FROM clinical_opportunities co
      JOIN clinical_locations cl ON co.location_id = cl.location_id
      JOIN certification_levels cert ON co.certification_level_id = cert.level_id
      WHERE co.start_datetime > NOW()
      ORDER BY co.start_datetime
    `);
    
    const opportunities = opportunitiesResult.rows;
    
    // For each opportunity, get student preferences
    for (const opportunity of opportunities) {
      const preferencesResult = await client.query(`
        SELECT 
          sp.student_id,
          sp.preference_rank,
          u.first_name || ' ' || u.last_name AS student_name
        FROM student_preferences sp
        JOIN students s ON sp.student_id = s.student_id
        JOIN users u ON s.student_id = u.user_id
        WHERE sp.opportunity_id = $1
        ORDER BY sp.preference_rank
      `, [opportunity.opportunity_id]);
      
      opportunity.preferences = preferencesResult.rows;
    }
    
    res.json({
      opportunities
    });
    
  } catch (error) {
    console.error('Error fetching admin opportunities:', error);
    res.status(500).json({ error: 'Failed to fetch admin opportunities' });
  } finally {
    if (client) await client.end();
  }
});

// Admin: Create a new clinical opportunity
app.post('/api/clinicals/admin/opportunities', authMiddleware, async (req, res) => {
  // Only admins can create opportunities
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can create clinical opportunities' });
  }
  
  const { 
    locationId, 
    certificationLevelId,
    startDateTime,
    endDateTime,
    slotsAvailable,
    notes
  } = req.body;
  
  // Validate required fields
  if (!locationId || !certificationLevelId || !startDateTime || !endDateTime) {
    return res.status(400).json({ error: 'Location, certification level, start date, and end date are required' });
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
        created_by,
        notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING opportunity_id
    `, [
      locationId,
      certificationLevelId,
      startDateTime,
      endDateTime,
      slotsAvailable || 1,
      req.user.userId,
      notes
    ]);
    
    res.status(201).json({
      success: true,
      message: 'Clinical opportunity created successfully',
      opportunityId: result.rows[0].opportunity_id
    });
    
  } catch (error) {
    console.error('Error creating clinical opportunity:', error);
    res.status(500).json({ error: 'Failed to create clinical opportunity' });
  } finally {
    if (client) await client.end();
  }
});

// Admin: Assign a student to a clinical
app.post('/api/clinicals/admin/assign', authMiddleware, async (req, res) => {
  // Only admins can assign students
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Only admins can assign students to clinicals' });
  }
  
  const { opportunityId, studentId } = req.body;
  
  if (!opportunityId || !studentId) {
    return res.status(400).json({ error: 'Opportunity ID and student ID are required' });
  }
  
  let client;
  try {
    client = await connectToDb();
    
    // Start transaction
    await client.query('BEGIN');
    
    // Check if clinical opportunity exists and has slots available
    const opportunityCheck = await client.query(`
      SELECT slots_available
      FROM clinical_opportunities
      WHERE opportunity_id = $1
    `, [opportunityId]);
    
    if (opportunityCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Clinical opportunity not found' });
    }
    
    const slotsAvailable = opportunityCheck.rows[0].slots_available;
    
    if (slotsAvailable < 1) {
      return res.status(400).json({ error: 'No slots available for this clinical opportunity' });
    }
    
    // Check if student is already assigned to this opportunity
    const assignmentCheck = await client.query(`
      SELECT 1
      FROM student_clinicals
      WHERE student_id = $1 AND opportunity_id = $2
    `, [studentId, opportunityId]);
    
    if (assignmentCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Student is already assigned to this clinical' });
    }
    
    // Create assignment
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
    
    console.error('Error assigning student to clinical:', error);
    res.status(500).json({ error: 'Failed to assign student to clinical' });
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
    // Validate input
    if (!req.body || !req.body.email || !req.body.password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const { email, password } = req.body;
    
    try {
      client = await connectToDb();
    } catch (dbError) {
      console.error('Database connection error:', dbError);
      return res.status(500).json({ error: 'Database connection failed' });
    }
    
    // Find user
    let result;
    try {
      result = await client.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
      );
    } catch (queryError) {
      console.error('User query error:', queryError);
      return res.status(500).json({ error: 'Login failed' });
    }
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    // Verify password
    let passwordValid;
    try {
      passwordValid = await bcrypt.compare(password, user.password_hash);
    } catch (bcryptError) {
      console.error('Password verification error:', bcryptError);
      return res.status(500).json({ error: 'Error verifying password' });
    }
    
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token
    let token;
    try {
      token = jwt.sign(
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
    } catch (jwtError) {
      console.error('JWT generation error:', jwtError);
      return res.status(500).json({ error: 'Error generating authentication token' });
    }
    
    // Set token as HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'strict'
    });
    
    return res.json({
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
    console.error('Unexpected login error:', error);
    return res.status(500).json({ error: 'An unexpected error occurred' });
  } finally {
    // Always close the database connection
    if (client) {
      try {
        await client.end();
      } catch (endError) {
        console.error('Error closing database connection:', endError);
      }
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

// Error handling middleware - add this AFTER all your routes but BEFORE app.listen
app.use((err, req, res, next) => {
  console.error('Global error handler caught:', err);
  res.status(500).json({ 
    error: 'An unexpected error occurred',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Server error'
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
