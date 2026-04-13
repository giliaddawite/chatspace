/**
 * Auth Endpoint Tests
 * 
 * Tests the full JWT auth flow:
 * - Register
 * - Login
 * - Token refresh with rotation
 * - Logout and revocation
 * 
 * Run with: npm test
 */

// Import supertest — it lets us make HTTP requests to our app
const request = require('supertest');

// Import your Express app (not the running server, just the app object)
const app = require('../server');

// Import pool so we can clean up the database after tests
const pool = require('../database/connection');


// ============================================================
// describe() groups related tests together.
// Think of it like a folder — "Auth Endpoints" contains
// all the tests related to authentication.
// ============================================================
describe('Auth Endpoints', () => {

  // This holds data we'll share across tests.
  // When register gives us tokens, we save them here
  // so the refresh and logout tests can use them.
  let accessToken;
  let refreshToken;

  // A unique email for this test run.
  // Date.now() ensures it's different every time so we don't
  // hit "email already registered" from a previous test run.
  const uniqueSuffix = Math.floor(Math.random() * 9000) + 1000;
  const testUser = {
    username: 'test' + uniqueSuffix,
    email: `test${Date.now()}@test.com`,
    password: 'password123'
  };


  // ============================================================
  // afterAll() runs once after ALL tests in this describe block
  // are done. We use it to clean up — close the database
  // connection so Jest can exit cleanly.
  // ============================================================
  afterAll(async () => {
    await pool.end();
  });


  // ============================================================
  // TEST 1: Register a new user
  // ============================================================
  test('POST /api/auth/register — creates user and returns tokens', async () => {

    // request(app) creates a Supertest instance pointed at your app.
    // .post() sends a POST request to the given path.
    // .send() sets the JSON request body.
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: testUser.username,
        email: testUser.email,
        password: testUser.password
      });

    // expect() is Jest's assertion function.
    // It checks if the value matches what we expect.
    // If it doesn't, the test fails with a clear error message.

    expect(res.status).toBe(201);
    // .toBe() checks exact equality. 201 = Created.

    expect(res.body.success).toBe(true);
    // The response body should have success: true

    expect(res.body.data.access_token).toBeDefined();
    // .toBeDefined() checks that the value exists (not undefined).
    // We don't check the exact token value — it's random every time.
    // We just verify it's there.

    expect(res.body.data.refresh_token).toBeDefined();

    expect(res.body.data.user.email).toBe(testUser.email);
    // The returned user should have the email we registered with.

    expect(res.body.data.user.username).toBe(testUser.username);

    // Password should NEVER be in the response
    expect(res.body.data.user.password).toBeUndefined();
    expect(res.body.data.user.password_hash).toBeUndefined();

    // Save tokens for later tests
    accessToken = res.body.data.access_token;
    refreshToken = res.body.data.refresh_token;
  });


  // ============================================================
  // TEST 2: Duplicate registration should fail
  // ============================================================
  test('POST /api/auth/register — rejects duplicate email', async () => {

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'anotheruser',
        email: testUser.email,       // Same email as Test 1
        password: 'password123'
      });

    expect(res.status).toBe(400);
    // 400 = Bad Request. The email is taken.

    expect(res.body.success).toBe(false);
  });


  // ============================================================
  // TEST 3: Registration validation
  // ============================================================
  test('POST /api/auth/register — rejects invalid input', async () => {

    // Missing password
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'someone',
        email: 'someone@test.com'
        // no password field
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });


  // ============================================================
  // TEST 4: Login with correct credentials
  // ============================================================
  test('POST /api/auth/login — returns tokens with valid credentials', async () => {

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.access_token).toBeDefined();
    expect(res.body.data.refresh_token).toBeDefined();

    // Update our saved tokens to the freshest ones
    accessToken = res.body.data.access_token;
    refreshToken = res.body.data.refresh_token;
  });


  // ============================================================
  // TEST 5: Login with wrong password
  // ============================================================
  test('POST /api/auth/login — rejects wrong password', async () => {

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'wrongpassword'
      });

    expect(res.status).toBe(401);
    // 401 = Unauthorized. Credentials don't match.

    expect(res.body.success).toBe(false);
  });


  // ============================================================
  // TEST 6: Login with non-existent email
  // ============================================================
  test('POST /api/auth/login — rejects non-existent email', async () => {

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nobody@test.com',
        password: 'password123'
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });


  // ============================================================
  // TEST 7: Access protected route with valid token
  // ============================================================
  test('GET /api/auth/me — returns user with valid token', async () => {

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);
      // .set() adds a header to the request.
      // This is the equivalent of -H "Authorization: Bearer ..." in cURL.

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
  });


  // ============================================================
  // TEST 8: Protected route without token
  // ============================================================
  test('GET /api/auth/me — rejects request without token', async () => {

    const res = await request(app)
      .get('/api/auth/me');
      // No Authorization header

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });


  // ============================================================
  // TEST 9: Protected route with garbage token
  // ============================================================
  test('GET /api/auth/me — rejects invalid token', async () => {

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer totally.fake.token');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });


  // ============================================================
  // TEST 10: Refresh token — get new pair
  // ============================================================
  test('POST /api/auth/refresh — returns new token pair', async () => {

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refresh_token: refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.access_token).toBeDefined();
    expect(res.body.data.refresh_token).toBeDefined();

    // The new tokens should be DIFFERENT from the old ones.
    // This proves new tokens were actually generated.
    expect(res.body.data.access_token).not.toBe(accessToken);
    expect(res.body.data.refresh_token).not.toBe(refreshToken);

    // Save the old refresh token before updating
    const oldRefreshToken = refreshToken;

    // Update to new tokens
    accessToken = res.body.data.access_token;
    refreshToken = res.body.data.refresh_token;

    // ============================================================
    // TEST 10b: Old refresh token should be revoked (rotation)
    // We test this immediately because it depends on the
    // refresh we just did above.
    // ============================================================
    const reuseRes = await request(app)
      .post('/api/auth/refresh')
      .send({ refresh_token: oldRefreshToken });

    expect(reuseRes.status).toBe(401);
    // The old token was revoked during rotation.
    // An attacker who stole it is locked out.
  });


  // ============================================================
  // TEST 11: Refresh with missing token
  // ============================================================
  test('POST /api/auth/refresh — rejects missing token', async () => {

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({});
      // Empty body — no refresh_token

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });


  // ============================================================
  // TEST 12: Refresh with garbage token
  // ============================================================
  test('POST /api/auth/refresh — rejects invalid token', async () => {

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refresh_token: 'garbage.fake.token' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });


  // ============================================================
  // TEST 13: Logout — revoke all refresh tokens
  // ============================================================
  test('POST /api/auth/logout — revokes all tokens', async () => {

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });


  // ============================================================
  // TEST 14: Refresh after logout should fail
  // ============================================================
  test('POST /api/auth/refresh — fails after logout', async () => {

    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refresh_token: refreshToken });

    expect(res.status).toBe(401);
    // Logout revoked all refresh tokens.
    // Even the most recent one is dead.
  });

});