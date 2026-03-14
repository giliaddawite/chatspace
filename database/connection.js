//PostgreSQL Database connection

const { Pool } = require('pg');
require('dotenv').config();

// Validate DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('Error: DATABASE_URL is not set in .env file');
  process.exit(1);
}

const poolConfig = {
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

const pool = new Pool(poolConfig);

// Test connection asynchronously (don't block module loading)
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
      console.error('Error connecting to PostgreSQL database:');
      console.error(err.message);
      console.error('\nMake sure:');
      console.error('1. Docker container is running: docker ps');
      console.error('2. DATABASE_URL in .env is correct');
      console.error('3. PostgreSQL is accepting connections on port 5432');
      // Don't exit here - let the calling code handle the error
    } else {
      console.log('Connected to PostgreSQL database');
      console.log(`Database time: ${res.rows[0].now}`);
    }
  });

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle client:' , err);
});

module.exports = pool;