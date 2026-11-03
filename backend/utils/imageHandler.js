import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Save base64 image string to disk in uploads directory
 * @param {string} base64String 
 * @param {string} subfolder Default 'selfies'
 * @returns {string} URL path to access the saved image
 */
export const saveBase64Image = (base64String, subfolder = 'selfies') => {
  if (!base64String || typeof base64String !== 'string') {
    return null;
  }

  // If already a hosted URL, return as is
  if (base64String.startsWith('http://') || base64String.startsWith('https://') || base64String.startsWith('/uploads/')) {
    return base64String;
  }

  try {
    const uploadDir = path.join(__dirname, '..', 'uploads', subfolder);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    let extension = 'bin';
    let base64Data = base64String;

    const dataUriMatches = base64String.match(/^data:([A-Za-z0-9-+\/]+);base64,(.+)$/);
    if (dataUriMatches) {
      const mime = dataUriMatches[1].toLowerCase();
      base64Data = dataUriMatches[2];

      if (mime.includes('pdf')) extension = 'pdf';
      else if (mime.includes('jpeg') || mime.includes('jpg')) extension = 'jpg';
      else if (mime.includes('png')) extension = 'png';
      else if (mime.includes('webp')) extension = 'webp';
      else if (mime.includes('svg')) extension = 'svg';
      else if (mime.includes('gif')) extension = 'gif';
      else if (mime.includes('word') || mime.includes('docx') || mime.includes('msword')) extension = 'docx';
      else if (mime.includes('excel') || mime.includes('xlsx') || mime.includes('sheet')) extension = 'xlsx';
      else if (mime.includes('text') || mime.includes('plain')) extension = 'txt';
      else {
        const parts = mime.split('/');
        extension = parts[1] ? parts[1].replace(/[^a-z0-9]/g, '') : 'bin';
      }
    } else {
      const imgMatches = base64String.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
      if (imgMatches && imgMatches.length === 3) {
        extension = imgMatches[1] === 'jpeg' ? 'jpg' : imgMatches[1];
        base64Data = imgMatches[2];
      }
    }

    const filename = `${subfolder}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${extension}`;
    const filePath = path.join(uploadDir, filename);

    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

    return `/uploads/${subfolder}/${filename}`;
  } catch (error) {
    console.error('Error saving image:', error);
    return base64String;
  }
};

export default {
  saveBase64Image
};

