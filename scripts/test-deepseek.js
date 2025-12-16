/**
 * DeepSeek API Connection Test
 * Run: node scripts/test-deepseek.js
 */

const https = require('https');

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_BASE = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

console.log('\n🔍 AETHERIS - DeepSeek API Test\n');
console.log('=====================================');

// Check if API key is configured
if (!DEEPSEEK_API_KEY) {
  console.error('❌ Error: DEEPSEEK_API_KEY not found in .env.local');
  console.log('\n📝 Please add your API key to .env.local:');
  console.log('   DEEPSEEK_API_KEY=sk-your-actual-key-here\n');
  process.exit(1);
}

// Mask API key for security
const maskedKey = DEEPSEEK_API_KEY.slice(0, 8) + '...' + DEEPSEEK_API_KEY.slice(-4);
console.log(`✅ API Key found: ${maskedKey}`);
console.log(`🌐 API Base: ${DEEPSEEK_API_BASE}`);
console.log(`🤖 Model: ${DEEPSEEK_MODEL}`);
console.log('\n🚀 Testing connection...\n');

// Test API call
const testPrompt = 'Write a single sentence about artificial intelligence.';

const postData = JSON.stringify({
  model: DEEPSEEK_MODEL,
  messages: [
    { role: 'user', content: testPrompt }
  ],
  stream: false,
  max_tokens: 100,
  temperature: 0.7
});

const url = new URL('/v1/chat/completions', DEEPSEEK_API_BASE);
const options = {
  hostname: url.hostname,
  port: 443,
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log(`📡 Response Status: ${res.statusCode}\n`);

    if (res.statusCode === 200) {
      try {
        const response = JSON.parse(data);
        const message = response.choices[0].message.content;
        
        console.log('✅ API Connection Successful!\n');
        console.log('📝 Test Response:');
        console.log('─'.repeat(50));
        console.log(message);
        console.log('─'.repeat(50));
        console.log(`\n💰 Tokens Used: ${response.usage?.total_tokens || 'N/A'}`);
        console.log(`⏱️  Response Time: ${Date.now() - startTime}ms`);
        console.log('\n🎉 DeepSeek API is ready to use!\n');
      } catch (error) {
        console.error('❌ Failed to parse response:', error.message);
        console.log('Raw response:', data);
      }
    } else {
      console.error('❌ API Error:', res.statusCode);
      console.log('Response:', data);
      
      if (res.statusCode === 401) {
        console.log('\n🔑 Check your API key:');
        console.log('   - Ensure it starts with "sk-"');
        console.log('   - Verify it is valid on https://platform.deepseek.com/');
      } else if (res.statusCode === 429) {
        console.log('\n⏱️  Rate limit exceeded. Please wait and try again.');
      }
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Connection Error:', error.message);
  console.log('\n🌐 Check your internet connection and API endpoint.');
});

const startTime = Date.now();
req.write(postData);
req.end();
