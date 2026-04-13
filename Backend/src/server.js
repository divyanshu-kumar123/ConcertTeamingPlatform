require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan'); // <-- New
const rateLimit = require('express-rate-limit'); // <-- New
const connectDB = require('./config/db');

// Connect to Database
connectDB();

const app = express();

// 1. Security & Logging Middlewares
app.use(helmet());
app.use(morgan('dev')); // Logs API requests to the console
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? 'https://yourdomain.com' : 'http://localhost:5173',
    credentials: true 
}));

// 2. Body Parser (MUST be before routes)
app.use(express.json());

// 3. Rate Limiting (CRITICAL for 7000 users)
// Limit general API requests to 100 per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100,
  message: { message: 'Too many requests from this IP, please try again later.' }
});

// Stricter limit for Authentication (OTP & Login) to prevent spam
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Only 20 auth attempts per 15 minutes
  message: { message: 'Too many authentication attempts, please try again later.' }
});

// Apply rate limiters
app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// 4. Mount Routes
const authRoutes = require('./routes/auth.routes');
const employeeRoutes = require('./routes/employee.routes');
const invitationRoutes = require('./routes/invitation.routes');
const adminRoutes = require('./routes/admin.routes');
const teamRoutes = require('./routes/team.routes');

app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teams', teamRoutes);

// Health check route
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'success', message: 'API is running smoothly.' });
});

// 5. Global 404 Handler (Catch unknown routes)
app.use((req, res, next) => {
  res.status(404).json({ message: 'Route not found.' });
});

// 6. Global Error Handler (Prevents server from crashing on unhandled errors)
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ message: 'An unexpected server error occurred.' });
});

const PORT = process.env.PORT || 8000;

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});