import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import env from './config/env.js';
import routes from './routes/index.js';
import { handleWebhook } from './controllers/payment.controller.js';

const app = express();

// Global middleware
app.use(cors({
  origin: 'https://railway.com/project/2d096e2d-1d3f-41be-8309-b82eb0fc48a8/service/7088d7d2-d492-43ab-b657-166fe57d0bf3/settings?environmentId=e2273d01-ad78-4986-b21c-225f0c0e7243',
  credentials: true, // Allow cookies to be sent
}));
// Webhook endpoint must receive raw body for signature verification
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), handleWebhook);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

// Session middleware configuration
// Uses in-memory store for tests (no MongoDB required), MongoDB for production
const useInMemoryDb = process.env.USE_IN_MEMORY_DB === 'true';
const mongoUri = process.env.MONGODB_URI;

if (useInMemoryDb || !mongoUri) {
  // Use default in-memory session store for dev/test
  app.use(session({
    secret: env.session.secret,
    name: env.session.name,
    resave: false,
    saveUninitialized: true, // Create session even if not modified (needed for cart)
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
    saveUninitialized: true, // Create session even if not modified (needed for cart)
    store: MongoStore.create({ mongoUrl: mongoUri }),
    cookie: {
      maxAge: env.session.maxAge,
      httpOnly: true,
      secure: env.nodeEnv === 'production',
      sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
    }
  }));
}

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
