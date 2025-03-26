// User Model - handles database operations for users
const { connectToDb } = require('../config/database');
const bcrypt = require('bcrypt');

class UserModel {
  // Get all users (admin function)
  static async getAllUsers() {
    let client;
    try {
      client = await connectToDb();
      const result = await client.query(`
        SELECT user_id, email, first_name, last_name, role, created_at 
        FROM users
        ORDER BY last_name, first_name
      `);
      return result.rows;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    } finally {
      if (client) await client.end();
    }
  }

  // Get user by ID
  static async getUserById(userId) {
    let client;
    try {
      client = await connectToDb();
      const result = await client.query(`
        SELECT user_id, email, first_name, last_name, role, created_at
        FROM users
        WHERE user_id = $1
      `, [userId]);
      
      return result.rows[0];
    } catch (error) {
      console.error(`Error fetching user ${userId}:`, error);
      throw error;
    } finally {
      if (client) await client.end();
    }
  }
  
  // Get user by email (used for login)
  static async getUserByEmail(email) {
    let client;
    try {
      client = await connectToDb();
      const result = await client.query(`
        SELECT user_id, email, password_hash, first_name, last_name, role
        FROM users
        WHERE email = $1
      `, [email]);
      
      return result.rows[0];
    } catch (error) {
      console.error(`Error fetching user by email:`, error);
      throw error;
    } finally {
      if (client) await client.end();
    }
  }

  // Register a new user
  static async registerUser(email, password, firstName, lastName, role) {
    let client;
    try {
      client = await connectToDb();
      
      // Check if email already exists
      const checkResult = await client.query(`
        SELECT user_id FROM users WHERE email = $1
      `, [email]);
      
      if (checkResult.rows.length > 0) {
        throw new Error('A user with this email already exists');
      }
      
      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      
      // Start transaction
      await client.query('BEGIN');
      
      // Insert new user
      const result = await client.query(`
        INSERT INTO users (email, password_hash, first_name, last_name, role)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING user_id
      `, [email, passwordHash, firstName, lastName, role]);
      
      const userId = result.rows[0].user_id;
      
      // If user is a student, create student record
      if (role === 'student') {
        await client.query(`
          INSERT INTO students (student_id, enrollment_date, status)
          VALUES ($1, CURRENT_DATE, 'active')
        `, [userId]);
      }
      
      // Commit transaction
      await client.query('COMMIT');
      
      return { userId };
    } catch (error) {
      // Rollback transaction on error
      if (client) {
        await client.query('ROLLBACK');
      }
      
      console.error('Error registering user:', error);
      throw error;
    } finally {
      if (client) await client.end();
    }
  }

  // Update user profile
  static async updateUser(userId, userData) {
    let client;
    try {
      client = await connectToDb();
      
      // Check if user exists
      const checkResult = await client.query(`
        SELECT user_id FROM users WHERE user_id = $1
      `, [userId]);
      
      if (checkResult.rows.length === 0) {
        throw new Error('User not found');
      }
      
      // Update user information
      const { firstName, lastName, email } = userData;
      
      // Check if email is already in use by another user
      if (email) {
        const emailCheck = await client.query(`
          SELECT user_id FROM users WHERE email = $1 AND user_id != $2
        `, [email, userId]);
        
        if (emailCheck.rows.length > 0) {
          throw new Error('Email is already in use by another user');
        }
      }
      
      // Build update query based on provided data
      let updateFields = [];
      let queryParams = [];
      let paramIndex = 1;
      
      if (firstName) {
        updateFields.push(`first_name = $${paramIndex}`);
        queryParams.push(firstName);
        paramIndex++;
      }
      
      if (lastName) {
        updateFields.push(`last_name = $${paramIndex}`);
        queryParams.push(lastName);
        paramIndex++;
      }
      
      if (email) {
        updateFields.push(`email = $${paramIndex}`);
        queryParams.push(email);
        paramIndex++;
      }
      
      // Add updated_at timestamp
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      
      // If nothing to update, return early
      if (updateFields.length === 0) {
        return { message: 'No fields to update' };
      }
      
      // Add userId as the last parameter
      queryParams.push(userId);
      
      const query = `
        UPDATE users
        SET ${updateFields.join(', ')}
        WHERE user_id = $${paramIndex}
        RETURNING user_id, email, first_name, last_name, role
      `;
      
      const result = await client.query(query, queryParams);
      
      return result.rows[0];
    } catch (error) {
      console.error(`Error updating user ${userId}:`, error);
      throw error;
    } finally {
      if (client) await client.end();
    }
  }

  // Change password
  static async changePassword(userId, currentPassword, newPassword) {
    let client;
    try {
      client = await connectToDb();
      
      // Get user's current password hash
      const userResult = await client.query(`
        SELECT password_hash FROM users WHERE user_id = $1
      `, [userId]);
      
      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }
      
      const currentPasswordHash = userResult.rows[0].password_hash;
      
      // Verify current password
      const isPasswordValid = await bcrypt.compare(currentPassword, currentPasswordHash);
      
      if (!isPasswordValid) {
        throw new Error('Current password is incorrect');
      }
      
      // Hash new password
      const saltRounds = 10;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
      
      // Update password
      await client.query(`
        UPDATE users
        SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $2
      `, [newPasswordHash, userId]);
      
      return { success: true, message: 'Password updated successfully' };
    } catch (error) {
      console.error(`Error changing password for user ${userId}:`, error);
      throw error;
    } finally {
      if (client) await client.end();
    }
  }
}

module.exports = UserModel;
