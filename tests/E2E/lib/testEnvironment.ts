import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const testEnvironment = {
  baseUrl: process.env.BASE_URL?.trim() || '',
  userEmail: process.env.USER_EMAIL?.trim() || '',
  userPassword: process.env.USER_PASSWORD || '',
};

export const requireCredentials = () => {
  const missingVariables = Object.entries(testEnvironment)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingVariables.length > 0) {
    throw new Error(`Missing E2E environment variables: ${missingVariables.join(', ')}`);
  }
};
