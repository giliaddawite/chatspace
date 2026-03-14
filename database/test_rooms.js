/**
 * Test File for Room Operations
 * 
 * Run this file to test room database operations
 * Command: node database/test-rooms.js
 */

const roomDB = require('./rooms');
const userDB = require('./users');

async function runRoomTests() {
  console.log('Starting room database tests...\n');

  try {
    // Test 1: Get all rooms
    console.log('Test 1: Get all existing rooms');
    const allRooms = await roomDB.getAllRooms();
    console.log(`Found ${allRooms.length} rooms:`);
    allRooms.forEach(room => {
      console.log(`  - ${room.name} (${room.member_count} members)`);
    });
    console.log('');

    // Test 2: Get room by ID
    console.log('Test 2: Get room by ID (1)');
    const room1 = await roomDB.getRoombyID(1);
    if (room1) {
      console.log(`  Found: ${room1.name}`);
      console.log(`  Members: ${room1.member_count}`);
    } else {
      console.log('Room not found');
    }
    console.log('');

    // Test 3: Create a new room
    console.log('Test 3: Create new room');
    const timestamp = Date.now();
    
    // First, get a user to be the creator
    const users = await userDB.getAllUsers();
    if (users.length === 0) {
      throw new Error('No users found. Please run user tests first.');
    }
    const creator = users[0];
    
    const newRoom = await roomDB.createRoom(
      `Test Room ${timestamp}`,
      'A room for testing',
      creator.id
    );
    console.log(`  Created: ${newRoom.name} (ID: ${newRoom.id})`);
    console.log('');

    // Test 4: Try to create duplicate room (should fail)
    console.log('Test 4: Try to create duplicate room name (should fail)');
    try {
      await roomDB.createRoom(
        newRoom.name,  // Duplicate name!
        'Another description',
        creator.id
      );
      console.log('ERROR: Should have failed!');
    } catch (error) {
      console.log(`Correctly rejected: ${error.message}`);
    }
    console.log('');

    // Test 5: Join a room
    console.log('Test 5: Join a room');
    const result = await roomDB.joinRoom(creator.id, newRoom.id);
    console.log(`  ${result.message}`);
    console.log('');

    // Test 6: Check if user is in room
    console.log('Test 6: Check if user is in room');
    const isMember = await roomDB.isUserInRoom(creator.id, newRoom.id);
    console.log(`  Is user ${creator.id} in room ${newRoom.id}? ${isMember ? 'Yes ✅' : 'No ❌'}`);
    console.log('');

    // Test 7: Get room members
    console.log('Test 7: Get room members');
    const members = await roomDB.getRoomMembers(newRoom.id);
    console.log(`  Room "${newRoom.name}" has ${members.length} members:`);
    members.forEach(member => {
      console.log(`    - ${member.username} (joined: ${member.joined_at})`);
    });
    console.log('');

    // Test 8: Leave room
    console.log('Test 8: Leave room');
    const leaveResult = await roomDB.leaveRoom(creator.id, newRoom.id);
    console.log(`  ${leaveResult.message}`);
    console.log('');

    // Test 9: Verify user left
    console.log('Test 9: Verify user left room');
    const isMemberAfter = await roomDB.isUserInRoom(creator.id, newRoom.id);
    console.log(`  Is user still in room? ${isMemberAfter ? 'Yes ❌' : 'No ✅'}`);
    console.log('');

    // Test 10: Get all rooms again
    console.log('Test 10: Get all rooms again');
    const allRoomsAfter = await roomDB.getAllRooms();
    console.log(`Now have ${allRoomsAfter.length} rooms:`);
    allRoomsAfter.forEach(room => {
      console.log(`  - ${room.name} (${room.member_count} members)`);
    });

    console.log('\n All room tests completed!');
    process.exit(0);

  } catch (error) {
    console.error('\n Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the tests
runRoomTests();