import { given, then, when } from 'test-fns';

import { asSnapshotSafe } from './invokeRhachetCliBinary';

/**
 * .what = unit clamp for the path mask inside `asSnapshotSafe`
 *
 * 🚨 .why this file exists at all = `asSnapshotSafe` mediates EVERY blackbox snapshot in
 *   the repo, and it was the one masker in this directory with no clamp — its two siblings
 *   (`asPtySnapshotSafe`, `maskKeyrackGrantVolatiles`) each have one. so a defect in it
 *   moves every acceptance snapshot at once, and no row went red.
 *
 * ⚠️ the subject is the mask's TAIL CLASS — where it decides a path ENDS. that is the whole
 *   contract: a mask that under-consumes leaks a machine-specific path into a snapshot and
 *   the suite flakes per checkout; a mask that OVER-consumes eats the delimiter that proved
 *   the value closed, and the snapshot renders malformed output the producer never emitted.
 *   the second failure is the quiet one — it looks like a defect in the code under test.
 */
describe('asSnapshotSafe path mask', () => {
  given('[case1] a path that ends the way a STACK FRAME ends', () => {
    when('[t0] the frame is masked', () => {
      then('the closing paren survives, so the frame still reads as a frame', () => {
        expect(
          asSnapshotSafe('    at genClone (/home/vlad/git/rhachet/src/x.ts:12:5)'),
        ).toEqual('    at genClone (/PATH_STRIPPED)');
      });

      then('a /Users frame masks the same way', () => {
        expect(
          asSnapshotSafe('    at genClone (/Users/vlad/git/rhachet/src/x.ts:12:5)'),
        ).toEqual('    at genClone (/PATH_STRIPPED)');
      });

      then('a ci runner-work frame masks the same way', () => {
        expect(
          asSnapshotSafe('    at genClone (/runner/work/rhachet/src/x.ts:12:5)'),
        ).toEqual('    at genClone (/PATH_STRIPPED)');
      });
    });
  });

  given('[case2] a path that ends the way PROSE ends', () => {
    when('[t0] the sentence is masked', () => {
      then('the words after the path survive, so the fix still reads', () => {
        expect(
          asSnapshotSafe(
            'the rhx you just ran loaded from /home/vlad/.local/bin/rhx — compare that',
          ),
        ).toEqual('the rhx you just ran loaded from /PATH_STRIPPED — compare that');
      });
    });
  });

  // 🚨 THE CLAMP for the defect this file was written for. the mask's docblock read
  //   *"strip absolute file paths in stack traces"*, and `)` + whitespace ARE the complete
  //   terminator set for a stack trace. then a path arrived as a whole metadata VALUE,
  //   whose terminator is a quote, and the mask consumed `rhx",` — so the acceptance
  //   snapshot pinned `"rhachetRealpath": "/PATH_STRIPPED` with no closing quote and no
  //   comma, inside a block a reader scans as json.
  //
  //   dogfooded by a revert of the implementation: every row below goes RED with `"`
  //   removed from the tail class, and green with it present.
  given('[case3] a path that ends the way a JSON VALUE ends', () => {
    when('[t0] the path is the LAST key in the block', () => {
      const masked = asSnapshotSafe(
        ['{', '  "rhachetRealpath": "/home/vlad/.local/bin/rhx"', '}'].join('\n'),
      );

      then('the closing quote survives', () => {
        expect(masked).toEqual(
          ['{', '  "rhachetRealpath": "/PATH_STRIPPED"', '}'].join('\n'),
        );
      });

      then('the block still parses, so no reader can mistake it for a producer defect', () => {
        // asserted as a real parse rather than a string compare. a snapshot of malformed
        // json reads as a defect in the code under test, which is the whole harm here
        expect(JSON.parse(masked)).toEqual({ rhachetRealpath: '/PATH_STRIPPED' });
      });
    });

    when('[t1] the path key is followed by ANOTHER key', () => {
      const masked = asSnapshotSafe(
        [
          '{',
          '  "rhachetRealpath": "/home/vlad/.local/bin/rhx",',
          '  "hostTuple": "linux-x64"',
          '}',
        ].join('\n'),
      );

      then('the trailing comma survives', () => {
        expect(masked).toContain('"/PATH_STRIPPED",');
      });

      then('the following key survives — an over-consume would erase it', () => {
        // the property that makes this more than cosmetic. the tail class ran to the end
        // of the line, so anything sharing the line with the path was deleted from the
        // snapshot with no row to notice (`rule.forbid.failhide`)
        expect(JSON.parse(masked)).toEqual({
          rhachetRealpath: '/PATH_STRIPPED',
          hostTuple: 'linux-x64',
        });
      });
    });

    when('[t2] the WHOLE frame is masked, as an acceptance case sees it', () => {
      then('the composed frame parses from its own open brace', () => {
        const masked = asSnapshotSafe(
          [
            '💥 MalfunctionError: the reach socket is unavailable',
            '',
            '{',
            '  "hint": "the rhx you just ran loaded from /home/vlad/.local/bin/rhx — compare it",',
            '  "hostTuple": "linux-x64",',
            '  "rhachetRealpath": "/home/vlad/.local/bin/rhx"',
            '}',
          ].join('\n'),
        );
        const block = masked.slice(masked.indexOf('{'));
        expect(JSON.parse(block)).toEqual({
          hint: 'the rhx you just ran loaded from /PATH_STRIPPED — compare it',
          hostTuple: 'linux-x64',
          rhachetRealpath: '/PATH_STRIPPED',
        });
      });
    });
  });

  given('[case4] a path that must still be MASKED, so the fix cannot under-consume', () => {
    when('[t0] a machine-specific path reaches the mask', () => {
      then('no home directory name survives into a snapshot', () => {
        // the mask exists to keep a checkout-specific path out of a pinned artifact. a
        // tail class narrowed too far would leak it, and the suite would flake per machine
        expect(asSnapshotSafe('"at": "/home/vlad/git/rhachet/src/x.ts"')).not.toContain(
          'vlad',
        );
      });

      then('a path with no terminator at all is masked to its end', () => {
        expect(asSnapshotSafe('/home/vlad/git/rhachet')).toEqual('/PATH_STRIPPED');
      });
    });
  });

  given('[case5] the two volatile spans a BOOT CENSUS line carries', () => {
    // 🚨 .why = these two spans are masked HERE and were clamped NOWHERE. seven
    //   acceptance call sites wrapped this mask as `maskBootCensusVolatiles(asSnapshotSafe(x))`
    //   and read that outer call as a safety net — but it was provably inert: its regex ends
    //   in a literal `\d+ chars`, which cannot match the `__CHARS__ chars` this mask has
    //   already written, so the ENTIRE replace failed rather than merely its path clause.
    //
    // ⚠️ a net that cannot catch is worse than an absent one — it reads as protection and
    //   guards naught (`rule.require.clamp-edge-cases`). the composition is gone; these rows
    //   are what replaced it, and unlike the net they go RED when this mask stops.
    when('[t0] a census char count reaches the mask', () => {
      then('the count is masked, and the role count beside it survives', () => {
        // the role count is the part a reader checks; only the char sum is volatile,
        // since it moves with every role package bump
        expect(
          asSnapshotSafe('boot.md (default): /x/boot.md — 2 roles, 48173 chars'),
        ).toEqual('boot.md (default): /x/boot.md — 2 roles, __CHARS__ chars');
      });

      then('a SINGULAR role reads the same way, so both census forms clamp', () => {
        expect(asSnapshotSafe('— 1 role, 512 chars')).toEqual(
          '— 1 role, __CHARS__ chars',
        );
      });
    });

    when('[t1] a per-run temp repo root reaches the mask', () => {
      then('the root is masked, and the path below it survives', () => {
        // the path below the root names WHICH file the census reports on, so it is the
        // half a reader is owed — a mask that ate it would pin a census of no file
        expect(
          asSnapshotSafe('/tmp/rhachet-test-a1b2c3/.agent/.actors/x/boot.md'),
        ).toEqual('/TMP_REPO/.agent/.actors/x/boot.md');
      });
    });
  });

  given('[case6] the HUMAN OWN home `.claude` root, beside incidental host paths', () => {
    // 🚨 .why = an enroll config's `claudeMdExcludes` array renders five entries rooted at
    //   `/TMP_TEST_DIR/...` and one bare `/PATH_STRIPPED` between them. both tokens were
    //   correct and the array still failed its one job: a reader could not tell a genuinely
    //   different root from one per-run root stamped two ways, without a read of the source.
    //   one vocabulary per concept is the repair (`rule.forbid.ambiguous-labels`), and these
    //   rows are what keeps the home mask from a silent fall back to the catch-all.
    when('[t0] the human own claude config root reaches the mask', () => {
      then('the root is named, and the path below it survives', () => {
        expect(asSnapshotSafe('/home/vlad/.claude/CLAUDE.md')).toEqual(
          '/HOME_DIR/.claude/CLAUDE.md',
        );
      });

      then('a darwin home reads the same way, so both host shapes clamp', () => {
        expect(asSnapshotSafe('/Users/vlad/.claude/rules/**')).toEqual(
          '/HOME_DIR/.claude/rules/**',
        );
      });

      then('the catch-all token is NOT what it renders', () => {
        // the whole point of the mask: the generic `/PATH_STRIPPED` names no root, so a
        // fall-through here would restore the ambiguity this case exists to close
        expect(asSnapshotSafe('/home/vlad/.claude/CLAUDE.md')).not.toContain(
          'PATH_STRIPPED',
        );
      });
    });

    when('[t1] an INCIDENTAL host path reaches the mask', () => {
      then('it still renders the catch-all, so the new mask does not over-reach', () => {
        // a host path with no `.claude` segment is incidental — its root tells a reader
        // naught they need, so a token that named one would over-claim
        expect(asSnapshotSafe('/home/vlad/git/rhachet/src/x.ts')).toEqual(
          '/PATH_STRIPPED',
        );
      });

      then('a `.claude` segment that is NOT at the home root is incidental too', () => {
        // the mask is anchored on `.claude` as the FIRST segment below the home dir. a
        // `.claude` nested deeper belongs to a repo, not to the human, so it falls through
        expect(asSnapshotSafe('/home/vlad/git/rhachet/.claude/CLAUDE.md')).toEqual(
          '/PATH_STRIPPED',
        );
      });
    });
  });

  /**
   * .what = the stamp in a `.bak` filename, which carries DASHES where the iso mask
   *   demands colons
   *
   * 🔴 .why = a filename cannot hold a colon, so the backup a role init writes reads
   *   `settings.2026-09-25T17-41-02Z.bak.json`. the iso mask beside it demands
   *   `\d{2}:\d{2}:\d{2}`, so it never touched this form — and every brain-dir tree
   *   snapshot that reports a moved backup pinned a raw wallclock, flaky by construction
   *   on the next run (`rule.require.clamp-edge-cases`). the file already carries this
   *   same dash-vs-colon note for the `test-fns` root; this is its second instance, so
   *   the class is real rather than a one-off
   */
  given('[case7] a `.bak` filename stamp, written with dashes', () => {
    when('[t0] a moved backup row reaches the mask', () => {
      then('the stamp is masked, and the name around it survives', () => {
        // the name around it is the half a reader is owed: WHICH file moved, and that it
        // was a backup rather than the live settings
        expect(
          asSnapshotSafe(
            '.claude/settings.2026-09-25T17-41-02Z.bak.json → x/settings.2026-09-25T17-41-02Z.bak.json',
          ),
        ).toEqual('.claude/settings.$STAMP.bak.json → x/settings.$STAMP.bak.json');
      });

      then('a stamp WITH millis masks too', () => {
        // iso-time omits `.000` on a whole second, so both forms reach a filename
        expect(
          asSnapshotSafe('settings.2026-09-25T17-41-02.123Z.bak.json'),
        ).toEqual('settings.$STAMP.bak.json');
      });

      then('no raw wallclock survives, which is the whole claim', () => {
        expect(
          asSnapshotSafe('settings.2026-09-25T17-41-02Z.bak.json'),
        ).not.toMatch(/\d{2}-\d{2}-\d{2}Z/);
      });
    });

    when('[t1] a dash-stamp that is NOT a backup name reaches the mask', () => {
      then('it is left alone, so the mask cannot over-reach', () => {
        // the lookahead anchors on `.bak.`. a dash-stamp elsewhere — a transcript name, an
        // enrollment log field — is a span a reader may be owed, so it must fall through
        expect(asSnapshotSafe('history/2026-09-25T17-41-02Z.jsonl')).toEqual(
          'history/2026-09-25T17-41-02Z.jsonl',
        );
      });
    });

    /**
     * 🔴 .why = the measured flake. two role inits each back settings.json up under a
     *   seconds-grain stamp, so the moved tree held ONE backup row when both inits landed
     *   in one second and TWO when a second boundary fell between them. once masked, the
     *   two rows were identical and only their count varied with the wall clock
     */
    when('[t2] two backups straddle a second boundary', () => {
      const oneBackup = [
        '   │  ├─ .claude/settings.2026-10-01T07-18-22Z.bak.json → x/settings.2026-10-01T07-18-22Z.bak.json',
        '   │  └─ .claude/settings.json → x/settings.json',
      ].join('\n');
      const twoBackups = [
        '   │  ├─ .claude/settings.2026-10-01T07-18-22Z.bak.json → x/settings.2026-10-01T07-18-22Z.bak.json',
        '   │  ├─ .claude/settings.2026-10-01T07-18-23Z.bak.json → x/settings.2026-10-01T07-18-23Z.bak.json',
        '   │  └─ .claude/settings.json → x/settings.json',
      ].join('\n');

      then('both runs mask to the same tree', () => {
        expect(asSnapshotSafe(twoBackups)).toEqual(asSnapshotSafe(oneBackup));
      });

      then('one backup row survives, so the move is still reported', () => {
        expect(asSnapshotSafe(twoBackups)).toContain(
          '.claude/settings.$STAMP.bak.json → x/settings.$STAMP.bak.json',
        );
      });
    });

    when('[t3] identical rows that carry no stamp reach the mask', () => {
      then('they are left alone, so only the clock-owned count collapses', () => {
        expect(asSnapshotSafe('   ├─ same\n   ├─ same')).toEqual(
          '   ├─ same\n   ├─ same',
        );
      });
    });
  });
});
