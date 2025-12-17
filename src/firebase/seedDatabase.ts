import { seedTestResults } from './seedData';

const seedDatabase = async () => {
  try {
    await seedTestResults();
    console.log('Database seeding completed successfully');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
};

seedDatabase(); 