const { spawn } = require('child_process');

const cf = spawn('cloudflared.exe', ['tunnel', '--url', 'http://localhost:3010']);

cf.stdout.on('data', (data) => console.log(`stdout: ${data}`));
cf.stderr.on('data', (data) => console.error(`stderr: ${data}`));

cf.on('close', (code) => console.log(`child process exited with code ${code}`));
