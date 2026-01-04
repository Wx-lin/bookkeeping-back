// test-stream.js
const fetch = require('node-fetch'); // You might need to install this if not available, or use native fetch in Node 18+

const BASE_URL = 'http://localhost:3000';
const EMAIL = 'test@example.com'; // Change to your test user
const PASSWORD = 'password123'; // Change to your test password

async function main() {
  try {
    // 1. Login to get token
    console.log('Logging in...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
    });

    if (!loginRes.ok) {
      throw new Error(`Login failed: ${loginRes.statusText}`);
    }

    const loginData = await loginRes.json();
    console.log('Login response:', loginData); // Debug print

    // Check if the structure is { data: { token: ... } } or just { token: ... }
    const token =
      loginData.token || (loginData.data && loginData.data.token);

    if (!token) {
      throw new Error('No token in login response');
    }
    console.log('Login successful, token:', token.substring(0, 20) + '...');

    // 2. Start Chat Stream
    console.log('\nStarting Chat Stream...');
    const response = await fetch(`${BASE_URL}/ai/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        token: token, // Note: JwtStrategy expects 'token' header, not 'Authorization: Bearer'
      },
      body: JSON.stringify({
        text: '今天中午吃黄焖鸡花了28元',
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Stream request failed: ${response.status} ${response.statusText}`,
      );
    }

    // 3. Read Stream
    const reader = response.body;
    // Node.js fetch body is a stream
    reader.on('data', (chunk) => {
      const text = chunk.toString();
      // SSE format is "data: ...\n\n"
      // We'll just print raw chunks for visibility
      console.log('Received Chunk:', text);
    });

    reader.on('end', () => {
      console.log('\nStream ended.');
    });

    reader.on('error', (err) => {
      console.error('Stream error:', err);
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Check if we need to register first (helper)
async function registerIfNeeded() {
  // Try login first
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });

  if (loginRes.ok) return;

  // If login fails, try register
  console.log('User not found, registering...');
  const regRes = await fetch(`${BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: EMAIL,
      password: PASSWORD,
      name: 'Test User',
    }),
  });

  if (!regRes.ok) {
    const text = await regRes.text();
    // If it says conflict, it means user exists but maybe password wrong?
    // But for this simple script, we assume clean state or correct creds.
    console.log('Register response:', text);
  } else {
    console.log('Registered successfully.');
  }
}

(async () => {
  await registerIfNeeded();
  await main();
})();
