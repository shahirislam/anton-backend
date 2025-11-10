const fs = require('fs');
const path = require('path');

/**
 * Delete a file from the filesystem
 * @param {string} filePath - Path to the file (can be relative URL or absolute path)
 * @returns {Promise<boolean>} - Returns true if file was deleted, false if it didn't exist
 */
const deleteFile = async (filePath) => {
  if (!filePath) return false;

  try {
    // If it's a URL, extract the path
    let actualPath = filePath;
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      // Extract path from URL (e.g., /uploads/competitions/image.jpg)
      const urlPath = new URL(filePath).pathname;
      actualPath = path.join(__dirname, '../../public', urlPath);
    } else if (filePath.startsWith('/uploads/')) {
      // Relative path from public folder
      actualPath = path.join(__dirname, '../../public', filePath);
    } else if (!path.isAbsolute(filePath)) {
      // Assume it's relative to public folder
      actualPath = path.join(__dirname, '../../public', filePath);
    }

    if (fs.existsSync(actualPath)) {
      fs.unlinkSync(actualPath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

/**
 * Get the full URL for a file path
 * @param {string} filePath - Relative path from public folder (e.g., /uploads/competitions/image.jpg)
 * @param {string|object} baseUrlOrReq - Base URL string OR Express request object (optional)
 * @returns {string} - Full URL
 */
const getFileUrl = (filePath, baseUrlOrReq = null) => {
  if (!filePath) return null;
  
  // If it's already a full URL, return as is
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath;
  }

  let appBaseUrl = null;

  // If baseUrlOrReq is a request object, derive base URL from request headers
  if (baseUrlOrReq && typeof baseUrlOrReq === 'object' && baseUrlOrReq.headers) {
    const req = baseUrlOrReq;
    
    // Get protocol - check X-Forwarded-Proto first (for reverse proxies)
    let protocol = 'http';
    const forwardedProto = req.get('x-forwarded-proto') || req.headers['x-forwarded-proto'];
    if (forwardedProto) {
      protocol = forwardedProto.split(',')[0].trim(); // Handle multiple proxies
    } else if (req.protocol) {
      protocol = req.protocol;
    } else if (req.secure) {
      protocol = 'https';
    }
    
    // Ensure protocol is http or https
    if (protocol !== 'http' && protocol !== 'https') {
      protocol = 'https'; // Default to https for production
    }
    
    // Get host - try multiple methods
    let host = null;
    if (req.get && typeof req.get === 'function') {
      host = req.get('host');
    }
    if (!host && req.headers) {
      host = req.headers.host || req.headers['x-forwarded-host'];
    }
    
    if (host) {
      // Remove port if it's the default port for the protocol
      const hostParts = host.split(':');
      if (hostParts.length === 2) {
        const port = parseInt(hostParts[1]);
        if ((protocol === 'http' && port === 80) || (protocol === 'https' && port === 443)) {
          host = hostParts[0];
        }
      }
      appBaseUrl = `${protocol}://${host}`;
    }
  } else if (typeof baseUrlOrReq === 'string') {
    // If it's a string, use it as base URL
    appBaseUrl = baseUrlOrReq;
  }

  // Fallback to environment variables or default
  appBaseUrl = appBaseUrl || process.env.BASE_URL || process.env.APP_URL || 'http://localhost:5000';

  // Ensure path starts with /
  const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
  return `${appBaseUrl}${normalizedPath}`;
};

module.exports = {
  deleteFile,
  getFileUrl,
};

