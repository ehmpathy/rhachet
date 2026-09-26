import { genEphemeralSshAgent } from '../genEphemeralSshAgent';

/**
 * .what = a throwaway child that spawns one ephemeral ssh-agent, then idles
 * .why  = lets the parent integration test deliver a REAL signal (SIGTERM) to a
 *         live process and prove the signal-teardown path reaps the agent — a
 *         path that cannot be exercised in-process (the handler re-raises the
 *         signal, which would kill the jest runner itself)
 *
 * .note = prints one line `PID<TAB>SOCK` to stdout so the parent learns the
 *         spawned agent's pid + socket, then stays alive on an idle timer until
 *         the parent signals it — the signal handler in genEphemeralSshAgent
 *         reaps the agent before the process exits
 */
const agent = genEphemeralSshAgent({ owner: 'signal-child' });

// hand the parent the agent identity on one line, flushed immediately
process.stdout.write(`${agent.pid}\t${agent.sock}\n`);

// idle until the parent delivers a signal; the registered handler tears down
setInterval(() => {
  // no-op keepalive
}, 1_000);
