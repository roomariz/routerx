/**
 * Simple .env file loader (MIT Licensed alternative to dotenv)
 * 
 * This is a lightweight implementation inspired by common .env loading patterns
 * that provides the same functionality as dotenv but without the dependency.
 */

import fs from 'fs';
import path from 'path';

/**
 * Load environment variables from a .env file
 * @param {string} filePath - Path to the .env file (defaults to ./.env)
 */
function loadEnvFile(filePath = '.env') {
  try {
    // Check if the file exists
    if (fs.existsSync(filePath)) {
      // Read the file content
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Split content by newlines and process each line
      const lines = content.split(/\r?\n/);
      
      for (const line of lines) {
        // Skip empty lines and comments
        if (line.trim() === '' || line.startsWith('#')) {
          continue;
        }
        
        // Parse key=value pairs
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          let key = match[1].trim();
          let value = match[2].trim();
          
          // Remove surrounding quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) || 
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }
          
          // Only set the environment variable if it doesn't already exist
          if (!process.env.hasOwnProperty(key)) {
            process.env[key] = value;
          }
        }
      }
    }
  } catch (error) {
    // Silently fail if .env file has issues - similar to dotenv behavior
    console.warn(`Warning: Could not load .env file: ${error.message}`);
  }
}

// Auto-load .env file on import, similar to dotenv/config
loadEnvFile();

export default { loadEnvFile };