import { given, then, when } from 'test-fns';

import { asLiveBrainMarkersOfRegistry } from './asLiveBrainMarkersOfRegistry';
import { getMarkersOfContent } from './getMarkersOfContent';
import { LIVE_BRAIN_REGISTRY } from './liveBrainRegistry';

/**
 * .what = one row per shape by which code reaches a live brain, read with this repo's registry
 * .why = each shape the scan claims to catch is planted, so a miss fails a named row
 */
const MARKERS = asLiveBrainMarkersOfRegistry({ registry: LIVE_BRAIN_REGISTRY });
const TEST_CASES: { description: string; content: string; markers: string[] }[] = [
  {
    description: 'a supplier factory import',
    content: "import { genBrainRepl } from 'rhachet-brains-anthropic';",
    markers: ['an import of a rhachet-brains-* supplier'],
  },
  {
    description: 'a supplier getter import',
    content: "import { getBrainReplsByOpenAI } from 'rhachet-brains-openai';",
    markers: ['an import of a rhachet-brains-* supplier'],
  },
  {
    description: 'a supplier namespace import',
    content: "import * as brains from 'rhachet-brains-xai';",
    markers: ['an import of a rhachet-brains-* supplier'],
  },
  {
    description: 'a supplier require',
    content: "const brains = require('rhachet-brains-anthropic');",
    markers: ['an import of a rhachet-brains-* supplier'],
  },
  {
    description: 'a supplier import in double quotes',
    content: 'import { genBrainRepl } from "rhachet-brains-anthropic";',
    markers: ['an import of a rhachet-brains-* supplier'],
  },
  {
    description: 'a supplier dynamic import in backticks',
    content: 'const brains = await import(`rhachet-brains-anthropic`);',
    markers: ['an import of a rhachet-brains-* supplier'],
  },
  {
    description: 'a vendor sdk require in double quotes',
    content: 'const { default: OpenAI } = require("openai");',
    markers: ['an import of a vendor sdk'],
  },
  {
    description: 'a spawn of the claude cli in double quotes, with a print-mode array',
    content: 'spawnSync("claude", ["-p", "--model", "haiku"]);',
    markers: ['a spawn of the claude cli', 'a claude print-mode call'],
  },
  {
    description: 'an import of the live-only journey module, in double quotes',
    content: 'import { asSentinel } from "./brainDirBootJourney";',
    markers: ['an import of blackbox/.test/infra/brainDirBootJourney.ts'],
  },
  {
    description: 'a vendor sdk import',
    content: "import OpenAI from 'openai';",
    markers: ['an import of a vendor sdk'],
  },
  {
    description: 'a spawn of the claude cli',
    content: "spawnSync('claude', ['-p', 'hi']);",
    markers: ['a spawn of the claude cli'],
  },
  {
    description: 'a claude print-mode call by a bin path',
    content: "spawn(binPath, ['-p', '--model', 'haiku']);",
    markers: ['a claude print-mode call'],
  },
  {
    description: 'the real claude bin override',
    content: "process.env.RHACHET_REAL_CLAUDE_BIN = '/x';",
    markers: ['the real claude bin override'],
  },
  {
    description: 'the registered live probe, run by its file name',
    content: "const probe = join(__dirname, 'probe.replDoorRealSupplierLive.cjs');",
    markers: ['an import of blackbox/.test/infra/probe.replDoorRealSupplierLive.cjs'],
  },
  {
    description: 'a probe whose name only ends like the live one is not it',
    content: "const probe = join(__dirname, 'probe.replDoorRealSupplier.cjs');",
    markers: [],
  },
  {
    description: 'a brain call',
    content: "await context.brain.choice.ask({ prompt: 'hi' });",
    markers: ['a brain call'],
  },
  {
    description: 'a brain call through a non-null assertion',
    content: "await context.brain.choice!.act({ prompt: 'hi' });",
    markers: ['a brain call'],
  },
  {
    description: 'a brain context and a destructured call in one file',
    content:
      "const { brain } = await genContextBrain({ choice: 'a/b' });\nconst { choice } = brain;\nawait choice.ask({ prompt: 'hi' });",
    markers: ['a brain context with a call', 'a brain context'],
  },
  {
    description: 'a brain context in infra',
    content: "const context = await genContextBrain({ choice: 'a/b' });",
    markers: ['a brain context'],
  },
  {
    description: 'a claude print-mode command in a shell',
    content: 'claude -p "say ok"',
    markers: ['a claude print-mode command'],
  },
  {
    description: 'a live harness name that was once off the list',
    content: 'const bin = getRealClaudeBinPath();',
    markers: ['a live entry point of blackbox/.test/infra/enrollCloneHarness.ts'],
  },
  {
    description: 'the openai context',
    content: 'const ctx = getContextOpenAI();',
    markers: ['a live entry point of src/.test/getContextOpenAI.ts'],
  },
  {
    description: 'an import of the live-only journey module, by alias',
    content: "import { askClaudePrintForSentinels } from '@/blackbox/.test/infra/brainDirBootJourney';",
    markers: ['an import of blackbox/.test/infra/brainDirBootJourney.ts'],
  },
  {
    description: 'an import of the live-only journey module, by a relative path',
    content: "import { asSentinel } from './brainDirBootJourney';",
    markers: ['an import of blackbox/.test/infra/brainDirBootJourney.ts'],
  },
  {
    description: 'a stub harness name only',
    content: 'await enrollCloneAndWaitReady({ dir, env });',
    markers: [],
  },
  {
    description: 'an execFileSync of the claude cli',
    content: "execFileSync('claude', ['hi']);",
    markers: ['a spawn of the claude cli'],
  },
  {
    description: 'a fetch to a vendor api host',
    content: "await fetch('https://api.anthropic.com/v1/messages', {});",
    markers: ['a call to a vendor api host'],
  },
  {
    description: 'a slug handed to the --brain flag, as an array element',
    content: "invokeCli(['ask', '--brain', 'anthropic/claude/code/haiku']);",
    markers: ['a live brain slug'],
  },
  {
    description: 'a slug handed to the --brain flag, in a shell line',
    content: 'rhx ask --brain=openai/codex --prompt hi',
    markers: ['a live brain slug'],
  },
  {
    description: 'a slug handed as a brain choice',
    content: "await actorAsk({ brain: 'xai/grok/3-mini', prompt: 'hi' });",
    markers: ['a live brain slug'],
  },
  {
    description: 'a slug in an assertion is data',
    content: "expect(found).toContain('anthropic/claude/code');",
    markers: [],
  },
  {
    description: 'no brain at all',
    content: "describe('x', () => {});",
    markers: [],
  },
];

describe('getMarkersOfContent', () => {
  TEST_CASES.map((thisCase, index) =>
    given(`[case${index + 1}] ${thisCase.description}`, () => {
      when('[t0] the markers are read', () => {
        then('it names exactly the markers the shape holds', () => {
          expect(getMarkersOfContent({ content: thisCase.content, markers: MARKERS })).toEqual(
            thisCase.markers,
          );
        });
      });
    }),
  );

  given(`[case${TEST_CASES.length + 1}] a supplied marker with the g flag, read over two files`, () => {
    when('[t0] the same marker reads two files in turn', () => {
      then('it names the marker in each file, since no lastIndex carries over', () => {
        const markers = [{ name: 'a probe', pattern: /probe/g, scope: 'tests' as const }];
        expect(getMarkersOfContent({ content: 'a probe', markers })).toEqual(['a probe']);
        expect(getMarkersOfContent({ content: 'a probe', markers })).toEqual(['a probe']);
      });
    });
  });
});
