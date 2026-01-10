/**
 * emoji-space-shim
 *
 * shim console.log to fix emoji space render issues across terminals.
 */

// main shim
export { shimConsoleLog } from './contract/sdk/shimConsoleLog';
export { withEmojiSpaceShim } from './contract/sdk/withEmojiSpaceShim';
// registry (for extension by consumers)
export { EMOJI_SPACE_REGISTRY } from './domain.objects/EmojiSpaceRegistry';
// types
export type { TerminalChoice } from './domain.objects/TerminalChoice';
export { computeSpaceAdjustment } from './domain.operations/computeSpaceAdjustment';
// operations (for advanced use cases)
export { detectTerminalChoice } from './domain.operations/detectTerminalChoice';
export { transformMessageForTerminal } from './domain.operations/transformMessageForTerminal';
