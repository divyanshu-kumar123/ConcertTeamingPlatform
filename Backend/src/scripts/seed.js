require('dotenv').config();
const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker');
const { User, SeatingGroup, Team, Invitation, Otp } = require('../models');
const bcrypt = require('bcrypt');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB Connected for Seeding');
  } catch (error) {
    console.error('Connection failed:', error);
    process.exit(1);
  }
};

// Helper function to safely drop a collection and its old indexes
const dropCollectionSafe = async (model) => {
  try {
    await model.collection.drop();
  } catch (err) {
    // Error code 26 means "NamespaceNotFound" (the collection doesn't exist yet). We can ignore it.
    if (err.code !== 26) {
      console.log(`Note: Issue dropping ${model.modelName} collection -`, err.message);
    }
  }
};

const seedDatabase = async () => {
  await connectDB();

  try {
    console.log('Dropping existing collections to clear old indexes...');
    
    await Promise.all([
      dropCollectionSafe(User),
      dropCollectionSafe(SeatingGroup),
      dropCollectionSafe(Team),
      dropCollectionSafe(Invitation),
      dropCollectionSafe(Otp)
    ]);

    // Give MongoDB a second to clear out the dropped collections
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log('Creating Seating Groups...');
    const groups = [
      { name: 'A', capacity: 1000 },
      { name: 'B', capacity: 1000 },
      { name: 'C', capacity: 1000 },
      { name: 'D', capacity: 1000 },
      { name: 'E', capacity: 1000 },
      { name: 'F', capacity: 1000 },
      { name: 'G', capacity: 500 },
      { name: 'H', capacity: 500 },
    ];
    await SeatingGroup.insertMany(groups);

 console.log('Creating Admin Account...');
    
    // Hash the admin password
    const salt = await bcrypt.genSalt(10);
    const hashedAdminPassword = await bcrypt.hash('adminpassword123', salt);

    await User.create({
      sapId: 'ADMIN999',
      name: 'Super Admin',
      email: 'admin@concertplatform.com',
      password: hashedAdminPassword, // <-- Save the hashed version here
      role: 'ADMIN',
      isVerified: true
    });

    console.log('Generating 100 Dummy Employees...');
    const dummyEmployees = [];
    
    for (let i = 0; i < 100; i++) {
      dummyEmployees.push({
        sapId: `SAP${faker.string.numeric(5)}`,
        name: faker.person.fullName(),
        role: 'EMPLOYEE',
        isVerified: false
      });
    }

    await User.insertMany(dummyEmployees);

    console.log('Database Seeding Completed Successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();