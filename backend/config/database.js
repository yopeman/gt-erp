import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config();

export const ConnectDB = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/gt_erp';
  try {
    await mongoose.connect(mongoUri);
    console.log('database connected successfully');
  } catch (error) {
    console.warn(`MongoDB connection notice: ${error.message}`);
  }
};

export default ConnectDB;
