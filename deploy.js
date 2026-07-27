import { Client } from 'ssh2';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// 1. Package files
console.log('Packaging files using PowerShell Compress-Archive...');
try {
  execSync(`powershell -Command "if (Test-Path deploy_temp) { Remove-Item -Recurse -Force deploy_temp }; New-Item -ItemType Directory -Path deploy_temp | Out-Null; Copy-Item -Recurse dist deploy_temp/dist; New-Item -ItemType Directory -Path deploy_temp/server | Out-Null; Get-ChildItem server -File | Where-Object { $_.Name -notin @('database.sqlite', 'config.json', '.env', 'package-lock.json') } | Copy-Item -Destination deploy_temp/server/; Get-ChildItem -File | Where-Object { $_.Name -in @('package.json', 'docker-compose.yml', 'Dockerfile') } | Copy-Item -Destination deploy_temp/; if (Test-Path gmis_deploy.zip) { Remove-Item gmis_deploy.zip }; Compress-Archive -Path deploy_temp/* -DestinationPath gmis_deploy.zip; Remove-Item -Recurse -Force deploy_temp"`);
  console.log('Successfully created gmis_deploy.zip');
} catch (err) {
  console.error('Error packaging files:', err);
  process.exit(1);
}

// 2. Connect and Upload
const conn = new Client();
conn.on('ready', () => {
  console.log('SSH connection ready. Starting SFTP...');
  conn.sftp((err, sftp) => {
    if (err) {
      console.error('SFTP error:', err);
      conn.end();
      process.exit(1);
    }
    
    const localFile = path.resolve('gmis_deploy.zip');
    const remoteFile = '/var/www/gmis/gmis_deploy.zip';
    
    console.log(`Uploading ${localFile} to ${remoteFile}...`);
    sftp.fastPut(localFile, remoteFile, (uploadErr) => {
      if (uploadErr) {
        console.error('SFTP upload error:', uploadErr);
        conn.end();
        process.exit(1);
      }
      console.log('Upload complete. Unzipping and deploying on remote server...');
      
      // SSH exec to unzip, migrate database/configs and recreate PM2 pointing to /var/www/gmis/server/index.js
      const remoteCmd = `
        which unzip || (apt-get update -y && apt-get install -y unzip) && \
        cd /var/www/gmis && \
        unzip -o gmis_deploy.zip && \
        rm -f gmis_deploy.zip && \
        
        # 1. Create server directory if not exists
        mkdir -p /var/www/gmis/server && \
        
        # 2. Copy SQLite DB, config and env from old backend directory to new server directory (if they exist and don't exist in destination)
        [ -f /var/www/gmis/backend/database.sqlite ] && [ ! -f /var/www/gmis/server/database.sqlite ] && cp /var/www/gmis/backend/database.sqlite /var/www/gmis/server/database.sqlite || true
        [ -f /var/www/gmis/backend/config.json ] && [ ! -f /var/www/gmis/server/config.json ] && cp /var/www/gmis/backend/config.json /var/www/gmis/server/config.json || true
        [ -f /var/www/gmis/backend/.env ] && [ ! -f /var/www/gmis/server/.env ] && cp /var/www/gmis/backend/.env /var/www/gmis/server/.env || true
        
        # 3. Install production dependencies
        cd /var/www/gmis/server && \
        npm install --production && \
        
        # 4. Recreate PM2 process for gmis_backend using the new server location
        pm2 delete gmis_backend || true
        pm2 delete 0 || true
        pm2 start index.js --name gmis_backend && \
        pm2 save
      `;
      
      conn.exec(remoteCmd, (execErr, stream) => {
        if (execErr) {
          console.error('Execution error:', execErr);
          conn.end();
          process.exit(1);
        }
        
        stream.on('close', (code, signal) => {
          console.log(`Remote command exited with code ${code}`);
          // Clean up local zip
          if (fs.existsSync(localFile)) {
            fs.unlinkSync(localFile);
          }
          console.log('Local zip cleaned up. Deployment finished successfully!');
          conn.end();
          process.exit(0);
        }).on('data', (data) => {
          process.stdout.write(data.toString());
        }).stderr.on('data', (data) => {
          process.stderr.write(data.toString());
        });
      });
    });
  });
}).connect({
  host: '178.105.72.214',
  port: 22,
  username: 'root',
  password: 'kLzERv&^^NBn'
});
