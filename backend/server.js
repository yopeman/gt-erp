import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import ConnectDB from './config/database.js';
import apiRoutes from './routes/index.js';
import errorHandler from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables reliably from backend directory
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

const PORT = process.env.PORT || 5000;

ConnectDB();

const app = express();

app.use(cors());
// Support base64 image uploads for clock-in selfies and documents
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Static directory for uploaded files / fallback storage
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    system: 'GT-ERP Backend API',
    modules: ['HR', 'Inventory', 'Procurement', 'Approvals', 'Finance']
  });
});

// All API Routes (HR, Inventory, Purchase, Support)
app.use('/api', apiRoutes);

// Global Error Handler Middleware
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`server is running on http://localhost:${PORT}`);
  });
}

export default app;
