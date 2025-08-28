#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { platform } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Beautiful KEYPER ASCII Art Banner with Gradient Colors
const banner = `
\x1b[96m██╗  ██╗\x1b[94m███████╗\x1b[36m██╗   ██╗\x1b[34m██████╗ \x1b[96m███████╗\x1b[94m██████╗ \x1b[0m
\x1b[96m██║ ██╔╝\x1b[94m██╔════╝\x1b[36m╚██╗ ██╔╝\x1b[34m██╔══██╗\x1b[96m██╔════╝\x1b[94m██╔══██╗\x1b[0m
\x1b[96m█████╔╝ \x1b[94m█████╗  \x1b[36m ╚████╔╝ \x1b[34m██████╔╝\x1b[96m█████╗  \x1b[94m██████╔╝\x1b[0m
\x1b[96m██╔═██╗ \x1b[94m██╔══╝  \x1b[36m  ╚██╔╝  \x1b[34m██╔═══╝ \x1b[96m██╔══╝  \x1b[94m██╔══██╗\x1b[0m
\x1b[96m██║  ██╗\x1b[94m███████╗\x1b[36m   ██║   \x1b[34m██║     \x1b[96m███████╗\x1b[94m██║  ██║\x1b[0m
\x1b[96m╚═╝  ╚═╝\x1b[94m╚══════╝\x1b[36m   ╚═╝   \x1b[34m╚═╝     \x1b[96m╚══════╝\x1b[94m╚═╝  ╚═╝\x1b[0m

\x1b[36m✨ Your Credentials. Your Security. Your Rules.\x1b[0m
\x1b[32m🔒 Store API keys, passwords, secrets & more securely\x1b[0m
\x1b[34m🏷️  Organize with tags, categories & smart search\x1b[0m
\x1b[35m📱 Progressive Web App with mobile support\x1b[0m

\x1b[33m💖 Made with ❤️  by Pink Pixel - Dream it, Pixel it ✨\x1b[0m
`;

console.log(banner);

// Parse command line arguments
const args = process.argv.slice(2);
let customPort = '4173';

// Parse --port flag
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--port' && args[i + 1]) {
    customPort = args[i + 1];
    break;
  }
  if (args[i].startsWith('--port=')) {
    customPort = args[i].split('=')[1];
    break;
  }
}

// Show help if requested
if (args.includes('--help') || args.includes('-h')) {
  console.log('\n\x1b[32m🔐 Keyper - Secure Credential Management\x1b[0m');
  console.log('\n\x1b[36mUsage:\x1b[0m');
  console.log('  keyper [options]');
  console.log('\n\x1b[36mOptions:\x1b[0m');
  console.log('  --port <number>    Specify custom port (default: 4173)');
  console.log('  --help, -h         Show this help message');
  console.log('\n\x1b[36mExamples:\x1b[0m');
  console.log('  keyper                    # Start on default port 4173');
  console.log('  keyper --port 3000        # Start on port 3000');
  console.log('  keyper --port=8080        # Start on port 8080');
  console.log('\n\x1b[35m💖 Made with ❤️ by Pink Pixel ✨\x1b[0m');
  process.exit(0);
}

// Validate port number
if (!/^\d+$/.test(customPort) || parseInt(customPort) < 1 || parseInt(customPort) > 65535) {
  console.log('\x1b[31m❌ Error: Invalid port number\x1b[0m');
  console.log('\x1b[33m💡 Port must be a number between 1 and 65535\x1b[0m');
  console.log('\x1b[36m🔧 Example: keyper --port 3000\x1b[0m');
  process.exit(1);
}

// Find the package root directory
const packageRoot = join(__dirname, '..');

// Check if we're in development or installed globally
const distPath = join(packageRoot, 'dist');
const isBuilt = existsSync(distPath);

