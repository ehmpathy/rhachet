import { CLONE_ENV_KEYS_HANDOFF } from '@src/utils/cloneEnvKeys';

import { BRAIN_CLI_BOOT_FLAG } from './asBrainCliSpawnArgs';

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
 * .what = a detached host's handoff keys, read as plain strings
 * .why = no clone may inherit them, whichever caller spawns it (F9)
 */
const HANDOFF_KEYS: readonly string[] = CLONE_ENV_KEYS_HANDOFF;

/** the env key that switches the brain-cli's `CLAUDE.md` door off */
const DOOR_SWITCH_KEY = 'CLAUDE_CODE_DISABLE_CLAUDE_MDS';

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
 *         set to the actor's brain dir, `CLAUDE_SECURESTORAGE_CONFIG_DIR` set to '',
 *         and `CLAUDE_CODE_DISABLE_CLAUDE_MDS` set to '1' when the argv carries the boot
 * .why = one owner for both spawn sites (pty and plain), so neither can drop the
 *        relocation and boot a clone from the human's `~/.claude` (D4), nor leak a
 *        parent session's markers into the clone (a clone run from inside claude
 *        would otherwise persist no transcript), nor pay spinup work it never uses,
 *        nor hand a clone a detached host's handoff keys — a clone that inherits
 *        the host marker reads itself as a host (F9), whichever caller spawns it
 * .note = `CLAUDE_SECURESTORAGE_CONFIG_DIR=''` (empty, not unset) points claude-code's
 *         login store, its write lock, and its oauth refresh lock at `~/.claude`, while
 *         config stays per actor — one login file under one lock set for every clone.
 *         it is set after the caller env, so a caller value never overrides it
 * .note = `CLAUDE_CODE_DISABLE_CLAUDE_MDS='1'` switches the `CLAUDE.md` door off. a clone
 *         reads its boot from the system prompt (`asBrainCliSpawnArgs`), where the prompt
 *         cache can share it across sessions; the brain dir still holds
 *         `CLAUDE.md → AGENTS.md → @boot.md` for any reader outside a clone, so with the
 *         door open the boot would load twice. user-source memory is the only memory a
 *         clone reads (project and local are off), so the switch drops the boot's second
 *         copy and no other file. set after the caller env, so a caller value never reopens it
 * .note = the pair is derived, never kept by convention: the door closes only when `args`
 *         carry `BRAIN_CLI_BOOT_FLAG`. a spawn whose argv lacks the boot keeps the `CLAUDE.md`
 *         door open, so no spawn site can close both doors and boot a clone with no briefs
 */
export const asBrainCliSpawnEnv = (input: {
  env: NodeJS.ProcessEnv;
  brainDir: string;
  args: string[];
}): NodeJS.ProcessEnv => {
  // close the CLAUDE.md door only where the argv opens the system-prompt door
  const isBootViaSystemPrompt = input.args.includes(BRAIN_CLI_BOOT_FLAG);

  // drop the parent-session markers and the host handoff keys from the caller env; with no
  //   boot in the argv, drop an inherited door switch too, so the CLAUDE.md door stays open
  const envInherited = Object.fromEntries(
    Object.entries(input.env).filter(
      ([key]) =>
        !PARENT_SESSION_MARKERS.includes(key) &&
        !HANDOFF_KEYS.includes(key) &&
        (isBootViaSystemPrompt || key !== DOOR_SWITCH_KEY),
    ),
  );

  return {
    ...BRAIN_CLI_SPINUP_ENV_DEFAULTS,
    ...envInherited,
    CLAUDE_CONFIG_DIR: input.brainDir,
    CLAUDE_SECURESTORAGE_CONFIG_DIR: '',
    ...(isBootViaSystemPrompt ? { [DOOR_SWITCH_KEY]: '1' } : {}),
  };
};
