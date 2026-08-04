import { asKeyrackDaemonPidPath } from '@src/domain.operations/keyrack/daemon/infra/asKeyrackDaemonPidPath';
import { delFileSync } from '@src/domain.operations/keyrack/daemon/infra/delFileSync';
import { getHomeHash } from '@src/domain.operations/keyrack/daemon/infra/getHomeHash';
import { getKeyrackDaemonSocketPath } from '@src/domain.operations/keyrack/daemon/infra/getKeyrackDaemonSocketPath';
import { createKeyrackDaemonServer } from '@src/domain.operations/keyrack/daemon/svc/src/infra/createKeyrackDaemonServer';

import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

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

  // compute home hash for daemon identity
  const homeHash = getHomeHash();

  // start the server
  const { server } = createKeyrackDaemonServer({ socketPath, homeHash });

  // write pid file for management
  const pidPath = asKeyrackDaemonPidPath({ socketPath });
  writeFileSync(pidPath, String(process.pid));

  /**
   * .what = remove the socket + pid files this daemon owns
   * .why = a daemon that dies without its files unlinked leaves an orphan that
   *        `daemon prune` will later report as a phantom kill
   *
   * .note = sync only, so this is safe to call from an 'exit' handler
   * .note = "own" is checked, not assumed. createKeyrackDaemonServer unlinks any
   *         stale socket before it binds, so two daemons that race onto one path do
   *         not collide — the later one silently takes the path over, and the earlier
   *         one keeps its listener while its socket file now belongs to the successor.
   *         were this handler to unlink by path alone, that earlier daemon's death
   *         would delete a *live* successor's socket and pid file, and the successor
   *         would serve on with no file on disk — unreachable to new clients and
   *         invisible to `daemon prune` for as long as it lived. the pid file is the
   *         ownership record: read it, and stand down when it names another process
   */
  const unlinkOwnFiles = () => {
    // stand down unless the pid file still names this process
    const pidOwner = (() => {
      try {
        return readFileSync(pidPath, 'utf-8').trim();
      } catch (error) {
        // allow expected errors: ENOENT = already cleaned up, by us or by a successor
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        return null;
      }
    })();
    if (pidOwner !== String(process.pid)) return;

    // .why = delFileSync allows ENOENT (another exit route already unlinked it) and
    // surfaces every other code. EACCES/EBUSY are real faults: the throw is
    // deliberate even from an 'exit' handler, because it forfeits the zero exit code
    // — and that is the point. a daemon that could not remove its own files leaves an
    // orphan that `daemon prune` will later report as a phantom kill, so a nonzero
    // exit is the only signal the supervisor can act on. console.error is not an
    // option here: this process is spawned with stdio: 'ignore', so a log line
    // written to it reaches nobody
    delFileSync({ path: socketPath });
    delFileSync({ path: pidPath });
  };

  // handle shutdown signals
  // .note = the unlink here is redundant with the 'exit' handler below, and stays so
  // deliberately. unlinkOwnFiles is idempotent, so the second call is a no-op — and in
  // a daemon whose defect was cleanup that silently did not run, an unconditional
  // second attempt is worth two syscalls once per death. do not "tidy" it away
  const shutdown = () => {
    console.log('[keyrack-daemon] shutdown signal received');
    server.close();
    unlinkOwnFiles();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  // clean up on every exit route, not only the signals
  // .why = scheduleAutoTermination exits via process.exit(0), which fires neither
  // SIGTERM nor SIGINT. self-termination is the *common* exit once the idle timeout
  // is live, so without this every self-terminated daemon orphans its .sock and .pid
  // — the process count would decay while the file count still grew, and
  // `daemon prune --owner @all` would report each orphan as a phantom kill.
  // .note = an 'exit' handler may only run synchronous work, so server.close() is
  // deliberately absent here; the OS reclaims the listener at exit regardless.
  process.on('exit', unlinkOwnFiles);

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
  // .note = explicitly pass env to ensure subprocess inherits test overrides
  const child = spawn(execPath, ['-e', daemonScript], {
    detached: true,
    stdio: 'ignore',
    env: process.env,
  });

  // unref so parent can exit
  child.unref();

  // log to stderr to keep stdout clean for --json output
  console.error(
    `[keyrack-daemon] spawned background daemon (pid: ${child.pid})`,
  );
};
