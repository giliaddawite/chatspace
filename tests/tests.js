// Tests for the database operations

const pool = require('../database/connection');
const userDB = require('../database/users');

async function runTests() {
  try {
    // Test database connection
    const timeResult = await pool.query('SELECT NOW()');
    console.log('Connected to PostgreSQL database');
    console.log(`Database time: ${timeResult.rows[0].now}`);
    console.log('');
    console.log('Starting database tests...');
    console.log('');

    // Test 1: Get all existing users
    console.log('Test 1: Get all existing users');
    const allUsers = await userDB.getAllUsers();
    console.log(`Found ${allUsers.length} users:`);
    allUsers.forEach(user => {
      console.log(`  - ${user.username} (${user.email})`);
    });
    console.log('');

    // Test 2: Get user by ID
    console.log('Test 2: Get user by ID (1)');
    const user1 = await userDB.getUserById(1);
    if (user1) {
      console.log(`  Found: ${user1.username}`);
    } else {
      console.log('  User not found');
    }
    console.log('');

    // Test 3: Get user by email
    console.log('Test 3: Get user by email (test@example.com)');
    const userByEmail = await userDB.getUserByEmail('test@example.com');
    if (userByEmail) {
      console.log(`Found: ${userByEmail.username}`);
      console.log(`Has password_hash: ${!!userByEmail.password_hash}`);
    } else {
      console.log('  User not found');
    }
    console.log('');

    // Test 4: Create a new user
    console.log('Test 4: Create new user');
    const timestamp = Date.now();
    const newUser = await userDB.createUser(
      `bob_${timestamp}`,  // ← Unique username
      `bob_${timestamp}@example.com`,  // ← Unique email
      '$2b$10$fake_hash_for_testing'
    );
    console.log(`  Created: ${newUser.username} (ID: ${newUser.id})`);
    console.log('');

    // Test 5: Try to create duplicate username (should fail)
    console.log('Test 5: Try to create duplicate username (should fail)');
    try {
      await userDB.createUser(
        'alice', // Duplicate!
        'alice2@example.com',
        '$2b$10$fake_hash'
      );
      console.log('  ERROR: Should have failed!');
    } catch (error) {
      console.log(`Correctly rejected: ${error.message}`);
    }
    console.log('');

    // Test 6: Get all users again (should have new user)
    console.log('Test 6: Get all users again');
    const allUsersAfter = await userDB.getAllUsers();
    console.log(`Now have ${allUsersAfter.length} users:`);
    allUsersAfter.forEach(user => {
      console.log(`  - ${user.username} (${user.email})`);
    });
    console.log('');

    console.log('✅ All tests completed!');
    await pool.end();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

// Wait a bit for the connection message from connection.js, then run tests
setTimeout(() => {
  runTests();
}, 500);

