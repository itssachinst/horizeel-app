const https = require('https');

console.log("Fetching your public IP address...");

https.get('https://api.ipify.org', (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log("==================================");
    console.log(`Your public IP address is: ${data}`);
    console.log("==================================");
    console.log("\nUse this IP address in your .env file:");
    console.log(`REACT_APP_API_URL=http://${data}:8000/api`);
    console.log("\nAnd in your port forwarding settings:");
    console.log(`External port 8000 → Internal IP 192.168.29.199, port 8000`);
    console.log(`External port 3000 → Internal IP 192.168.29.199, port 3000`);
  });
}).on('error', (err) => {
  console.error("Error fetching public IP: ", err.message);
}); 