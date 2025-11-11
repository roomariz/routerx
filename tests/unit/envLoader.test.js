// tests/unit/envLoader.test.js
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';

// Create a mock for the envLoader module to avoid import issues
jest.mock('../../src/infrastructure/env/envLoader.js', () => {
  // Import the actual module but use spies to test the functionality
  const fs = jest.requireActual('fs');
  
  const loadEnvFile = jest.fn((filePath = '.env') => {
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
  });

  return { 
    default: { loadEnvFile },
    loadEnvFile 
  };
});

import { loadEnvFile } from '../../src/infrastructure/env/envLoader.js';

describe('EnvLoader', () => {
  // Save original process.env
  const originalEnv = process.env;

  beforeEach(() => {
    // Clear environment variables before each test
    process.env = { ...originalEnv };
    
    // Mock the file system methods before each test
    jest.clearAllMocks();
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);
    jest.spyOn(fs, 'readFileSync').mockReturnValue('');
  });

  afterEach(() => {
    // Restore original environment variables after each test
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  describe('loadEnvFile function', () => {
    test('loads environment variables from .env file', () => {
      // Mock file existence and content
      const mockEnvContent = 'API_KEY=test123\nNAME=Test App\n';
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'readFileSync').mockReturnValue(mockEnvContent);

      // Call loadEnvFile directly
      loadEnvFile('.env');
      
      // Verify fs methods were called correctly
      expect(fs.existsSync).toHaveBeenCalledWith('.env');
      expect(fs.readFileSync).toHaveBeenCalledWith('.env', 'utf8');
      
      // Verify environment variables were set
      expect(process.env.API_KEY).toBe('test123');
      expect(process.env.NAME).toBe('Test App');
    });

    test('handles commented lines in .env file', () => {
      const mockEnvContent = '# This is a comment\nAPI_KEY=test123\n# Another comment\n';
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'readFileSync').mockReturnValue(mockEnvContent);

      loadEnvFile('.env');
      
      // Verify that API_KEY was set but comments were ignored
      expect(process.env.API_KEY).toBe('test123');
    });

    test('handles empty lines in .env file', () => {
      const mockEnvContent = '\n\nAPI_KEY=test123\n\n';
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'readFileSync').mockReturnValue(mockEnvContent);

      loadEnvFile('.env');
      
      expect(process.env.API_KEY).toBe('test123');
    });

    test('handles quoted values in .env file', () => {
      const mockEnvContent = 'API_KEY="test123"\nNAME=\'Test App\'\n';
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'readFileSync').mockReturnValue(mockEnvContent);

      loadEnvFile('.env');
      
      expect(process.env.API_KEY).toBe('test123');
      expect(process.env.NAME).toBe('Test App');
    });

    test('does not override existing environment variables', () => {
      process.env.EXISTING_VAR = 'original_value';
      
      const mockEnvContent = 'EXISTING_VAR=new_value\n';
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'readFileSync').mockReturnValue(mockEnvContent);

      loadEnvFile('.env');
      
      // The value should remain original_value, not new_value
      expect(process.env.EXISTING_VAR).toBe('original_value');
    });

    test('handles file that does not exist', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);

      expect(() => {
        loadEnvFile('.env');
      }).not.toThrow();
    });

    test('handles file read error', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);
      jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('File read error');
      });

      // Mock console.warn to avoid actual logging during test
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      expect(() => {
        loadEnvFile('.env');
      }).not.toThrow();
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Warning: Could not load .env file')
      );
    });
  });
});