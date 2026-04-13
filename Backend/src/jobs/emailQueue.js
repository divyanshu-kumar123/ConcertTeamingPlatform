const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');
const nodemailer = require('nodemailer');

// Upstash requires specific TLS settings for rediss:// connections
const redisOptions = {
  maxRetriesPerRequest: null,
};

if (process.env.REDIS_URL.startsWith('rediss://')) {
  redisOptions.tls = { rejectUnauthorized: false };
}

const redisConnection = new Redis(process.env.REDIS_URL, redisOptions);

// 1. Create the Queue
const emailQueue = new Queue('email-queue', { connection: redisConnection });

// 2. Configure the Nodemailer Transporter (using Ethereal for now)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// 3. Create the Worker to process jobs
const emailWorker = new Worker('email-queue', async (job) => {
  const { email, otp } = job.data;
  
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Your Concert Platform Registration OTP',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>Event Registration</h2>
        <p>Your one-time verification code is:</p>
        <h1 style="color: #4A90E2; letter-spacing: 5px;">${otp}</h1>
        <p>This code will expire in 10 minutes.</p>
      </div>
    `
  });
  
  console.log(`[Worker] OTP Email sent successfully to ${email}`);
}, { connection: redisConnection });

emailWorker.on('failed', (job, err) => {
  console.error(`[Worker] Job failed: ${job.id}`, err.message);
});

module.exports = { emailQueue };