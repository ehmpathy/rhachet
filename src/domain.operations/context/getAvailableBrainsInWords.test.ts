import { given, then, when } from 'test-fns';

import { genMockedBrainAtom } from '@src/.test.assets/genMockedBrainAtom';
import { genMockedBrainRepl } from '@src/.test.assets/genMockedBrainRepl';

import { getAvailableBrainsInWords } from './getAvailableBrainsInWords';

describe('getAvailableBrainsInWords', () => {
  given('[case1] atoms and repls available', () => {
    const atoms = [
      genMockedBrainAtom({ repo: 'openai', slug: 'gpt-4o-mini' }),
      genMockedBrainAtom({ repo: 'xai', slug: 'grok-3-fast' }),
    ];
    const repls = [
      genMockedBrainRepl({ repo: 'anthropic', slug: 'claude-code' }),
      genMockedBrainRepl({ repo: 'openai', slug: 'codex' }),
    ];

    when('[t0] formatted with choice', () => {
      then('output has 🔭 header', () => {
        const result = getAvailableBrainsInWords({
          atoms,
          repls,
          choice: 'test/choice',
        });
        expect(result).toContain('🔭 available brains');
      });

      then('repls use ↻ symbol', () => {
        const result = getAvailableBrainsInWords({
          atoms,
          repls,
          choice: 'test/choice',
        });
        expect(result).toContain('↻ anthropic/claude-code');
        expect(result).toContain('↻ openai/codex');
      });

      then('atoms use ○ symbol', () => {
        const result = getAvailableBrainsInWords({
          atoms,
          repls,
          choice: 'test/choice',
        });
        expect(result).toContain('○ openai/gpt-4o-mini');
        expect(result).toContain('○ xai/grok-3-fast');
      });

      then('uses ├── for non-last entries', () => {
        const result = getAvailableBrainsInWords({
          atoms,
          repls,
          choice: 'test/choice',
        });
        expect(result).toContain('├──');
      });

      then('uses └── for last entry', () => {
        const result = getAvailableBrainsInWords({
          atoms,
          repls,
          choice: 'test/choice',
        });
        expect(result).toContain('└──');
      });

      then('has 3-space indent under header', () => {
        const result = getAvailableBrainsInWords({
          atoms,
          repls,
          choice: 'test/choice',
        });
        const lines = result.split('\n');
        const entryLines = lines.filter(
          (line) => line.includes('├──') || line.includes('└──'),
        );
        entryLines.forEach((line) => {
          expect(line.startsWith('   ')).toBe(true);
        });
      });
    });
  });

  given('[case2] empty atoms and repls', () => {
    when('[t0] formatted', () => {
      then('output shows "(none)"', () => {
        const result = getAvailableBrainsInWords({
          atoms: [],
          repls: [],
          choice: 'test/choice',
        });
        expect(result).toContain('(none)');
      });
    });
  });

  given('[case3] single brain available', () => {
    const atoms = [genMockedBrainAtom({ repo: 'openai', slug: 'gpt-4o' })];

    when('[t0] formatted', () => {
      then('uses └── connector (last item)', () => {
        const result = getAvailableBrainsInWords({
          atoms,
          repls: [],
          choice: 'test/choice',
        });
        expect(result).toContain('└── ○ openai/gpt-4o');
        expect(result).not.toContain('├──');
      });
    });
  });

  given('[case4] choice with typo', () => {
    const repls = [
      genMockedBrainRepl({ repo: 'anthropic', slug: 'claude-code' }),
      genMockedBrainRepl({ repo: 'openai', slug: 'codex' }),
    ];

    when('[t0] typo "antrhopic/cloude-code" used as choice', () => {
      then('most similar brain appears first', () => {
        const result = getAvailableBrainsInWords({
          atoms: [],
          repls,
          choice: 'antrhopic/cloude-code',
        });
        const lines = result.split('\n');
        const firstEntryLine = lines.find(
          (line) => line.includes('├──') || line.includes('└──'),
        );
        expect(firstEntryLine).toContain('anthropic/claude-code');
      });
    });
  });

  given('[case5] exactly 21 brains', () => {
    const atoms = Array.from({ length: 21 }, (_, i) =>
      genMockedBrainAtom({ repo: 'repo', slug: `atom-${i}` }),
    );

    when('[t0] formatted', () => {
      then('all 21 shown', () => {
        const result = getAvailableBrainsInWords({
          atoms,
          repls: [],
          choice: 'test/choice',
        });
        for (let i = 0; i < 21; i++) {
          expect(result).toContain(`atom-${i}`);
        }
      });

      then('no truncation indicator', () => {
        const result = getAvailableBrainsInWords({
          atoms,
          repls: [],
          choice: 'test/choice',
        });
        expect(result).not.toContain('and');
        expect(result).not.toContain('more');
      });
    });
  });

  given('[case6] more than 21 brains', () => {
    const atoms = Array.from({ length: 25 }, (_, i) =>
      genMockedBrainAtom({ repo: 'repo', slug: `atom-${i}` }),
    );

    when('[t0] formatted', () => {
      then('only 21 brains listed', () => {
        const result = getAvailableBrainsInWords({
          atoms,
          repls: [],
          choice: 'test/choice',
        });
        const entryLines = result
          .split('\n')
          .filter(
            (line) =>
              (line.includes('├──') || line.includes('└──')) &&
              !line.includes('(and '),
          );
        expect(entryLines.length).toBe(21);
      });

      then('shows truncation indicator', () => {
        const result = getAvailableBrainsInWords({
          atoms,
          repls: [],
          choice: 'test/choice',
        });
        expect(result).toContain('(and 4 more)');
      });
    });
  });

  given('[case7] atoms-only list', () => {
    const atoms = [
      genMockedBrainAtom({ repo: 'openai', slug: 'gpt-4o' }),
      genMockedBrainAtom({ repo: 'xai', slug: 'grok-3' }),
    ];

    when('[t0] formatted', () => {
      then('only ○ symbols appear', () => {
        const result = getAvailableBrainsInWords({
          atoms,
          repls: [],
          choice: 'test/choice',
        });
        expect(result).toContain('○');
        expect(result).not.toContain('↻');
      });
    });
  });

  given('[case8] repls-only list', () => {
    const repls = [
      genMockedBrainRepl({ repo: 'anthropic', slug: 'claude-code' }),
      genMockedBrainRepl({ repo: 'openai', slug: 'codex' }),
    ];

    when('[t0] formatted', () => {
      then('only ↻ symbols appear', () => {
        const result = getAvailableBrainsInWords({
          atoms: [],
          repls,
          choice: 'test/choice',
        });
        expect(result).toContain('↻');
        expect(result).not.toContain('○');
      });
    });
  });

  given('[case9] snapshot observability', () => {
    const atoms = [
      genMockedBrainAtom({ repo: 'openai', slug: 'gpt-4o-mini' }),
      genMockedBrainAtom({ repo: 'xai', slug: 'grok-3-fast' }),
    ];
    const repls = [
      genMockedBrainRepl({ repo: 'anthropic', slug: 'claude-code' }),
      genMockedBrainRepl({ repo: 'openai', slug: 'codex' }),
    ];

    when('[t0] formatted with typo choice', () => {
      then('output matches snapshot', () => {
        const result = getAvailableBrainsInWords({
          atoms,
          repls,
          choice: 'antrhopic/cloude-code',
        });
        expect(result).toMatchSnapshot();
      });
    });
  });
});
