import type { KeyrackDaemonCommand } from '@src/domain.objects/keyrack/KeyrackDaemonCommand';
import type { DaemonActivityClock } from '@src/domain.operations/keyrack/daemon/svc/src/domain.objects/daemonActivityClock';
import type { DaemonKeyStore } from '@src/domain.operations/keyrack/daemon/svc/src/domain.objects/daemonKeyStore';

import type { Socket } from 'node:net';
import { handleGetCommand } from './handleGetCommand';
import { handleRelockCommand } from './handleRelockCommand';
import { handleStatusCommand } from './handleStatusCommand';
import { handleUnlockCommand } from './handleUnlockCommand';
import type { verifyCallerLoginSession } from './verifyCallerLoginSession';

/**
 * .what = daemon request message shape
 * .why = typed protocol for daemon commands
 */
interface DaemonRequest {
  command: KeyrackDaemonCommand;
  payload: unknown;
}

/**
 * .what = daemon response message shape
 * .why = typed protocol for daemon responses
 */
interface DaemonResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * .what = handle a client connection to the keyrack daemon
 * .why = verifies caller session and dispatches commands
 *
 * .note = reads json from socket, writes json response
 * .note = one request-response per connection (no stream mode)
 */
export const handleKeyrackDaemonConnection = (
  input: { socket: Socket },
  context: {
    keyStore: DaemonKeyStore;
    homeHash: string;
    // .why = the write half of the clock only. the connection handler reports demand;
    // it never reads the lease. paired with scheduleAutoTermination, which takes the
    // read half and never the write, the two Picks make the split self-evident: one
    // side marks time, the other side judges it, and neither can do the other's job
    activity: Pick<DaemonActivityClock, 'touch'>;
    // .why = injected, unlike the other collaborators in this file, for one reason:
    // this one has a COST that must be observable. it shells out to `ss -xp`, whose
    // work grows with every socket on the machine, and the lazy gate below exists to
    // keep it off the byte-less path. a direct import can only be observed by a mock
    // (forbidden by rule.forbid.unit.remote-boundaries); as an injected collaborator,
    // a test counts invocations and the property is clamped rather than argued
    verifySession: typeof verifyCallerLoginSession;
  },
): void => {
  const { socket } = input;

  // verify the caller's login session once per connection, on its first bytes
  // .why = peer credentials are fixed for the socket's whole life — the kernel
  // stamps them at connect — so a per-request re-check buys no safety. and the
  // verdict is needed BEFORE the first byte counts, because it decides whether
  // those bytes are demand at all (see the touch below)
  // .note = every error becomes a refusal, and none is rethrown. that is deliberate
  // on all three counts, because the usual failfast move is wrong here:
  //   1. a throw from a connection callback takes the whole daemon down, and with it
  //      the live keys it holds for every OTHER caller. one caller's unreadable
  //      /proc entry must not evict a session's credentials
  //   2. refusal is the fail-safe verdict. this check IS the trust boundary; when it
  //      cannot be evaluated, "serve anyway" is the only answer that is unsafe
  //   3. the message crosses the wire verbatim, so a caller reads "process not found"
  //      rather than a session mismatch that did not happen. that distinction is not
  //      lost, it is relocated — and the socket is the ONLY channel out of here, since
  //      a spawned daemon runs with stdio: 'ignore' and a log line would reach nobody
  const getSessionDenial = (): string | null => {
    try {
      context.verifySession({ socket });
      return null;
    } catch (error) {
      if (error instanceof Error) return error.message;
      return 'session verification failed';
    }
  };

  // the verdict is evaluated at most once, and only once bytes actually arrive
  // .why = the check is NOT free: getSocketPeerPid shells out to `ss -xp`, whose
  // cost grows with every unix socket on the machine. to run it when the connection
  // opens would charge that scan to every isDaemonReachable probe — and a probe
  // connects and destroys without a byte sent, so it would pay the full cost while
  // it can never send a command. the reachability polls in this repo's own tests run
  // up to 50 times per case, so an eager check multiplies the cheapest operation in
  // this subsystem by the most expensive one. observed: under an eager check on a
  // machine that held ~1867 sockets, the shell-out threw and this gate turned that
  // throw into a refusal of legitimate callers (keyrack.env-all, exit 1, no stdout)
  // .note = memoized rather than re-run per request, because peer credentials are
  // stamped by the kernel at connect and cannot change mid-connection. so one
  // evaluation is both sufficient and needed before the first byte counts as demand
  // .note = deliberate mutation: this is a memo cell, and a memo that cannot be
  // written is not a memo. `undefined` means "not yet evaluated" and is distinct
  // from `null`, which is the real verdict "this caller is allowed". it is confined
  // to one connection's closure and assigned at exactly one site
  let sessionDenial: string | null | undefined;

  let buffer = '';

  socket.on('data', (chunk) => {
    // a caller who can never be served is not demand
    // .why = the daemon's lease is renewed by demand, and demand means a caller
    // this daemon will actually work for. a process in a different login session
    // is refused every command it can ever send, so its bytes must not renew the
    // lease — otherwise a same-uid process from another session could hold a
    // keyless daemon alive forever while it never passes the session check. that
    // is this branch's own defect at a different axis: a signal renewable by a
    // caller that can never become purpose. the census found exactly that split
    // live on one machine (sessionId 3 and 4 side by side), so it is not
    // hypothetical
    if (sessionDenial === undefined) sessionDenial = getSessionDenial();
    if (sessionDenial !== null) {
      socket.write(JSON.stringify({ success: false, error: sessionDenial }));
      socket.end();
      return;
    }

    // mark demand on inbound bytes, before any parse attempt
    // .why = the grain of this signal is pinned from both sides. a bare socket
    // connect is too coarse: isDaemonReachable connects and destroys without a
    // byte sent, so probes would masquerade as demand and any poll-for-death
    // loop would keep its target alive forever. a fully parsed request is too
    // fine: a client may hold an open socket mid-write while we await the rest,
    // and a tick that fired then would cut a live caller off with ECONNRESET.
    // inbound bytes is the one grain that satisfies both.
    // .note = grain and authority are orthogonal. this line settles HOW MUCH
    // counts as demand; the denial gate above settles WHO may generate it
    context.activity.touch();

    buffer += chunk.toString();

    // try to parse the request
    let request: DaemonRequest;
    try {
      request = JSON.parse(buffer);
    } catch {
      // incomplete json, wait for more data
      return;
    }

    // reset buffer after parse
    buffer = '';

    // process the request
    const response = processRequest({ request }, context);

    // send response and close
    socket.write(JSON.stringify(response));
    socket.end();
  });

  socket.on('error', (err) => {
    // log and close on error
    console.error('[keyrack-daemon] socket error:', err.message);
    socket.destroy();
  });
};