if (!isBuilt) {
  console.log('\x1b[31m❌ Error: Built files not found!\x1b[0m');
  console.log('\x1b[33m💡 Keyper needs to be built before running.\x1b[0m');
  console.log('\x1b[36mℹ️  If you\'re developing locally, run: npm run build\x1b[0m');
  console.log('\x1b[35m🔧 For global installation: npm install -g @pinkpixel/keyper\x1b[0m');
  process.exit(1);
}

console.log('\x1b[32m🚀 Starting Keyper Credential Manager...\x1b[0m');
console.log('\x1b[36m📂 Serving from:\x1b[0m', distPath);
if (customPort !== '4173') {
  console.log('\x1b[33m🔌 Using custom port:\x1b[0m', customPort);
}
console.log('\x1b[35m🔐 Self-hosted credential management at your fingertips!\x1b[0m');

// Determine the correct command for cross-platform compatibility
const isWindows = platform() === 'win32';
let vitePreview;

if (isWindows) {
  // On Windows, use shell with properly escaped command string
  const command = `npx vite preview --host 0.0.0.0 --port ${customPort}`;
  vitePreview = spawn(command, {
    cwd: packageRoot,
    stdio: 'pipe',
    shell: true
  });
} else {
  // On Unix systems, use shell: false for better security
  vitePreview = spawn('npx', ['vite', 'preview', '--host', '0.0.0.0', '--port', customPort], {
    cwd: packageRoot,
    stdio: 'pipe',
    shell: false
  });
}

// Track the actual port being used
let actualPort = customPort;
let portDetected = false;

// Capture stdout to detect port changes
vitePreview.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(output);
  
  // Strip ANSI escape codes before regex matching
  const cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, '');
  const portMatch = cleanOutput.match(/localhost:(\d+)/i);
  
  if (portMatch && !portDetected) {
    actualPort = portMatch[1];
    portDetected = true;
    // Show startup info immediately when port is detected
    showStartupInfo();
  }
});

// Forward stderr
vitePreview.stderr.on('data', (data) => {
  process.stderr.write(data);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\x1b[33m🛑 Shutting down Keyper...\x1b[0m');
  console.log('\x1b[35m👋 Thanks for using Keyper! Stay secure! 🔐\x1b[0m');
  vitePreview.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\x1b[33m🛑 Shutting down Keyper...\x1b[0m');
  console.log('\x1b[35m👋 Thanks for using Keyper! Stay secure! 🔐\x1b[0m');
  vitePreview.kill('SIGTERM');
  process.exit(0);
});

vitePreview.on('error', (error) => {
  console.error('\x1b[31m❌ Error starting Keyper server:\x1b[0m', error.message);
  console.log('\x1b[33m💡 Make sure you have Node.js and npm installed\x1b[0m');
  console.log('\x1b[36m🔧 Try running: npm install -g @pinkpixel/keyper\x1b[0m');
  process.exit(1);
});

vitePreview.on('close', (code) => {
  if (code !== 0) {
    console.log(`\x1b[31m❌ Keyper server exited with code ${code}\x1b[0m`);
  } else {
    console.log('\x1b[32m✅ Keyper stopped successfully\x1b[0m');
  }
  process.exit(code);
});

// Function to show startup info
function showStartupInfo() {
  // Small delay to ensure the Vite output is complete
  setTimeout(() => {
    console.log('\n\x1b[32m🎉 Keyper is running successfully!\x1b[0m');
    console.log(`\x1b[36m🌐 Open your browser to:\x1b[0m \x1b[4;1mhttp://localhost:${actualPort}\x1b[0m`);
    console.log('\x1b[35m🔧 Configure your Supabase instance in Settings\x1b[0m');
    console.log('\x1b[33m⚡ Press Ctrl+C to stop the server\x1b[0m');
    console.log('\x1b[32m📖 Need help? Check the README.md for setup instructions\x1b[0m\n');
  }, 500);
}

// Fallback in case port detection fails
setTimeout(() => {
  if (!portDetected) {
    showStartupInfo();
  }
}, 3000);
