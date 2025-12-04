import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import env from './config/env.js';
import routes from './routes/index.js';

const app = express();

// Global middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true, // Allow cookies to be sent
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

// Session middleware configuration
// Uses in-memory store for tests (no MongoDB required), MongoDB for production
const sessionStore = env.nodeEnv === 'test'
  ? undefined // In-memory session store for tests - simplifies test setup
  : MongoStore.create({
    mongoUrl: env.mongodbUri,
    touchAfter: 24 * 3600, // Lazy session update interval in seconds
    crypto: {
      secret: env.session.secret
    }
  });

app.use(session({
  secret: env.session.secret,
  name: env.session.name,
  resave: false,
  saveUninitialized: true, // Create session even if not modified (needed for cart persistence)
  ...(sessionStore && { store: sessionStore }), // Only add MongoDB store if not in test mode
  cookie: {
    maxAge: env.session.maxAge,
    httpOnly: true,
    secure: env.nodeEnv === 'production', // Use secure cookies only in production
    sameSite: env.nodeEnv === 'production' ? 'none' : 'lax', // Adjust SameSite policy by environment
  }
}));

// Mount API routes under /api prefix
app.use('/api', routes);

// Health check endpoint for load balancers and monitoring
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Food Delivery API is running',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    message: 'Resource not found',
  });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  });
});

export default app;
