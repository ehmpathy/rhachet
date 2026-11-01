import { given, then, when } from 'test-fns';

import {
  CAUSE_SUITE_GATE_ABSENT,
  CAUSE_SUITE_GATE_MIXED,
  CAUSE_SUITE_GATE_TWICE,
  getCauseOfSuiteUngated,
} from './getCauseOfSuiteUngated';

const TEST_CASES: { description: string; content: string; cause: string | null }[] = [
  {
    description: 'one gate, beside imports, declarations, a jest config call and comments',
    content: [
      "import { given } from 'test-fns';",
      "import type { X } from './x';",
      'jest.setTimeout(1);',
      'const MODELS = [',
      "  'haiku',",
      '];',
      'function helperOf() { return 1; }',
      'type T = { a: 1 };',
      '// the live cases',
      "describeBrainLiveOnDemand('live', () => {",
      "  given('x', () => {});",
      '});',
    ].join('\n'),
    cause: null,
  },
  {
    description: 'a gate written in another format, wrapped over lines',
    content: "describeBrainLiveOnDemand(\n  'live',\n  () => {},\n);\n",
    cause: null,
  },
  {
    description: 'no gate at all',
    content: "describe('x', () => {});\n",
    cause: CAUSE_SUITE_GATE_ABSENT,
  },
  {
    description: 'a gate that sits only in a comment',
    content: "// describeBrainLiveOnDemand('live', () => {});\ndescribe('x', () => {});\n",
    cause: CAUSE_SUITE_GATE_ABSENT,
  },
  {
    description: 'a gate nested in an ungated describe',
    content: "describe('x', () => {\n  describeBrainLiveOnDemand('live', () => {});\n});\n",
    cause: CAUSE_SUITE_GATE_ABSENT,
  },
  {
    description: 'two gates',
    content: "describeBrainLiveOnDemand('a', () => {});\ndescribeBrainLiveOnDemand('b', () => {});\n",
    cause: CAUSE_SUITE_GATE_TWICE,
  },
  {
    description: 'a describe beside the gate',
    content: "describe('compute', () => {});\ndescribeBrainLiveOnDemand('live', () => {});\n",
    cause: CAUSE_SUITE_GATE_MIXED,
  },
  {
    description: 'a caselist beside the gate',
    content:
      "const TEST_CASES = [1];\nTEST_CASES.map((c) => given(String(c), () => {}));\ndescribeBrainLiveOnDemand('live', () => {});\n",
    cause: CAUSE_SUITE_GATE_MIXED,
  },
  {
    description: 'a top-level hook beside the gate',
    content: "beforeAll(() => {});\ndescribeBrainLiveOnDemand('live', () => {});\n",
    cause: CAUSE_SUITE_GATE_MIXED,
  },
  {
    description: 'an odd backtick in a comment above an ungated describe',
    content:
      "// a stray ` mark\ndescribe('compute', () => {});\nconst s = `x`;\ndescribeBrainLiveOnDemand('live', () => {});\n",
    cause: CAUSE_SUITE_GATE_MIXED,
  },
  {
    description: 'a template literal whose body sits at column 0',
    content:
      "const SKILL = `\n#!/usr/bin/env bash\ndescribe('not code')\n`;\ndescribeBrainLiveOnDemand('live', () => {});\n",
    cause: null,
  },
];

describe('getCauseOfSuiteUngated', () => {
  TEST_CASES.map((thisCase, index) =>
    given(`[case${index + 1}] ${thisCase.description}`, () => {
      when('[t0] the suite is read', () => {
        then(`it reads ${thisCase.cause === null ? 'wholly gated' : 'ungated, with its cause'}`, () => {
          expect(getCauseOfSuiteUngated({ content: thisCase.content })).toEqual(thisCase.cause);
        });
      });
    }),
  );
});
