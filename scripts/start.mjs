import { cp } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import nextEnv from '@next/env';
nextEnv.loadEnvConfig(process.cwd());
// Next standalone n'embarque pas automatiquement les fichiers publics et CSS compilés.
await cp('public', '.next/standalone/public', { recursive: true });
await cp('.next/static', '.next/standalone/.next/static', { recursive: true });
const args = process.argv.slice(2);
const index = args.indexOf('--port');
const port = index >= 0 ? args[index + 1] : process.env.PORT || '3000';
if (!/^\d+$/.test(port)) throw new Error('Port invalide.');
const child = spawn(process.execPath, ['.next/standalone/server.js'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: port,
    HOSTNAME: process.env.HOSTNAME === '0.0.0.0' ? '0.0.0.0' : '127.0.0.1',
    NODE_ENV: 'production',
  },
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', (code) => {
  process.exitCode = code || 0;
});
