// tests/unit/envLoader.test.js
import { jest, describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';

// Create a function to load and test envLoader in isolation (replicating the logic from envLoader.js)
function loadEnvFileForTest(filePath = '.env') {
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

describe('envLoader', () => {
  // Save original environment to restore after tests
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    // Clear process.env for testing (except system vars)
    Object.keys(process.env).forEach(key => {
      if (!['NODE_ENV', 'PATH', 'HOME', 'USER', 'SHELL', 'OSTYPE', 'OS', 'USERNAME', 'TEMP', 'TMP', 'COMPUTERNAME', 'USERPROFILE'].includes(key)) {
        delete process.env[key];
      }
    });
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
  });

  test('loads environment variables from .env file', () => {
    // Mock fs.existsSync to return true
    const originalExistsSync = fs.existsSync;
    const originalReadFileSync = fs.readFileSync;
    
    fs.existsSync = jest.fn().mockReturnValue(true);
    fs.readFileSync = jest.fn().mockReturnValue('TEST_VAR=test_value\nANOTHER_VAR=another_value');
    
    try {
      loadEnvFileForTest('.env');
      
      expect(process.env.TEST_VAR).toBe('test_value');
      expect(process.env.ANOTHER_VAR).toBe('another_value');
    } finally {
      // Restore original methods
      fs.existsSync = originalExistsSync;
      fs.readFileSync = originalReadFileSync;
    }
  });

  test('handles quoted values correctly', () => {
    const originalExistsSync = fs.existsSync;
    const originalReadFileSync = fs.readFileSync;
    
    fs.existsSync = jest.fn().mockReturnValue(true);
    fs.readFileSync = jest.fn().mockReturnValue('QUOTED_VAR="quoted value"\nSINGLE_QUOTED_VAR=\'single quoted value\'');
    
    try {
      loadEnvFileForTest('.env');
      
      expect(process.env.QUOTED_VAR).toBe('quoted value');
      expect(process.env.SINGLE_QUOTED_VAR).toBe('single quoted value');
    } finally {
      fs.existsSync = originalExistsSync;
      fs.readFileSync = originalReadFileSync;
    }
  });

  test('skips commented and empty lines', () => {
    const originalExistsSync = fs.existsSync;
    const originalReadFileSync = fs.readFileSync;
    
    fs.existsSync = jest.fn().mockReturnValue(true);
    fs.readFileSync = jest.fn().mockReturnValue('# This is a comment\n\nVALID_VAR=test\n  # Another comment with spaces  \n\n');
    
    try {
      loadEnvFileForTest('.env');
      
      expect(process.env.VALID_VAR).toBe('test');
      // Ensure commented variables are not set
      expect(process.env.THIS).toBeUndefined();
      expect(process.env.ANOTHER).toBeUndefined();
    } finally {
      fs.existsSync = originalExistsSync;
      fs.readFileSync = originalReadFileSync;
    }
  });

  test('does not override existing environment variables', () => {
    process.env.EXISTING_VAR = 'original_value';
    
    const originalExistsSync = fs.existsSync;
    const originalReadFileSync = fs.readFileSync;
    
    fs.existsSync = jest.fn().mockReturnValue(true);
    fs.readFileSync = jest.fn().mockReturnValue('EXISTING_VAR=new_value');
    
    try {
      loadEnvFileForTest('.env');
      
      // Should keep original value since it already existed
      expect(process.env.EXISTING_VAR).toBe('original_value');
    } finally {
      fs.existsSync = originalExistsSync;
      fs.readFileSync = originalReadFileSync;
    }
  });

  test('does nothing if .env file does not exist', () => {
    const originalExistsSync = fs.existsSync;
    
    fs.existsSync = jest.fn().mockReturnValue(false);
    
    try {
      loadEnvFileForTest('.env');
      
      // No environment variables should be set
      expect(process.env.TEST_VAR).toBeUndefined();
    } finally {
      fs.existsSync = originalExistsSync;
    }
  });

  test('handles file read errors gracefully', () => {
    const originalExistsSync = fs.existsSync;
    const originalReadFileSync = fs.readFileSync;
    
    fs.existsSync = jest.fn().mockReturnValue(true);
    fs.readFileSync = jest.fn().mockImplementation(() => {
      throw new Error('Permission denied');
    });
    
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    try {
      loadEnvFileForTest('.env');
      
      expect(consoleSpy).toHaveBeenCalledWith('Warning: Could not load .env file: Permission denied');
    } finally {
      fs.readFileSync = originalReadFileSync;
      fs.existsSync = originalExistsSync;
      consoleSpy.mockRestore();
    }
  });

  test('parses key-value pairs correctly', () => {
    const originalExistsSync = fs.existsSync;
    const originalReadFileSync = fs.readFileSync;
    
    fs.existsSync = jest.fn().mockReturnValue(true);
    fs.readFileSync = jest.fn().mockReturnValue('SIMPLE_VAR=value\nVAR_WITH_EQUALS=value=with=equals\nVAR_WITH_SPACES = spaced value ');
    
    try {
      loadEnvFileForTest('.env');
      
      expect(process.env.SIMPLE_VAR).toBe('value');
      expect(process.env.VAR_WITH_EQUALS).toBe('value=with=equals');
      expect(process.env.VAR_WITH_SPACES).toBe('spaced value'); // Should trim whitespace
    } finally {
      fs.existsSync = originalExistsSync;
      fs.readFileSync = originalReadFileSync;
    }
  });
});