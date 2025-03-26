// Script to initialize the database schema for clinical scheduling and ride time tracking
require('dotenv').config();
const { updateSchedulingSchema } = require('./db-updates/scheduling-schema');

async function main() {
  try {
    console.log('Starting database schema update for clinical scheduling and ride time tracking...');
    
    // Run the schema update
    const result = await updateSchedulingSchema();
    
    console.log('Database schema update completed successfully!');
    console.log(result);
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating database schema:', error);
    process.exit(1);
  }
}

// Run the main function
main();
