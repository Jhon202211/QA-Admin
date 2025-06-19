import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from './config';

const testResults = [
  {
    name: 'Login Test',
    date: Timestamp.fromDate(new Date()),
    status: 'passed',
    duration: 1.5,
    error: null,
  },
  {
    name: 'Registration Test',
    date: Timestamp.fromDate(new Date()),
    status: 'failed',
    duration: 2.3,
    error: 'Validation error: Email already exists',
  },
  {
    name: 'Profile Update Test',
    date: Timestamp.fromDate(new Date()),
    status: 'passed',
    duration: 0.8,
    error: null,
  }
];

export const seedTestResults = async () => {
  const collectionRef = collection(db, 'test_results');
  
  for (const result of testResults) {
    try {
      await addDoc(collectionRef, {
        ...result,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      console.log('Added test result:', result.name);
    } catch (error) {
      console.error('Error adding test result:', error);
    }
  }
  
  console.log('Finished seeding test results');
}; 