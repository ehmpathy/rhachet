/**
 * .what = the parent-session markers a claude process exports to its children
 * .why = a clone is its own top-level session, never a child of the process that
 *        ran `rhx`. inherited, `CLAUDE_CODE_CHILD_SESSION` turns off transcript
 *        persistence (claude warns of the inherited marker), so `say` cannot verify
 *        a submit and `get` reads naught. the rest name the parent's session, pid,
 *        and message socket, which a clone must not claim as its own
 */
const PARENT_SESSION_MARKERS = [
  'CLAUDECODE',
  'CLAUDE_CODE_CHILD_SESSION',
  'CLAUDE_CODE_SESSION_ID',
  'CLAUDE_CODE_ENTRYPOINT',
  'CLAUDE_CODE_SESSION_ATTENDED',
  'CLAUDE_CODE_MESSAGING_TOKEN',
  'CLAUDE_CODE_MESSAGING_SOCKET',
  'CLAUDE_CODE_EXECPATH',
  'CLAUDE_PID',
];

/**
 * .what = the startup work every clone skips by default: claude.ai connectors,
 *         non-essential traffic, the autoupdater, telemetry, and error reports
 * .why = each is network work at spinup that a clone never needs. measured on a
 *        clean HOME, connectors plus non-essential traffic cost ~7s per `claude -p`
 *        (~21s → ~14s). a caller that sets one of these keys keeps its own value
 * .note = `--bare` is faster still, but it skips `CLAUDE.md`, hooks, and OAuth — the
 *         boot corpus and the credential a clone depends on
 */
export const BRAIN_CLI_SPINUP_ENV_DEFAULTS: Readonly<Record<string, string>> = {
  ENABLE_CLAUDEAI_MCP_SERVERS: 'false',
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
  DISABLE_AUTOUPDATER: '1',
  DISABLE_TELEMETRY: '1',
  DISABLE_ERROR_REPORTING: '1',
};

/**
 * .what = the env a brain cli clone spawns with: the spinup defaults, then the
 *         caller's env minus the parent-session markers, then `CLAUDE_CONFIG_DIR`
 *         set to the actor's brain dir
 * .why = one owner for both spawn sites (pty and plain), so neither can drop the
 *        relocation and boot a clone from the human's `~/.claude` (D4), nor leak a
 *        parent session's markers into the clone (a clone run from inside claude
 *        would otherwise persist no transcript), nor pay spinup work it never uses
 */
export const asBrainCliSpawnEnv = (input: {
  env: NodeJS.ProcessEnv;
  brainDir: string;
}): NodeJS.ProcessEnv => ({
  ...BRAIN_CLI_SPINUP_ENV_DEFAULTS,
  ...Object.fromEntries(
    Object.entries(input.env).filter(
      ([key]) => !PARENT_SESSION_MARKERS.includes(key),
    ),
  ),
  CLAUDE_CONFIG_DIR: input.brainDir,
});
