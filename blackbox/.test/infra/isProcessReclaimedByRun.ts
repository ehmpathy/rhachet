/**
 * .what = whether a process a test left alive is the run's to reclaim, rather than a leak
 * .why = a keyrack daemon is a session daemon by design: it outlives the cli call that spawned
 *   it and holds its keys to their ttl, so a test cannot end it through the contract it tests.
 *   its reclaim is the harness's job, like a temp dir's. every other process a test leaves —
 *   a brain stub, an enroll host — is meant to end with its test, so it is a leak
 * .note = matched on the inline `-e` source `spawnKeyrackDaemonBackground` launches the daemon with
 */
export const isProcessReclaimedByRun = (input: { command: string }): boolean =>
  input.command.includes('startKeyrackDaemon');
