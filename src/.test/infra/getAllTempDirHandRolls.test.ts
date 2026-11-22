import { given, then, when } from 'test-fns';

import {
  asTempDirHandRollsReport,
  getAllTempDirHandRolls,
  TEMP_DIR_EXEMPT_MARKER,
} from './getAllTempDirHandRolls';

describe('getAllTempDirHandRolls', () => {
  given('[case1] a test file that hand-rolls a temp dir', () => {
    when('[t0] each forbidden form appears', () => {
      const found = getAllTempDirHandRolls({
        files: [
          {
            path: 'a.test.ts',
            content: [
              "const a = mkdtempSync(join(tmpdir(), 'x-'));",
              "const b = mkdtempSync('/tmp/kdp-');",
              "const c = join(os.tmpdir(), 'y');",
              "const d = withTempHome({ name: 'z' });",
              'const e = `/tmp/keyrack-fill-test-${process.pid}`;',
              "const f = { path: '/tmp/mock-input.txt' };",
              'const g = `/tmp/keyrack-${process.pid}.sock`;',
              "const h = join('/tmp', `rhachet-test-${Date.now()}`);",
              "const i = '/tmp/x-' + Date.now();",
              "import { tmpdir as t } from 'node:os';",
              "const j = join('/tmp/keyrack', `x-${Date.now()}`);",
              "const k = join('/tmp/mock-input.txt');",
            ].join('\n'),
          },
        ],
      });

      then('every form is found, at its line — never a mock path or a socket file', () => {
        expect(found.map(({ line, form }) => `${line}:${form}`)).toEqual([
          '1:mkdtemp',
          '1:tmpdir()',
          '2:mkdtemp',
          '3:tmpdir()',
          '4:withTempHome',
          "5:minted '/tmp/' path",
          "8:'/tmp' root",
          "9:concatenated '/tmp/' path",
          '10:aliased tmpdir',
          "11:'/tmp/...' root",
        ]);
      });
    });
  });

  given('[case2] a test file that allocates via genTempDir', () => {
    when('[t0] it is scanned', () => {
      const found = getAllTempDirHandRolls({
        files: [
          {
            path: 'b.test.ts',
            content: "const dir = genTempDirPhysical({ slug: 'ok' });",
          },
        ],
      });

      then('naught is found', () => {
        expect(found).toEqual([]);
      });
    });
  });

  given('[case3] a socket runtime dir under the exempt marker', () => {
    when('[t0] the marker sits directly above the allocation', () => {
      const found = getAllTempDirHandRolls({
        files: [
          {
            path: 'c.test.ts',
            content: [
              `// ${TEMP_DIR_EXEMPT_MARKER} unix socket path cap (~108 bytes)`,
              "const runtimeDir = mkdtempSync('/tmp/kdp-');",
            ].join('\n'),
          },
        ],
      });

      then('it is exempt', () => {
        expect(found).toEqual([]);
      });
    });

    when('[t1] the marker sits two lines above', () => {
      const found = getAllTempDirHandRolls({
        files: [
          {
            path: 'd.test.ts',
            content: [
              `// ${TEMP_DIR_EXEMPT_MARKER} unix socket path cap (~108 bytes)`,
              '',
              "const runtimeDir = mkdtempSync('/tmp/kdp-');",
            ].join('\n'),
          },
        ],
      });

      then('it is NOT exempt — the marker binds only the next line', () => {
        expect(found.map(({ line }) => line)).toEqual([3]);
      });
    });
  });

  given('[case5] an exempt marker that names no sanctioned reason', () => {
    when('[t0] the reason is not one of the three', () => {
      const found = getAllTempDirHandRolls({
        files: [
          {
            path: 'f.test.ts',
            content: [
              `// ${TEMP_DIR_EXEMPT_MARKER} it was easier`,
              "const dir = mkdtempSync(join(tmpdir(), 'x-'));",
            ].join('\n'),
          },
        ],
      });

      then('the marker is a hit, and it exempts naught', () => {
        expect(found.map(({ line, form }) => `${line}:${form}`)).toEqual([
          '1:exempt marker without a sanctioned reason',
          '2:mkdtemp',
          '2:tmpdir()',
        ]);
      });
    });

    when('[t1] the reason is empty', () => {
      const found = getAllTempDirHandRolls({
        files: [
          {
            path: 'g.test.ts',
            content: [
              `// ${TEMP_DIR_EXEMPT_MARKER}`,
              "const runtimeDir = mkdtempSync('/tmp/kdp-');",
            ].join('\n'),
          },
        ],
      });

      then('the marker is a hit, and it exempts naught', () => {
        expect(found.map(({ line, form }) => `${line}:${form}`)).toEqual([
          '1:exempt marker without a sanctioned reason',
          '2:mkdtemp',
        ]);
      });
    });
  });

  given('[case6] text that only looks like a declaration', () => {
    when('[t0] a block comment names a forbidden form', () => {
      const found = getAllTempDirHandRolls({
        files: [
          {
            path: 'h.test.ts',
            content: '/* prefer genTempDir over join(tmpdir(), ...) */',
          },
        ],
      });

      then('naught is found', () => {
        expect(found).toEqual([]);
      });
    });

    when('[t1] the marker sits inside a string literal above a hand-roll', () => {
      const found = getAllTempDirHandRolls({
        files: [
          {
            path: 'i.test.ts',
            content: [
              `const note = '${TEMP_DIR_EXEMPT_MARKER} unix socket path cap';`,
              "const dir = mkdtempSync('/tmp/x-');",
            ].join('\n'),
          },
        ],
      });

      then('the string exempts naught, and is no hit of its own', () => {
        expect(found.map(({ line, form }) => `${line}:${form}`)).toEqual([
          '2:mkdtemp',
        ]);
      });
    });
  });

  given('[case7] the report a contributor meets', () => {
    when('[t0] there are hits', () => {
      const report = asTempDirHandRollsReport({
        found: getAllTempDirHandRolls({
          files: [
            {
              path: 'blackbox/cli/x.acceptance.test.ts',
              content: "const dir = mkdtempSync(join(tmpdir(), 'x-'));",
            },
          ],
        }),
      });

      then('it names each hit and the fix', () => {
        // the properties in words, then the shape: a re-snap alone cannot make a drift go green
        expect(report).toContain('✋ ConstraintError: 2 hand-rolled test temp dir(s)');
        expect(report).toContain('blackbox/cli/x.acceptance.test.ts:1 [mkdtemp]');
        expect(report).toContain('blackbox/cli/x.acceptance.test.ts:1 [tmpdir()]');
        expect(report).toContain('fix: allocate via genTempDir');
        expect(report).toContain('`// .tempdir.exempt = <reason>`');
        expect(report).toMatchSnapshot();
      });
    });

    when('[t1] there are none', () => {
      then('it is empty', () => {
        expect(asTempDirHandRollsReport({ found: [] })).toEqual('');
      });
    });
  });

  given('[case4] prose that names a forbidden form', () => {
    when('[t0] it sits in a comment', () => {
      const found = getAllTempDirHandRolls({
        files: [
          {
            path: 'e.test.ts',
            content: [
              '// never mkdtempSync(join(tmpdir(), ...)) here',
              ' * nor withTempHome',
            ].join('\n'),
          },
        ],
      });

      then('naught is found', () => {
        expect(found).toEqual([]);
      });
    });
  });
});
