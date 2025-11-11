// src/config.js
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Get the default configuration
 * @returns {Object} Default configuration object
 */
export function getDefaultConfig() {
  return {
    defaultModel: "openai/gpt-4o-mini",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    defaultSavePath: "./outputs",
    maxRetries: 3,
    timeout: 30000
  };
}

/**
 * Load configuration from file or return defaults
 * @returns {Object} Loaded configuration object
 */
export function loadConfig() {
  // Try to load config from multiple locations in order of preference:
  // 1. Current working directory: ./config.json
  // 2. User's home directory: ~/routerx-config.json
  // 3. Default values

  const configPaths = [
    path.join(process.cwd(), 'config.json'),
    path.join(os.homedir(), 'routerx-config.json')
  ];

  for (const configPath of configPaths) {
    if (fs.existsSync(configPath)) {
      try {
        const configFile = fs.readFileSync(configPath, 'utf8');
        return { ...getDefaultConfig(), ...JSON.parse(configFile) };
      } catch (error) {
        console.warn(`⚠️ Warning: Could not parse config file ${configPath}:`, error.message);
      }
    }
  }

  // Return default config if no config file is found
  return getDefaultConfig();
}