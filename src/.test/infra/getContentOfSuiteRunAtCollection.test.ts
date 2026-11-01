import { given, then, when } from 'test-fns';

import { getContentOfSuiteRunAtCollection } from './getContentOfSuiteRunAtCollection';

/**
 * .what = one row per shape, with the text jest runs at collection and the text it defers
 * .why = a live call that jest runs at collection bills every push, gate or no gate
 */
const TEST_CASES: { description: string; content: string; held: string[]; lacked: string[] }[] = [
  {
    description: 'a top-level const that calls the claude cli',
    content:
      "import { execSync } from 'node:child_process';\nconst answer = execSync('claude -p hi').toString();\ndescribeBrainLiveOnDemand('x', () => {});",
    held: ["execSync('claude -p hi')"],
    lacked: ['node:child_process'],
  },
  {
    description: 'a call in the gate body, outside any then',
    content: "describeBrainLiveOnDemand('x', () => {\n  spawnSync('claude', ['-p', 'hi']);\n});",
    held: ["spawnSync('claude', ['-p', 'hi'])"],
    lacked: [],
  },
  {
    description: 'a call in a nested given and when body',
    content:
      "describeBrainLiveOnDemand('x', () => {\n  given.runIf(true)('y', () => {\n    when('z', () => {\n      const reply = brain.choice.ask({});\n    });\n  });\n});",
    held: ['brain.choice.ask({})'],
    lacked: [],
  },
  {
    description: 'a call in a then, a hook and a useBeforeAll, each deferred',
    content:
      "describeBrainLiveOnDemand('x', () => {\n  const scene = useBeforeAll(async () => spawnSync('claude', ['a']));\n  beforeEach(() => spawnSync('claude', ['b']));\n  then('t', async () => { await brain.choice.ask({}); });\n});",
    held: [],
    lacked: ["spawnSync('claude'", 'brain.choice.ask'],
  },
  {
    description: 'a top-level arrow and a function declaration, run only when called',
    content:
      "const genBrain = () => genBrainRepl({ slug: 'claude/code/haiku' });\nfunction ask() { return brain.choice.ask({}); }\ndescribeBrainLiveOnDemand('x', () => {});",
    held: [],
    lacked: ['genBrainRepl', 'brain.choice.ask'],
  },
  {
    description: 'a title, a path string and a comment, which are data',
    content:
      "describeBrainLiveOnDemand('x', () => {\n  // spawnSync('claude')\n  const probe = join(__dirname, 'probe.cjs');\n  then('a bare claude -p answers', () => {});\n});",
    held: ["join(__dirname, 'probe.cjs')"],
    lacked: ["spawnSync('claude')", 'claude -p'],
  },
  {
    description: 'a callback a run call takes, which may run at once',
    content: "describeBrainLiveOnDemand('x', () => {\n  ['a'].map(() => spawnSync('claude', ['-p']));\n});",
    held: ["spawnSync('claude', ['-p'])"],
    lacked: [],
  },
  {
    description: 'a local wrapper whose callback only registers a useThen',
    content:
      "describeBrainLiveOnDemand('x', () => {\n  const t3 = useWhenLabeled({ label: 't3', fn: () => {\n    const run = useThen('y', async () => spawnSync('claude', ['-p']));\n  } });\n});",
    held: ["useWhenLabeled({ label: 't3', fn: () => {} })"],
    lacked: ["spawnSync('claude'"],
  },
  {
    description: 'a local wrapper whose callback calls at once',
    content:
      "describeBrainLiveOnDemand('x', () => {\n  useWhenLabeled({ label: 't3', fn: () => execFileSync('claude', ['-p']) });\n});",
    held: ["execFileSync('claude', ['-p'])"],
    lacked: [],
  },
  {
    description: 'an iife, whose body runs at once',
    content: "(() => {\n  spawnSync('claude', ['-p']);\n})();\ndescribeBrainLiveOnDemand('x', () => {});",
    held: ["spawnSync('claude', ['-p'])"],
    lacked: [],
  },
  {
    description: 'a type, which runs naught',
    content: "type X = { brain: 'claude -p' };\ndescribeBrainLiveOnDemand('x', () => {});",
    held: [],
    lacked: ['claude -p'],
  },
];

describe('getContentOfSuiteRunAtCollection', () => {
  TEST_CASES.map((thisCase, index) =>
    given(`[case${index + 1}] ${thisCase.description}`, () => {
      when('[t0] the text run at collection is read', () => {
        then('it holds the text jest runs at collection', () => {
          const content = getContentOfSuiteRunAtCollection({ content: thisCase.content });
          thisCase.held.forEach((text) => expect(content).toContain(text));
        });

        then('it lacks the text jest defers', () => {
          const content = getContentOfSuiteRunAtCollection({ content: thisCase.content });
          thisCase.lacked.forEach((text) => expect(content).not.toContain(text));
        });
      });
    }),
  );
});
