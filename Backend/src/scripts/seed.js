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
      { name: 'A', capacity: 1200 },
      { name: 'B', capacity: 1200 },
      { name: 'C', capacity: 1200 },
      { name: 'D', capacity: 1200 },
      { name: 'E', capacity: 1200 },
      { name: 'F', capacity: 1200 }
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
    dummyEmployees.push({
      sapId: '52111453',
      name: 'Divyanshu',
      email: 'divyanshu-kumar@hcltech.com',
      role: 'EMPLOYEE',
      isVerified: false
    })
    dummyEmployees.push({
      sapId: '51695026',
      name: 'Vishal Dixit',
      email: 'vishal-d@hcltech.com',
      role: 'EMPLOYEE',
      isVerified: false
    })
    dummyEmployees.push({
      sapId: '51366014',
      name: 'Chandini Kamal',
      email: 'chandini-k@hcltech.com',
      role: 'EMPLOYEE',
      isVerified: false
    })
    
    for (let i = 0; i < 100; i++) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();

      dummyEmployees.push({
        sapId: faker.string.numeric(8), // <-- Changed to exactly 8 digits
        name: `${firstName} ${lastName}`,
        // <-- Added unique email to satisfy the new required: true schema rule
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@company.com`, 
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