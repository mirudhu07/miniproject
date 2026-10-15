#!/usr/bin/env node

/**
 * SmartPark AI - System & Service Diagnostic Tool
 * Non-destructive preflight and liveness verifier
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const net = require('net');
const { execSync } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function logHeader(text) {
  console.log(`\n${COLORS.bold}${COLORS.cyan}====================================================${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.cyan}  ${text}${COLORS.reset}`);
  console.log(`${COLORS.bold}${COLORS.cyan}====================================================${COLORS.reset}\n`);
}

function checkItem(title, status, detail, isWarning = false) {
  const icon = status
    ? `${COLORS.green}✔ PASS${COLORS.reset}`
    : isWarning
    ? `${COLORS.yellow}⚠ WARN${COLORS.reset}`
    : `${COLORS.red}✖ FAIL${COLORS.reset}`;
  console.log(`[${icon}] ${COLORS.bold}${title}${COLORS.reset}: ${detail}`);
  return status;
}

async function checkPortListening(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      resolve(false);
    });
    socket.connect(port, host);
  });
}

async function httpGet(url, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
    req.on('error', () => {
      resolve(null);
    });
  });
}

async function runDiagnostics() {
  logHeader('SmartPark AI - Comprehensive System Diagnostics');

  let passed = true;

  // 1. Runtime Versions
  console.log(`${COLORS.bold}--- 1. Runtime & CLI Environment ---${COLORS.reset}`);
  const nodeVer = process.version;
  checkItem('Node.js Version', parseInt(nodeVer.slice(1)) >= 18, `${nodeVer} (Requires >= 18.0.0)`);

  let npmVer = 'Not found';
  try {
    npmVer = execSync('npm -v', { encoding: 'utf8' }).trim();
    checkItem('npm Version', true, `v${npmVer}`);
  } catch (e) {
    checkItem('npm Version', false, 'npm command failed');
    passed = false;
  }

  let pyVer = 'Not found';
  try {
    pyVer = execSync('python3 --version', { encoding: 'utf8' }).trim();
    checkItem('Python 3 Version', true, pyVer);
  } catch (e) {
    checkItem('Python 3 Version', false, 'Python 3 not detected');
  }

  // 2. Configuration Files
  console.log(`\n${COLORS.bold}--- 2. Configuration Files ---${COLORS.reset}`);
  const envFiles = [
    { name: 'Root .env.example', path: path.join(ROOT_DIR, '.env.example') },
    { name: 'Backend .env', path: path.join(ROOT_DIR, 'backend', '.env') },
    { name: 'ML Service .env', path: path.join(ROOT_DIR, 'ml-service', '.env') },
    { name: 'Admin Dashboard .env', path: path.join(ROOT_DIR, 'admin-dashboard', '.env') },
    { name: 'Mobile App .env', path: path.join(ROOT_DIR, 'mobile', '.env') },
  ];

  for (const env of envFiles) {
    const exists = fs.existsSync(env.path);
    checkItem(env.name, exists, exists ? 'Found' : 'Missing');
    if (!exists) passed = false;
  }

  // 3. Official Logo Asset
  console.log(`\n${COLORS.bold}--- 3. Brand Assets ---${COLORS.reset}`);
  const logoPath = path.join(ROOT_DIR, 'mobile', 'assets', 'images', 'smartpark-logo.png');
  const logoExists = fs.existsSync(logoPath);
  checkItem('Official SmartPark Logo', logoExists, logoExists ? `${fs.statSync(logoPath).size} bytes verified` : 'Missing at mobile/assets/images/smartpark-logo.png');

  // 4. Dependencies Verification
  console.log(`\n${COLORS.bold}--- 4. Dependencies & Modules ---${COLORS.reset}`);
  const modules = [
    { name: 'Backend Node Modules', path: path.join(ROOT_DIR, 'backend', 'node_modules', 'express') },
    { name: 'Dashboard Node Modules', path: path.join(ROOT_DIR, 'admin-dashboard', 'node_modules', 'vite') },
    { name: 'Mobile Node Modules', path: path.join(ROOT_DIR, 'mobile', 'node_modules', 'expo') },
    { name: 'Shared Types Build', path: path.join(ROOT_DIR, 'shared', 'dist', 'index.js') },
  ];

  for (const m of modules) {
    const exists = fs.existsSync(m.path);
    checkItem(m.name, exists, exists ? 'Installed and verified' : 'Missing - run npm install in folder');
    if (!exists) passed = false;
  }

  // 5. Port Allocations
  console.log(`\n${COLORS.bold}--- 5. Service Ports Status ---${COLORS.reset}`);
  const ports = [
    { name: 'Backend API', port: 5001 },
    { name: 'ML Service', port: 8000 },
    { name: 'Admin Dashboard', port: 3000 },
    { name: 'Metro Bundler', port: 8081 },
  ];

  for (const p of ports) {
    const active = await checkPortListening(p.port);
    console.log(`  * ${p.name} (Port ${p.port}): ${active ? `${COLORS.green}Active (Listening)${COLORS.reset}` : `${COLORS.yellow}Idle (Not running)${COLORS.reset}`}`);
  }

  // 6. Live Service Health Checks (if running)
  console.log(`\n${COLORS.bold}--- 6. Live Service Health Inspections ---${COLORS.reset}`);
  
  // Backend Health
  const backendHealth = await httpGet('http://127.0.0.1:5001/health');
  if (backendHealth && backendHealth.status === 200) {
    checkItem('Backend /health', true, `Status: ${backendHealth.body.status}, Service: ${backendHealth.body.service}`);
    const backendReady = await httpGet('http://127.0.0.1:5001/ready');
    if (backendReady && backendReady.status === 200) {
      checkItem('Backend /ready', true, `Database: ${backendReady.body.database?.status || 'ready'}, Mode: ${backendReady.body.database?.mode || 'live'}`);
    } else {
      checkItem('Backend /ready', false, 'Backend returned non-ready status', true);
    }
  } else {
    checkItem('Backend Service', false, 'Backend process is not running on port 5001', true);
  }

  // ML Service Health
  const mlHealth = await httpGet('http://127.0.0.1:8000/health');
  if (mlHealth && mlHealth.status === 200) {
    checkItem('ML Service /health', true, `Status: ${mlHealth.body.status}, Version: ${mlHealth.body.version}`);
    const mlReady = await httpGet('http://127.0.0.1:8000/ready');
    if (mlReady && mlReady.status === 200) {
      checkItem('ML Service /ready', true, `Model loaded: ${mlReady.body.model_loaded}, Model: ${mlReady.body.model_type}`);
    } else {
      checkItem('ML Service /ready', false, 'ML service returned non-ready status', true);
    }
  } else {
    checkItem('ML Service', false, 'ML Service process is not running on port 8000', true);
  }

  // Admin Dashboard Response
  const dashRes = await httpGet('http://127.0.0.1:3000');
  if (dashRes && (dashRes.status === 200 || dashRes.status === 304)) {
    checkItem('Admin Dashboard UI', true, 'HTTP 200 OK - Serving Vite Application');
  } else {
    checkItem('Admin Dashboard UI', false, 'Admin Dashboard process is not running on port 3000', true);
  }

  console.log(`\n${COLORS.bold}${COLORS.cyan}----------------------------------------------------${COLORS.reset}`);
  console.log(`${COLORS.bold}Summary:${COLORS.reset} Diagnostics completed non-destructively.`);
  console.log(`${COLORS.bold}${COLORS.cyan}----------------------------------------------------${COLORS.reset}\n`);
}

runDiagnostics().catch(console.error);
