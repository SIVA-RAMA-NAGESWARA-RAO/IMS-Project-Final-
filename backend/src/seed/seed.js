// Quick demo-data seeder. Run with: npm run seed
require('dotenv').config();
const connectDB = require('../config/db');
const User = require('../models/User');
const CandidateProfile = require('../models/Candidate');
const Job = require('../models/Job');

const run = async () => {
  await connectDB();

  await Promise.all([User.deleteMany({}), CandidateProfile.deleteMany({}), Job.deleteMany({})]);

  const hr = await User.create({
    name: 'Priya Nair',
    email: 'hr@ims.test',
    password: 'password123',
    role: 'hr',
    isVerified: true,
  });
  const interviewer = await User.create({
    name: 'Daniel Cho',
    email: 'interviewer@ims.test',
    password: 'password123',
    role: 'interviewer',
    isVerified: true,
  });
  const candidate = await User.create({
    name: 'Sam Alvarez',
    email: 'candidate@ims.test',
    password: 'password123',
    role: 'candidate',
    isVerified: true,
  });

  await CandidateProfile.create({
    user: candidate._id,
    headline: 'Full-Stack Engineer',
    skills: ['React', 'Node.js', 'MongoDB'],
    experienceYears: 3,
    location: 'Remote',
  });

  await Job.create({
    title: 'Full-Stack Engineer',
    description: 'Build and maintain web applications across the stack.',
    department: 'Engineering',
    location: 'Remote',
    skillsRequired: ['React', 'Node.js', 'SQL'],
    postedBy: hr._id,
  });

  console.log('Seed complete:');
  console.log('  HR login:          hr@ims.test / password123');
  console.log('  Interviewer login: interviewer@ims.test / password123');
  console.log('  Candidate login:   candidate@ims.test / password123');
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
