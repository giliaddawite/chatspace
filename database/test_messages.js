/**
 * Test File for Message Operations
 * 
 * Run this file to test message database operations
 * Command: node database/test-messages.js
 */

const messageDB = require('./messages');
const userDB = require('./users');
const roomDB = require('./rooms');

async function runMessageTests() {
  console.log('🧪 Starting message database tests...\n');

  try {
    // Setup: Get test user and room
    const users = await userDB.getAllUsers();
    if (users.length === 0) {
      throw new Error('No users found. Please run user tests first.');
    }
    const testUser = users[0];

    const rooms = await roomDB.getAllRooms();
    if (rooms.length === 0) {
      throw new Error('No rooms found. Please run room tests first.');
    }
    const testRoom = rooms[0];

    // Make sure user is in the room
    await roomDB.joinRoom(testUser.id, testRoom.id);

    console.log(`📝 Testing with user: ${testUser.username} (ID: ${testUser.id})`);
    console.log(`📝 Testing in room: ${testRoom.name} (ID: ${testRoom.id})\n`);

    // Test 1: Get existing messages
    console.log('📋 Test 1: Get existing messages in room');
    const existingMessages = await messageDB.getMessagesByRoom(testRoom.id);
    console.log(`  Found ${existingMessages.messages.length} messages`);
    console.log(`  Has more: ${existingMessages.pagination.has_more}`);
    if (existingMessages.messages.length > 0) {
      const lastMsg = existingMessages.messages[0];
      console.log(`  Latest: "${lastMsg.content}" by ${lastMsg.user.username}`);
    }
    console.log('');

    // Test 2: Get message count
    console.log('📋 Test 2: Get message count');
    const count = await messageDB.getMessageCount(testRoom.id);
    console.log(`  Total messages in room: ${count}`);
    console.log('');

    // Test 3: Create a new message
    console.log('📋 Test 3: Create new message');
    const newMessage = await messageDB.createMessage(
      testRoom.id,
      testUser.id,
      'This is a test message from the test suite!'
    );
    console.log(`  Created message ID: ${newMessage.id}`);
    console.log(`  Content: "${newMessage.content}"`);
    console.log(`  Created at: ${newMessage.created_at}`);
    console.log('');

    // Test 4: Get message by ID
    console.log('📋 Test 4: Get message by ID');
    const fetchedMessage = await messageDB.getMessageById(newMessage.id);
    if (fetchedMessage) {
      console.log(`  Found message: "${fetchedMessage.content}"`);
      console.log(`  Author: ${fetchedMessage.user.username}`);
    } else {
      console.log('  ❌ Message not found');
    }
    console.log('');

    // Test 5: Update the message (edit)
    console.log('📋 Test 5: Update message (edit)');
    const updatedMessage = await messageDB.updateMessage(
      newMessage.id,
      testUser.id,
      'This message has been EDITED!'
    );
    console.log(`  Updated content: "${updatedMessage.content}"`);
    console.log(`  Edited at: ${updatedMessage.edited_at}`);
    console.log('');

    // Test 6: Try to edit someone else's message (should fail)
    console.log('📋 Test 6: Try to edit someone else\'s message (should fail)');
    // First, create another user
    const timestamp = Date.now();
    const shortId = timestamp.toString().slice(-6); // Use last 6 digits
    const otherUser = await userDB.createUser(
      `test2_${shortId}`,
      `test2_${shortId}@example.com`,
      '$2b$10$fake_hash'
    );
    
    try {
      await messageDB.updateMessage(
        newMessage.id,
        otherUser.id, // Different user!
        'Trying to hack this message'
      );
      console.log('  ❌ ERROR: Should have failed!');
    } catch (error) {
      console.log(`  ✅ Correctly rejected: ${error.message}`);
    }
    console.log('');

    // Test 7: Get messages with pagination
    console.log('📋 Test 7: Get messages with pagination (limit 5)');
    const paginatedMessages = await messageDB.getMessagesByRoom(testRoom.id, { limit: 5 });
    console.log(`  Returned: ${paginatedMessages.pagination.returned_count} messages`);
    console.log(`  Has more: ${paginatedMessages.pagination.has_more}`);
    paginatedMessages.messages.forEach((msg, index) => {
      console.log(`    ${index + 1}. "${msg.content.substring(0, 50)}..." by ${msg.user.username}`);
    });
    console.log('');

    // Test 8: Get messages before a timestamp
    if (paginatedMessages.pagination.oldest_timestamp) {
      console.log('📋 Test 8: Get messages before oldest timestamp');
      const olderMessages = await messageDB.getMessagesByRoom(testRoom.id, {
        limit: 5,
        before: paginatedMessages.pagination.oldest_timestamp
      });
      console.log(`  Found ${olderMessages.messages.length} older messages`);
      console.log('');
    }

    // Test 9: Try to create message in room user is not a member of
    console.log('📋 Test 9: Try to send message in room user is not in (should fail)');
    // Create a new room
    const newRoom = await roomDB.createRoom(
      `Private Room ${timestamp}`,
      'Private test room',
      testUser.id
    );
    
    try {
      await messageDB.createMessage(
        newRoom.id,
        otherUser.id, // User not in this room!
        'Trying to send message in room I am not in'
      );
      console.log('  ❌ ERROR: Should have failed!');
    } catch (error) {
      console.log(`  ✅ Correctly rejected: ${error.message}`);
    }
    console.log('');

    // Test 10: Delete a message
    console.log('📋 Test 10: Delete a message');
    const deleteResult = await messageDB.deleteMessage(newMessage.id, testUser.id);
    console.log(`  ${deleteResult.message}`);
    console.log('');

    // Test 11: Verify message was deleted
    console.log('📋 Test 11: Verify message was deleted');
    const deletedMessage = await messageDB.getMessageById(newMessage.id);
    if (deletedMessage === null) {
      console.log('  ✅ Message successfully deleted');
    } else {
      console.log('  ❌ Message still exists!');
    }

    console.log('\n✅ All message tests completed!');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the tests
runMessageTests();