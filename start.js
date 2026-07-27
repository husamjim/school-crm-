import { spawn } from 'child_process';

console.log('🚀 Starting GMIS CRM full stack (Server + Vite Frontend)...');

const serverProc = spawn('node', ['server/index.js'], { stdio: 'inherit', shell: true });
const viteProc = spawn('npx', ['vite'], { stdio: 'inherit', shell: true });

const cleanup = () => {
  try { serverProc.kill(); } catch (e) {}
  try { viteProc.kill(); } catch (e) {}
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
