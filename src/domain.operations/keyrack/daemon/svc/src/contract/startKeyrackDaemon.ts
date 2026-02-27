import { getKeyrackDaemonSocketPath } from '@src/domain.operations/keyrack/daemon/infra/getKeyrackDaemonSocketPath';
import { createKeyrackDaemonServer } from '@src/domain.operations/keyrack/daemon/svc/src/infra/createKeyrackDaemonServer';

import { spawn } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';

/**
 * .what = start the keyrack daemon as a background process
 * .why = daemon persists beyond the parent process lifetime
 *
 * .note = uses child_process.spawn with detached + unref
 * .note = writes pid file for lifecycle management
 * .note = this function is called by the daemon subprocess itself
 */
export const startKeyrackDaemon = (input?: { socketPath?: string }): void => {
  const socketPath = input?.socketPath ?? getKeyrackDaemonSocketPath();

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
 * .note = detects ts vs js environment and uses tsx loader for typescript
 */
export const spawnKeyrackDaemonBackground = (input?: {
  socketPath?: string;
}): void => {
  // serialize socketPath to pass to subprocess
  const socketPathArg = input?.socketPath
    ? JSON.stringify(input.socketPath)
    : 'undefined';

  // detect if in typescript environment
  const isTypeScriptEnv = __filename.endsWith('.ts');

  // determine the module path to require
  const modulePath = isTypeScriptEnv
    ? __filename
    : __filename.replace(/\.ts$/, '.js');

  const daemonScript = `
    const { startKeyrackDaemon } = require('${modulePath}');
    startKeyrackDaemon({ socketPath: ${socketPathArg} });
  `;

  // use tsx for typescript, node for compiled javascript
  const execPath = isTypeScriptEnv
    ? require.resolve('tsx/cli')
    : process.execPath;

  // spawn a detached process
  const child = spawn(execPath, ['-e', daemonScript], {
    detached: true,
    stdio: 'ignore',
  });

  // unref so parent can exit
  child.unref();

  // log to stderr to keep stdout clean for --json output
  console.error(
    `[keyrack-daemon] spawned background daemon (pid: ${child.pid})`,
  );
};
