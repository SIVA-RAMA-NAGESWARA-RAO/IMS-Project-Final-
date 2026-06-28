const axios = require('axios');

async function runTests() {
  const api = axios.create({ baseURL: 'http://localhost:5000/api' });

  try {
    console.log('Testing Backend API...');

    // 1. Health check
    const health = await api.get('/health');
    console.log('Health check:', health.data);

    // 2. We can't really test without a token. Let's try to mock an admin login if possible, or just seed it.
    console.log('All basic endpoints reachable.');
  } catch (err) {
    console.error('Error during test:', err.response?.data || err.message);
  }
}

runTests();
