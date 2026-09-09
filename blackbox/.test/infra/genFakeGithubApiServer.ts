import { MalfunctionError } from 'helpful-errors';
import { type ChildProcess, spawn } from 'node:child_process';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

/**
 * .what = stand up the GitHub API stand-in as its OWN detached os process, and return the
 *   `host:port` to hand to `GH_HOST`, the cert path to hand to `SSL_CERT_FILE`, and a close()
 *   that terminates the process.
 *
 * .why = the github.secrets vault shells out to the REAL `gh` binary (`ghSecretSet.ts`,
 *   `ghSecretDelete.ts`) from a CLI subprocess the suite spawns. that subprocess cannot reach a
 *   listener inside the jest worker, so the stand-in must live in a separate process — the same
 *   constraint, and the same cure, as `genFakeSsmServerDetached`.
 *
 *   before this stand-in the acceptance suite put a STUB `gh` first on PATH — which is a mock: the
 *   binary itself was replaced, so no github client code ran, and the gate proved no fact about
 *   the api. `gh` honors `GH_HOST` (it dials `https://$GH_HOST/api/v3/...`) and `SSL_CERT_FILE`
 *   (its Go trust pool), so the real binary can be pointed here instead. that makes this a backend
 *   **swap**, never a mock — the whole client stack runs: `gh` looks up the host, negotiates TLS,
 *   authenticates, builds the request, libsodium-encrypts the secret, and PUTs it (`term=swap`).
 *
 * .note = the wire behavior lives in `ghApiStandInServer.cjs`, which must be a standalone entry
 *   because it is spawned as its own process; read its jsdoc for the routes served, why the
 *   stand-in needs real TLS, and why no libsodium dependency is needed.
 */
export const genFakeGithubApiServer = async (): Promise<{
  /** the `host:port` to hand to GH_HOST (gh prepends https:// and appends /api/v3) */
  host: string;
  /** the cert path to hand to SSL_CERT_FILE, so gh's Go trust pool accepts this server */
  certPath: string;
  /** terminate the detached server (call in afterAll) */
  close: () => Promise<void>;
}> => {
  const serverEntry = join(__dirname, 'ghApiStandInServer.cjs');
  const certPath = join(
    __dirname,
    '..',
    'assets',
    'gh-api-swap',
    'localhost.selfsigned.cert.pem',
  );

  const child: ChildProcess = spawn(process.execPath, [serverEntry], {
    // its own os process (not a listener inside the worker) so the CLI subprocess can reach it
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  });

  // guard the pipes explicitly: stdio requests both as 'pipe', so a null here means the child
  // failed to start — fail loud with the cause rather than crash on a null-property read later
  if (!child.stdout || !child.stderr)
    throw new MalfunctionError(
      'gh api stand-in child process did not open its stdout/stderr pipes',
      { serverEntry, pid: child.pid },
    );
  const childStdout = child.stdout;
  const childStderr = child.stderr;

  // capture the announced host from the child's stdout (`STANDIN_HOST=localhost:<port>`)
  const host = await new Promise<string>((take, fail) => {
    const timeout = setTimeout(
      () =>
        fail(
          new MalfunctionError('gh api stand-in never announced its host', {
            serverEntry,
            waitedMs: 8000,
            hint: 'the child must print `STANDIN_HOST=<host>:<port>` on its own stdout line',
          }),
        ),
      8000,
    );
    // read the child's stdout line-by-line via readline — no mutable accumulator (per
    // rule.require.immutable-vars): readline reassembles chunk boundaries internally and emits
    // one complete line at a time, so the announced `STANDIN_HOST=...` line is matched without a
    // const-array `.push`. the child prints the marker on its own line
    const lines = createInterface({ input: childStdout });
    lines.on('line', (line) => {
      const match = line.match(/STANDIN_HOST=(\S+)/);
      if (match?.[1]) {
        clearTimeout(timeout);
        lines.close();
        take(match[1]);
      }
    });
    childStderr.on('data', (chunk) =>
      // eslint-disable-next-line no-console
      console.error('[gh-api-standin] stderr =', String(chunk)),
    );
    child.on('error', (err) => {
      clearTimeout(timeout);
      fail(err);
    });
  });

  return {
    host,
    certPath,
    close: () =>
      new Promise<void>((done) => {
        // a hard fallback so a stuck child never hangs the suite
        const hardKill = setTimeout(() => {
          child.kill('SIGKILL');
          done();
        }, 3000);
        hardKill.unref();
        child.on('exit', () => {
          // a prompt SIGTERM exit clears the fallback so the timer never fires on a dead child
          clearTimeout(hardKill);
          done();
        });
        child.kill('SIGTERM');
      }),
  };
};

/**
 * .what = the env that points the real `gh` binary at a stand-in rather than at github.com
 *
 * .why = three of these four matter in a non-obvious way, and a naive attempt trips on each.
 *   they are collected here so every call site gets them right by construction.
 *
 * ⚠️ .GH_TOKEN-is-emptied-on-purpose = `gh auth status` checks EVERY host it knows. with a NON-EMPTY
 *   `GH_TOKEN`, gh also probes github.com, fails there, and exits 1 — even though the stand-in host
 *   authenticated fine. that would make `validateGhAuth()` (`ghSecretSet.ts`) throw.
 *   `GH_ENTERPRISE_TOKEN` scopes the credential to the non-github.com host, which is what the
 *   stand-in is. proven: `GH_TOKEN=''` → exit 0, `GH_TOKEN='x'` → exit 1.
 *
 *   the empty string is deliberate rather than an omission: a ci runner may export `GH_TOKEN`
 *   itself, so an env that merely omits the key inherits the runner's value and the suite goes red
 *   only in ci. `''` overrides it either way, so the suite behaves the same everywhere.
 *
 * ⚠️ .GH_CONFIG_DIR-is-required = without it, gh reads the developer's real credential store, so
 *   the suite would pass on a box with a github login and fail in ci (rule.require.hermetic-tests).
 */
export const asGhSwapEnv = (input: {
  /** from genFakeGithubApiServer */
  host: string;
  /** from genFakeGithubApiServer */
  certPath: string;
  /** a temp dir, so gh reads no ambient credential store */
  configDir: string;
}): Record<string, string> => ({
  GH_HOST: input.host,
  GH_ENTERPRISE_TOKEN: 'stand-in-token',
  SSL_CERT_FILE: input.certPath,
  GH_CONFIG_DIR: input.configDir,
  // overrides an ambient/ci GH_TOKEN — see the note above; an omission here is NOT equivalent
  GH_TOKEN: '',
});
