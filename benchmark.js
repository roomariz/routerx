#!/usr/bin/env node
/**
 * RouterX Streaming Performance Benchmark
 * 
 * This script measures the actual performance of streaming responses
 * with different models and scenarios to validate the streaming implementation.
 */

import fs from 'fs';
import ApiClient from './src/api/api.js';
import ConfigManager from './src/config/config.js';
import Utils from './src/utils/index.js';

// Simple environment loading without external dependencies
function loadEnv() {
  try {
    const envContent = fs.readFileSync('.env', 'utf8');
    const lines = envContent.split('\n');
    
    for (const line of lines) {
      if (line.trim() && !line.startsWith('#')) {
        const [key, ...value] = line.split('=');
        const trimmedKey = key.trim();
        const trimmedValue = value.join('=').trim();
        
        if (trimmedKey && !process.env[trimmedKey]) {
          process.env[trimmedKey] = trimmedValue;
        }
      }
    }
  } catch (error) {
    // .env file doesn't exist, that's okay
  }
}

// Load environment variables
loadEnv();

// Initialize configuration
const configManager = new ConfigManager();
const config = configManager.loadConfig();

// Initialize API client with config
const apiClient = new ApiClient(config);

// Get API key from environment
const apiKey = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
if (!apiKey) {
  console.error('❌ API key not found! Please set OPENROUTER_API_KEY or OPENAI_API_KEY environment variable.');
  process.exit(1);
}

// Default models to test
const TEST_MODELS = [
  'openai/gpt-4o-mini',
  'microsoft/wizardlm-2-8x22b',
  'google/gemini-pro',
  'anthropic/claude-3-haiku'
];

console.log('🚀 RouterX Streaming Performance Benchmark\n');

async function measureStreamPerformance(model, prompt, description) {
  console.log(`⏱️  Testing ${description} (${model}):`);
  console.log(`   Prompt: "${prompt}"`);
  
  const startTime = Date.now();
  let firstTokenTime = null;
  let tokenCount = 0;
  let fullResponse = '';
  
  try {
    const response = await apiClient.makeChatCompletion(apiKey, model, prompt, config.defaultBaseUrl);
    
    return new Promise((resolve, reject) => {
      const requestStartTime = Date.now();
      
      response.data.on('data', (chunk) => {
        if (!firstTokenTime) {
          firstTokenTime = Date.now();
        }
        
        // Process SSE data
        const lines = chunk.toString().split('\n').filter(Boolean);
        for (const line of lines) {
          if (line.trim() === 'data: [DONE]') {
            const totalTime = Date.now() - startTime;
            const timeToFirstToken = firstTokenTime - startTime;
            const netProcessingTime = totalTime - timeToFirstToken;
            
            console.log(`   ✅ Complete!`);
            console.log(`   🕐 Total time: ${totalTime}ms`);
            console.log(`   ⏰ Time to first token: ${timeToFirstToken}ms`);
            console.log(`   🚀 Tokens processed: ${tokenCount}`);
            console.log(`   📊 Tokens/second: ${(tokenCount / (netProcessingTime / 1000)).toFixed(2)}`);
            console.log(`   💾 Response length: ${fullResponse.length} chars\n`);
            
            resolve({
              totalTime,
              timeToFirstToken,
              tokenCount,
              tokensPerSecond: tokenCount / (netProcessingTime / 1000),
              responseLength: fullResponse.length
            });
            return;
          }
          
          if (line.startsWith('data:')) {
            try {
              const json = JSON.parse(line.replace('data: ', ''));
              const token = json.choices?.[0]?.delta?.content;
              if (token) {
                tokenCount++;
                fullResponse += token;
              }
            } catch (e) {
              // Ignore JSON parsing errors
            }
          }
        }
      });
      
      response.data.on('error', (err) => {
        reject(err);
      });
      
      // Set timeout to prevent hanging
      setTimeout(() => {
        reject(new Error('Request timed out after 30 seconds'));
      }, 30000);
    });
  } catch (err) {
    console.error(`   ❌ Error: ${err.message}\n`);
    return null;
  }
}

async function runBenchmark() {
  const results = [];
  
  // Test with different models and scenarios
  const testCases = [
    {
      model: 'openai/gpt-4o-mini',
      prompt: 'Say "Hello, this is a performance test."',
      description: 'Quick greeting test'
    },
    {
      model: 'openai/gpt-4o-mini',
      prompt: 'Write a short poem about streaming APIs.',
      description: 'Short creative test'
    },
    {
      model: 'openai/gpt-4o-mini',
      prompt: 'Explain quantum computing in 3 paragraphs.',
      description: 'Medium explanation test'
    },
    {
      model: 'microsoft/wizardlm-2-8x22b',
      prompt: 'Write a detailed explanation of how streaming works in web APIs.',
      description: 'Longer technical response'
    }
  ];

  for (const testCase of testCases) {
    const result = await measureStreamPerformance(
      testCase.model,
      testCase.prompt,
      testCase.description
    );
    
    if (result) {
      results.push({
        ...testCase,
        ...result
      });
    }
    
    // Small delay between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Calculate and display summary
  if (results.length > 0) {
    console.log('📊 PERFORMANCE SUMMARY');
    console.log('=====================');
    
    let totalTime = 0;
    let totalFirstToken = 0;
    let totalTokens = 0;
    let totalTPS = 0;
    
    for (const result of results) {
      totalTime += result.totalTime;
      totalFirstToken += result.timeToFirstToken;
      totalTokens += result.tokenCount;
      totalTPS += result.tokensPerSecond;
    }
    
    console.log(`Average Total Time: ${(totalTime / results.length).toFixed(2)}ms`);
    console.log(`Average Time to First Token: ${(totalFirstToken / results.length).toFixed(2)}ms`);
    console.log(`Average Tokens: ${(totalTokens / results.length).toFixed(2)}`);
    console.log(`Average Tokens/Second: ${(totalTPS / results.length).toFixed(2)}`);
    console.log(`Total Tests: ${results.length}\n`);
    
    // Performance validation
    console.log('✅ PERFORMANCE VALIDATION');
    console.log('========================');
    
    const avgFirstToken = totalFirstToken / results.length;
    const avgTPS = totalTPS / results.length;
    
    console.log(`Time to first token: ${avgFirstToken < 2000 ? '✅ Good' : '⚠️  Considerable'} (${avgFirstToken.toFixed(2)}ms)`);
    console.log(`Tokens per second: ${avgTPS > 1 ? '✅ Good' : '⚠️  Slow'} (${avgTPS.toFixed(2)}/s)`);
    console.log(`Overall: ${avgFirstToken < 2000 && avgTPS > 1 ? '✅ Streaming performance within expectations' : '⚠️  Consider reviewing streaming implementation'}`);
  } else {
    console.log('❌ No successful tests completed. Check your API key and network connection.');
  }
}

// Run the benchmark
runBenchmark().catch(err => {
  console.error('❌ Benchmark failed:', err);
  process.exit(1);
});