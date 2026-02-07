import { spawn } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { getKeyrackDaemonSocketPath } from '../../../infra/getKeyrackDaemonSocketPath';
import { createKeyrackDaemonServer } from '../infra/createKeyrackDaemonServer';

/**
 * .what = start the keyrack daemon as a background process
 * .why = daemon persists beyond the parent process lifetime
 *
 * .note = uses child_process.spawn with detached + unref
 * .note = writes pid file for lifecycle management
 * .note = this function is called by the daemon subprocess itself
 */
export const startKeyrackDaemon = (): void => {
  const socketPath = getKeyrackDaemonSocketPath();

  // start the server
  const { server } = createKeyrackDaemonServer({ socketPath });

  // write pid file for management
  const pidPath = socketPath.replace(/\.sock$/, '.pid');
  writeFileSync(pidPath, String(process.pid));

  // handle shutdown signals
  const shutdown = () => {
    console.log('[keyrack-daemon] shutdown signal received');
    server.close();
    try {
      if (existsSync(socketPath)) {
        require('node:fs').unlinkSync(socketPath);
      }
      if (existsSync(pidPath)) {
        require('node:fs').unlinkSync(pidPath);
      }
    } catch {
      // ignore cleanup errors
    }
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  console.log(`[keyrack-daemon] started with pid ${process.pid}`);
};

/**
 * .what = spawn the keyrack daemon as a detached background process
 * .why = parent process can exit while daemon continues to run
 *
 * .note = spawns a new node process that runs startKeyrackDaemon
 */
export const spawnKeyrackDaemonBackground = (): void => {
  const daemonScript = `
    const { startKeyrackDaemon } = require('${__filename.replace(/\.ts$/, '.js')}');
    startKeyrackDaemon();
  `;

  // spawn a detached node process
  const child = spawn(process.execPath, ['-e', daemonScript], {
    detached: true,
    stdio: 'ignore',
  });

  // unref so parent can exit
  child.unref();

  console.log(`[keyrack-daemon] spawned background daemon (pid: ${child.pid})`);
};
