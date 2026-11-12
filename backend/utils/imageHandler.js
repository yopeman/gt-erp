import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Resolve file extension from a MIME type or original filename.
 * @param {string} mime
 * @param {string} originalFilename
 * @returns {string}
 */
const resolveExtension = (mime = '', originalFilename = '') => {
  const normalizedMime = mime.toLowerCase();
  if (normalizedMime.includes('pdf')) return 'pdf';
  if (normalizedMime.includes('jpeg') || normalizedMime.includes('jpg')) return 'jpg';
  if (normalizedMime.includes('png')) return 'png';
  if (normalizedMime.includes('webp')) return 'webp';
  if (normalizedMime.includes('svg')) return 'svg';
  if (normalizedMime.includes('gif')) return 'gif';
  if (normalizedMime.includes('tiff') || normalizedMime.includes('tif')) return 'tiff';
  if (normalizedMime.includes('postscript') || normalizedMime.includes('eps')) return 'eps';
  if (normalizedMime.includes('illustrator')) return 'ai';
  if (normalizedMime.includes('photoshop') || normalizedMime.includes('psd')) return 'psd';
  if (normalizedMime.includes('word') || normalizedMime.includes('docx') || normalizedMime.includes('msword')) return 'docx';
  if (normalizedMime.includes('excel') || normalizedMime.includes('xlsx') || normalizedMime.includes('sheet')) return 'xlsx';
  if (normalizedMime.includes('text') || normalizedMime.includes('plain')) return 'txt';

  if (originalFilename) {
    const ext = path.extname(originalFilename).replace('.', '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (ext) return ext;
  }

  if (normalizedMime && !normalizedMime.includes('octet-stream')) {
    const parts = normalizedMime.split('/');
    const sub = parts[1] ? parts[1].split('+')[0].replace(/[^a-z0-9]/g, '') : '';
    if (sub) return sub;
  }

  return 'bin';
};

/**
 * Save base64 file string to disk in uploads directory
 * @param {string} base64String
 * @param {string} subfolder Default 'selfies'
 * @param {string} originalFilename Optional original filename for extension fallback
 * @returns {string} URL path to access the saved file
 */
export const saveBase64Image = (base64String, subfolder = 'selfies', originalFilename = '') => {
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

    const dataUriMatches = base64String.match(/^data:([^;,]*);base64,(.+)$/);
    if (dataUriMatches) {
      extension = resolveExtension(dataUriMatches[1], originalFilename);
      base64Data = dataUriMatches[2];
    } else if (originalFilename) {
      extension = resolveExtension('', originalFilename);
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

