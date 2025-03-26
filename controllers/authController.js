// Authentication Controller - handles user authentication and profile management
const UserModel = require('../models/userModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

class AuthController {
  // User login
  static async login(req, res) {
    try {
      const { email, password } = req.body;
      
      // Validate input
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      
      // Find user by email
      const user = await UserModel.getUserByEmail(email);
      
      // Check if user exists
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      
      // Verify password
      const passwordValid = await bcrypt.compare(password, user.password_hash);
      
      if (!passwordValid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      
      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.user_id, 
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role 
        }, 
        JWT_SECRET,
        { expiresIn: '1d' }
      );
      
      // Set token in cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 1 day
      });
      
      // Return user info (without password)
      return res.json({
        userId: user.user_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      });
      
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Authentication failed' });
    }
  }

  // User registration
  static async register(req, res) {
    try {
      const { email, password, firstName, lastName, role } = req.body;
      
      // Validate input
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ error: 'All fields are required' });
      }
      
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }
      
      // Validate password strength (at least 8 characters)
      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long' });
      }
      
      // Use default role 'student' if not provided or not admin
      const userRole = (req.user && req.user.role === 'admin' && role) ? role : 'student';
      
      // Register user
      const result = await UserModel.registerUser(email, password, firstName, lastName, userRole);
      
      return res.status(201).json({ 
        success: true, 
        message: 'Registration successful',
        userId: result.userId
      });
      
    } catch (error) {
      console.error('Registration error:', error);
      
      if (error.message.includes('already exists')) {
        return res.status(400).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Registration failed' });
    }
  }

  // User logout
  static logout(req, res) {
    res.clearCookie('token');
    return res.json({ success: true, message: 'Logout successful' });
  }

  // Get current user profile
  static async getProfile(req, res) {
    try {
      const userId = req.user.userId;
      
      // Get user details (without password)
      const user = await UserModel.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      return res.json(user);
      
    } catch (error) {
      console.error('Get profile error:', error);
      return res.status(500).json({ error: 'Failed to retrieve user profile' });
    }
  }

  // Update user profile
  static async updateProfile(req, res) {
    try {
      const userId = req.user.userId;
      const { firstName, lastName, email } = req.body;
      
      // Update user
      const updatedUser = await UserModel.updateUser(userId, { firstName, lastName, email });
      
      return res.json(updatedUser);
      
    } catch (error) {
      console.error('Update profile error:', error);
      
      if (error.message.includes('already in use')) {
        return res.status(400).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to update profile' });
    }
  }

  // Change password
  static async changePassword(req, res) {
    try {
      const userId = req.user.userId;
      const { currentPassword, newPassword } = req.body;
      
      // Validate input
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current password and new password are required' });
      }
      
      // Validate password strength
      if (newPassword.length < 8) {
        return res.status(400).json({ error: 'New password must be at least 8 characters long' });
      }
      
      // Change password
      const result = await UserModel.changePassword(userId, currentPassword, newPassword);
      
      return res.json(result);
      
    } catch (error) {
      console.error('Change password error:', error);
      
      if (error.message.includes('incorrect')) {
        return res.status(400).json({ error: error.message });
      }
      
      return res.status(500).json({ error: 'Failed to change password' });
    }
  }
}

module.exports = AuthController;
