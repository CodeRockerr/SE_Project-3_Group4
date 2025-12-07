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

// Session middleware
// Uses in-memory store for tests (no MongoDB required), MongoDB for production
const useInMemoryDb = process.env.USE_IN_MEMORY_DB === 'true';
const mongoUri = process.env.MONGODB_URI;

if (useInMemoryDb || !mongoUri) {
  // In-memory session store for tests
  app.use(session({
    secret: env.session.secret,
    name: env.session.name,
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: env.session.maxAge,
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
    }
  }));
} else {
  // Use MongoDB-backed session store for production
  app.use(session({
    secret: env.session.secret,
    name: env.session.name,
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({ mongoUrl: mongoUri }),
    cookie: {
      maxAge: env.session.maxAge,
      httpOnly: true,
      secure: env.nodeEnv === 'production',
      sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
    }
  }));
}

// API routes
app.use('/api', routes);

// Health check fallback for root requests
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
