import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connection ready.');
  
  const remoteCmd = `
    echo "=== PM2 LOG FILES ===" &&
    ls -la ~/.pm2/logs/ &&
    echo "=== LAST LOG ENTRIES ===" &&
    tail -n 50 ~/.pm2/logs/* || true
  `;
  
  conn.exec(remoteCmd, (execErr, stream) => {
    if (execErr) {
      console.error('Execution error:', execErr);
      conn.end();
      process.exit(1);
    }
    
    stream.on('close', (code, signal) => {
      console.log(`Remote command exited with code ${code}`);
      conn.end();
      process.exit(0);
    }).on('data', (data) => {
      process.stdout.write(data.toString());
    }).stderr.on('data', (data) => {
      process.stderr.write(data.toString());
    });
  });
}).connect({
  host: '178.105.72.214',
  port: 22,
  username: 'root',
  password: 'kLzERv&^^NBn'
});
