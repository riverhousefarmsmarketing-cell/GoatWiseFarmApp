const nextJest = require('next/jest');

const createJestConfig = nextJest({ dir: './' });

module.exports = createJestConfig({
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.{ts,tsx}'],
  // Integration tests talk to a real Supabase project; give them room.
  testTimeout: 30000,
});
