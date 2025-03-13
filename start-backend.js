/**
 * Script to start the backend server
 * 
 * This script will start the FastAPI backend in a child process
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const backendDir = path.resolve(__dirname, '..', 'backend');
const pythonCmd = 'python';
const logFile = path.join(__dirname, 'backend-logs.txt');

// Create log file stream
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

console.log(`Starting backend server in ${backendDir}`);
console.log(`Logs will be written to ${logFile}`);

// Start the backend server
const backend = spawn(pythonCmd, [
  '-m', 'uvicorn', 
  'app.main:app', 
  '--reload', 
  '--host', '0.0.0.0', 
  '--port', '8000'
], {
  cwd: backendDir,
  shell: true,
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: false
});

// Handle stdout
backend.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(`[BACKEND] ${output}`);
  logStream.write(`[STDOUT] ${output}\n`);
});

// Handle stderr
backend.stderr.on('data', (data) => {
  const output = data.toString();
  console.error(`[BACKEND ERROR] ${output}`);
  logStream.write(`[STDERR] ${output}\n`);
});

// Handle process exit
backend.on('close', (code) => {
  console.log(`Backend process exited with code ${code}`);
  logStream.write(`[EXIT] Process exited with code ${code}\n`);
  logStream.end();
});

// Handle script exit
process.on('SIGINT', () => {
  console.log('Stopping backend server...');
  backend.kill('SIGINT');
  process.exit();
});

console.log('Backend server started successfully.');
console.log('Press Ctrl+C to stop the server.');