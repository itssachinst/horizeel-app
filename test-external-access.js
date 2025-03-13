const https = require('https');
const http = require('http');

console.log('Testing external access to your Horizeel application...');
console.log('This script will check if your port forwarding is properly configured.');
console.log('---------------------------------------------------------------');

// Step 1: Get the public IP address
const getPublicIp = () => {
  return new Promise((resolve, reject) => {
    https.get('https://api.ipify.org', (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        resolve(data.toString().trim());
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
};

// Step 2: Test if the API is accessible
const testApiAccess = (publicIp) => {
  return new Promise((resolve, reject) => {
    const url = `http://${publicIp}:8000/api/status`;
    
    console.log(`Testing API connection at: ${url}`);
    
    const req = http.get(url, (response) => {
      let data = '';
      
      // A successful response (even if it's a 404 or 500) means the port is reachable
      console.log(`Response status code: ${response.statusCode}`);
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        resolve({
          success: true,
          statusCode: response.statusCode,
          data: data.toString()
        });
      });
    });
    
    req.on('error', (err) => {
      resolve({
        success: false,
        error: err.message
      });
    });
    
    // Set a timeout of 5 seconds
    req.setTimeout(5000, () => {
      req.abort();
      resolve({
        success: false,
        error: 'Request timed out after 5 seconds'
      });
    });
  });
};

// Step 3: Test if the Frontend is accessible
const testFrontendAccess = (publicIp) => {
  return new Promise((resolve, reject) => {
    const url = `http://${publicIp}:3000`;
    
    console.log(`Testing Frontend connection at: ${url}`);
    
    const req = http.get(url, (response) => {
      // A successful response (even if it's a 404 or 500) means the port is reachable
      console.log(`Response status code: ${response.statusCode}`);
      
      // We don't need the actual data, just checking if it's reachable
      response.resume();
      response.on('end', () => {
        resolve({
          success: true,
          statusCode: response.statusCode
        });
      });
    });
    
    req.on('error', (err) => {
      resolve({
        success: false,
        error: err.message
      });
    });
    
    // Set a timeout of 5 seconds
    req.setTimeout(5000, () => {
      req.abort();
      resolve({
        success: false,
        error: 'Request timed out after 5 seconds'
      });
    });
  });
};

const runTests = async () => {
  try {
    // Get public IP
    const publicIp = await getPublicIp();
    console.log(`Your public IP address is: ${publicIp}`);
    console.log('---------------------------------------------------------------');
    
    // Test API access
    console.log('Testing Backend API access...');
    const apiResult = await testApiAccess(publicIp);
    
    if (apiResult.success) {
      console.log('✓ SUCCESS: Backend API is accessible from the internet');
      console.log(`Status code: ${apiResult.statusCode}`);
      if (apiResult.data) {
        console.log(`Response: ${apiResult.data.substring(0, 100)}${apiResult.data.length > 100 ? '...' : ''}`);
      }
    } else {
      console.log('✗ FAILED: Backend API is not accessible from the internet');
      console.log(`Error: ${apiResult.error}`);
      console.log('');
      console.log('Troubleshooting steps:');
      console.log('1. Make sure your FastAPI backend is running on port 8000');
      console.log('2. Check that port 8000 is allowed in Windows Firewall');
      console.log('3. Verify port forwarding is set up correctly on your router');
      console.log('4. Some ISPs block incoming connections on common ports');
    }
    
    console.log('---------------------------------------------------------------');
    
    // Test Frontend access
    console.log('Testing Frontend access...');
    const frontendResult = await testFrontendAccess(publicIp);
    
    if (frontendResult.success) {
      console.log('✓ SUCCESS: Frontend is accessible from the internet');
      console.log(`Status code: ${frontendResult.statusCode}`);
    } else {
      console.log('✗ FAILED: Frontend is not accessible from the internet');
      console.log(`Error: ${frontendResult.error}`);
      console.log('');
      console.log('Troubleshooting steps:');
      console.log('1. Make sure your React app is running on port 3000');
      console.log('2. Check that port 3000 is allowed in Windows Firewall');
      console.log('3. Verify port forwarding is set up correctly on your router');
    }
    
    console.log('---------------------------------------------------------------');
    console.log('Test Summary:');
    console.log(`Backend API: ${apiResult.success ? 'ACCESSIBLE ✓' : 'NOT ACCESSIBLE ✗'}`);
    console.log(`Frontend: ${frontendResult.success ? 'ACCESSIBLE ✓' : 'NOT ACCESSIBLE ✗'}`);
    
    if (apiResult.success && frontendResult.success) {
      console.log('');
      console.log('Congratulations! Your Horizeel app is accessible from the internet.');
      console.log(`Anyone can access your app at: http://${publicIp}:3000`);
    } else {
      console.log('');
      console.log('There were issues with external access to your application.');
      console.log('Review the troubleshooting steps above for each failed component.');
    }
    
  } catch (error) {
    console.error('An error occurred while testing external access:', error);
  }
};

// Run all tests
runTests(); 