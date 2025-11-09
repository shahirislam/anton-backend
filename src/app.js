const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const responseTrait = require('./middleware/responseTrait');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Trust proxy - important for getting correct protocol/host when behind reverse proxy (Render, Heroku, etc.)
app.set('trust proxy', true);

app.use(helmet());
app.use(cors());

// Stripe webhook needs raw body for signature verification
// Register webhook route before JSON middleware
app.use('/api/v1/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from public/uploads directory
// Use absolute path to ensure it works correctly
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

app.use(responseTrait);

const healthCheck = async (req, res) => {
  // Mongoose connection states: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : 'disconnected';

  if (dbState !== 1) {
    return res.error('Database not connected', 503, {
      status: 'unhealthy',
      database: dbStatus,
      timestamp: new Date().toISOString(),
    });
  }

  res.success('Server is running', {
    status: 'healthy',
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
};

app.get('/health', healthCheck);
app.get('/api/health', healthCheck);

app.use('/api/v1', require('./routes/api/v1'));

// 404 handler - only for API routes, not for static files
app.use((req, res) => {
  // Skip 404 handling for static file requests (uploads)
  // Express static middleware will handle those
  if (req.path.startsWith('/uploads')) {
    return res.status(404).send('File not found');
  }
  res.error('Route not found', 404);
});

app.use(errorHandler);

module.exports = app;

