/**
 * .what = event types that trigger brain hooks
 * .why = defines the lifecycle moments where hooks can execute
 *
 * .note = maps to brain-specific events:
 *   - onBoot → SessionStart (claudecode), session.created (opencode)
 *   - onTool → PreToolUse/PostToolUse (claudecode), tool.execute.before/after (opencode)
 *   - onStop → Stop (claudecode), session.idle (opencode)
 */
export type BrainHookEvent = 'onBoot' | 'onTool' | 'onStop';