/**
 * .what = process a parsed daemon request
 * .why = separates parse step from command dispatch
 *
 * .note = the caller's login session is verified once at connection open, not
 *         here. peer credentials cannot change mid-connection, and the verdict is
 *         needed before the first byte is counted as demand — so a per-request
 *         re-check would be both redundant and too late
 */
const processRequest = (
  input: { request: DaemonRequest },
  context: { keyStore: DaemonKeyStore; homeHash: string },
): DaemonResponse => {
  const { request } = input;

  // dispatch by command
  try {
    switch (request.command) {
      case 'UNLOCK': {
        const payload = request.payload as Parameters<
          typeof handleUnlockCommand
        >[0];
        const result = handleUnlockCommand(payload, context);
        return { success: true, data: result };
      }

      case 'GET': {
        const payload = request.payload as Parameters<
          typeof handleGetCommand
        >[0];
        const result = handleGetCommand(payload, context);
        return { success: true, data: result };
      }

      case 'STATUS': {
        const result = handleStatusCommand({}, context);
        return { success: true, data: result };
      }

      case 'RELOCK': {
        const payload = request.payload as Parameters<
          typeof handleRelockCommand
        >[0];
        const result = handleRelockCommand(payload, context);
        return { success: true, data: result };
      }

      default:
        return {
          success: false,
          error: `unknown command: ${request.command}`,
        };
    }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'command execution failed' };
  }
};
