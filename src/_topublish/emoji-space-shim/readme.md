# emoji-space-shim

shim console.log to fix emoji space render issues across terminals.

## problem

some emojis render incorrectly across different terminals due to character width inconsistencies. for example, the beaver emoji (`🦫`) may appear to "eat" the space after it in VS Code's terminal, while it renders correctly in other terminals.

## solution

this package provides a shim that automatically adjusts space after emojis based on the detected terminal. this ensures consistent visual output.

## install

```sh
npm install emoji-space-shim
```

## usage

### basic usage

```ts
import { shimConsoleLog } from 'emoji-space-shim';

// apply the shim (auto-detects terminal)
const shim = shimConsoleLog();

// console.log now adjusts emoji space automatically
console.log('🦫 hello world');

// restore original behavior when done
shim.restore();
```

### explicit terminal

```ts
import { shimConsoleLog } from 'emoji-space-shim';

// specify terminal explicitly
const shim = shimConsoleLog({ terminal: 'vscode' });

console.log('🦫 hello world'); // outputs: "🦫  hello world" (extra space added)
```

## terminal support

| terminal | detection |
|----------|-----------|
| vscode | `TERM_PROGRAM === 'vscode'` |
| xterm | `TERM.includes('xterm')` |
| gnome | `TERM_PROGRAM === 'gnome-terminal'` |
| default | fallback |

## extend the registry

you can extend the emoji registry for custom emoji support:

```ts
import { EMOJI_SPACE_REGISTRY, shimConsoleLog } from 'emoji-space-shim';

// add custom emoji rules
EMOJI_SPACE_REGISTRY['🎉'] = { vscode: 1, default: 0 };

// now shim will handle this emoji too
const shim = shimConsoleLog();
console.log('🎉 celebration');
```

## exports

| export | description |
|--------|-------------|
| `shimConsoleLog` | main shim function |
| `TerminalChoice` | type for terminal variants |
| `EMOJI_SPACE_REGISTRY` | emoji space rules dictionary |
| `detectTerminalChoice` | terminal detection function |
| `computeSpaceAdjustment` | space calculation function |
| `transformMessageForTerminal` | message transform function |

## how it works

1. `detectTerminalChoice()` determines the current terminal from environment variables
2. `computeSpaceAdjustment()` looks up the required space for each emoji in the registry
3. `transformMessageForTerminal()` applies the space adjustments to strings
4. `shimConsoleLog()` wraps `console.log` to automatically transform all string arguments
