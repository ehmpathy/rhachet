import { MalfunctionError } from 'helpful-errors';
import { getError, given, then, when } from 'test-fns';

import { parseRoleBootYaml } from './parseRoleBootYaml';

describe('parseRoleBootYaml', () => {
  given('[case1] valid simple mode yaml', () => {
    when('[t0] briefs.say and skills.say are present', () => {
      const content = `
briefs:
  say:
    - practices/**/*.md
    - glossary.md
  ref:
    - archive/**/*.md

skills:
  say:
    - git.commit/**/*.sh
`;

      then('parses successfully with mode simple', () => {
        const result = parseRoleBootYaml({
          content,
          path: 'boot.yml',
        });
        expect(result).not.toBeNull();
        expect(result?.mode).toEqual('simple');
      });

      then('briefs.say contains the globs', () => {
        const result = parseRoleBootYaml({ content, path: 'boot.yml' });
        if (result?.mode !== 'simple')
          throw new MalfunctionError('expected simple');
        expect(result.briefs?.say).toEqual([
          'practices/**/*.md',
          'glossary.md',
        ]);
      });

      then('briefs.ref contains the globs', () => {
        const result = parseRoleBootYaml({ content, path: 'boot.yml' });
        if (result?.mode !== 'simple')
          throw new MalfunctionError('expected simple');
        expect(result.briefs?.ref).toEqual(['archive/**/*.md']);
      });

      then('skills.say contains the globs', () => {
        const result = parseRoleBootYaml({ content, path: 'boot.yml' });
        if (result?.mode !== 'simple')
          throw new MalfunctionError('expected simple');
        expect(result.skills?.say).toEqual(['git.commit/**/*.sh']);
      });
    });

    when('[t1] only briefs is present', () => {
      const content = `
briefs:
  say:
    - core.md
`;

      then('parses successfully with skills as null', () => {
        const result = parseRoleBootYaml({ content, path: 'boot.yml' });
        expect(result).not.toBeNull();
        expect(result?.mode).toEqual('simple');
        if (result?.mode !== 'simple')
          throw new MalfunctionError('expected simple');
        expect(result.skills).toBeNull();
      });
    });

    when('[t2] empty briefs object', () => {
      const content = `
briefs: {}
`;

      then('parses successfully with say null (absent) and ref empty', () => {
        const result = parseRoleBootYaml({ content, path: 'boot.yml' });
        expect(result).not.toBeNull();
        expect(result?.mode).toEqual('simple');
        if (result?.mode !== 'simple')
          throw new MalfunctionError('expected simple');
        // say: null means say key was absent -> say all; handled in computeBootPlan
        expect(result.briefs?.say).toBeNull();
        expect(result.briefs?.ref).toEqual([]);
      });
    });

    when('[t3] briefs with only ref array', () => {
      const content = `
briefs:
  ref:
    - archive.md
`;

      then('parses successfully with say as null (absent)', () => {
        const result = parseRoleBootYaml({ content, path: 'boot.yml' });
        expect(result).not.toBeNull();
        if (result?.mode !== 'simple')
          throw new MalfunctionError('expected simple');
        // say key absent -> null -> means "say all"
        expect(result.briefs?.say).toBeNull();
        expect(result.briefs?.ref).toEqual(['archive.md']);
      });
    });

    when('[t4] briefs with empty say array', () => {
      const content = `
briefs:
  say: []
`;

      then(
        'parses successfully with say as empty array (means say none)',
        () => {
          const result = parseRoleBootYaml({ content, path: 'boot.yml' });
          expect(result).not.toBeNull();
          if (result?.mode !== 'simple')
            throw new MalfunctionError('expected simple');
          // say key present but empty -> [] -> means "say none"
          expect(result.briefs?.say).toEqual([]);
          expect(result.briefs?.ref).toEqual([]);
        },
      );
    });
  });

  given('[case2] valid subject mode yaml', () => {
    when('[t0] always and subjects are present', () => {
      const content = `
always:
  briefs:
    say:
      - core.md
    ref:
      - glossary.md
  skills:
    say:
      - commit.sh

subject.test:
  briefs:
    say:
      - test-rules.md
  skills:
    say:
      - test-runner.sh

subject.prod:
  briefs:
    say:
      - prod-rules.md
`;

      then('parses successfully with mode subject', () => {
        const result = parseRoleBootYaml({ content, path: 'boot.yml' });
        expect(result).not.toBeNull();
        expect(result?.mode).toEqual('subject');
      });

      then('always.briefs is parsed correctly', () => {
        const result = parseRoleBootYaml({ content, path: 'boot.yml' });
        if (result?.mode !== 'subject')
          throw new MalfunctionError('expected subject');
        expect(result.always?.briefs?.say).toEqual(['core.md']);
        expect(result.always?.briefs?.ref).toEqual(['glossary.md']);
      });

      then('always.skills is parsed correctly', () => {
        const result = parseRoleBootYaml({ content, path: 'boot.yml' });
        if (result?.mode !== 'subject')
          throw new MalfunctionError('expected subject');
        expect(result.always?.skills?.say).toEqual(['commit.sh']);
      });

      then('subjects are parsed correctly', () => {
        const result = parseRoleBootYaml({ content, path: 'boot.yml' });
        if (result?.mode !== 'subject')
          throw new MalfunctionError('expected subject');
        expect(result.subjects.test?.briefs?.say).toEqual(['test-rules.md']);
        expect(result.subjects.test?.skills?.say).toEqual(['test-runner.sh']);
        expect(result.subjects.prod?.briefs?.say).toEqual(['prod-rules.md']);
      });
    });

    when('[t1] only subjects without always', () => {
      const content = `
subject.test:
  briefs:
    say:
      - test.md
`;

      then('parses successfully with always as null', () => {
        const result = parseRoleBootYaml({ content, path: 'boot.yml' });
        expect(result).not.toBeNull();
        expect(result?.mode).toEqual('subject');
        if (result?.mode !== 'subject')
          throw new MalfunctionError('expected subject');
        expect(result.always).toBeNull();
        expect(result.subjects.test?.briefs?.say).toEqual(['test.md']);
      });
    });

    when('[t2] only always without subjects', () => {
      const content = `
always:
  briefs:
    say:
      - core.md
`;

      then('parses successfully with empty subjects', () => {
        const result = parseRoleBootYaml({ content, path: 'boot.yml' });
        expect(result).not.toBeNull();
        expect(result?.mode).toEqual('subject');
        if (result?.mode !== 'subject')
          throw new MalfunctionError('expected subject');
        expect(result.always?.briefs?.say).toEqual(['core.md']);
        expect(Object.keys(result.subjects)).toEqual([]);
      });
    });
  });

  given('[case3] null or empty content', () => {
    when('[t0] content is empty string', () => {
      then('returns null', () => {
        const result = parseRoleBootYaml({ content: '', path: 'boot.yml' });
        expect(result).toBeNull();
      });
    });

    when('[t1] content is null yaml', () => {
      then('returns null', () => {
        const result = parseRoleBootYaml({
          content: 'null',
          path: 'boot.yml',
        });
        expect(result).toBeNull();
      });
    });

    when('[t2] content is whitespace only', () => {
      then('returns null', () => {
        const result = parseRoleBootYaml({
          content: '   \n   ',
          path: 'boot.yml',
        });
        expect(result).toBeNull();
      });
    });
  });

  given('[case4] invalid yaml syntax', () => {
    when('[t0] content has invalid yaml', () => {
      const content = `
briefs:
  say:
    - valid
  this is not valid yaml
`;

      then('throws ConstraintError', () => {
        expect(() => parseRoleBootYaml({ content, path: 'boot.yml' })).toThrow(
          'boot.yml has invalid yaml',
        );
      });
    });
  });

  given('[case5] invalid schema', () => {
    when('[t0] briefs.say is not an array', () => {
      const content = `
briefs:
  say: not-an-array
`;

      then('throws ConstraintError', () => {
        expect(() => parseRoleBootYaml({ content, path: 'boot.yml' })).toThrow(
          'boot.yml has invalid schema',
        );
      });
    });

    when('[t1] subject value is not an object', () => {
      const content = `
subject.test: not-an-object
`;

      then('throws ConstraintError', () => {
        expect(() => parseRoleBootYaml({ content, path: 'boot.yml' })).toThrow(
          'boot.yml has invalid schema',
        );
      });
    });
  });

  given('[case6] mixed mode detection', () => {
    when('[t0] has both briefs and always', () => {
      const content = `
briefs:
  say:
    - core.md

always:
  briefs:
    say:
      - core.md
`;

      then('throws ConstraintError for mixed mode', () => {
        expect(() => parseRoleBootYaml({ content, path: 'boot.yml' })).toThrow(
          'mixed mode not allowed',
        );
      });
    });

    when('[t1] has both skills and subject.test', () => {
      const content = `
skills:
  say:
    - test.sh

subject.test:
  briefs:
    say:
      - test.md
`;

      then('throws ConstraintError for mixed mode', () => {
        expect(() => parseRoleBootYaml({ content, path: 'boot.yml' })).toThrow(
          'mixed mode not allowed',
        );
      });
    });
  });

  given('[case7] none mode detection', () => {
    when('[t0] content has unrelated keys only', () => {
      const content = `
version: 1.0
author: test
`;

      then('returns null (none mode)', () => {
        const result = parseRoleBootYaml({ content, path: 'boot.yml' });
        expect(result).toBeNull();
      });
    });
  });

  given('[case8] a declared budget, in simple mode', () => {
    when('[t0] budget.tokens sits beside briefs', () => {
      const content = `
budget:
  tokens: 5000

briefs:
  say:
    - core.md
`;

      then(
        'the mode is still simple — budget is a modifier, never a mode',
        () => {
          const result = parseRoleBootYaml({ content, path: 'boot.yml' });
          expect(result?.mode).toEqual('simple');
        },
      );

      // the clamp: `budget` is part of the resolved object shape, so a declared cap
      // reaches the spec rather than an accepted-but-ungated silence
      then('the budget is resolved onto the spec', () => {
        const result = parseRoleBootYaml({ content, path: 'boot.yml' });
        if (result?.mode !== 'simple')
          throw new MalfunctionError('expected simple');
        expect(result.budget).toEqual({ tokens: 5000 });
      });
    });

    when('[t1] no budget is declared', () => {
      const content = `
briefs:
  say:
    - core.md
`;

      then('the budget resolves to null — renders as it does today', () => {
        const result = parseRoleBootYaml({ content, path: 'boot.yml' });
        if (result?.mode !== 'simple')
          throw new MalfunctionError('expected simple');
        expect(result.budget).toBeNull();
      });
    });

    // 🔴 yaml has no digit separator, so `5_000` and `5,000` each arrive as a STRING.
    // every doc here writes a thousands group that way, `0.wish.md`'s own example
    // among them, so a refusal would refuse the declared contract
    when('[t2] tokens is written with a digit separator', () => {
      then('an underscore group resolves to its number', () => {
        const result = parseRoleBootYaml({
          content: 'budget:\n  tokens: 5_000\nbriefs:\n  say:\n    - core.md\n',
          path: 'boot.yml',
        });
        if (result?.mode !== 'simple')
          throw new MalfunctionError('expected simple');
        expect(result.budget).toEqual({ tokens: 5000 });
      });

      then('a comma group resolves to the same number', () => {
        const result = parseRoleBootYaml({
          content: 'budget:\n  tokens: 5,000\nbriefs:\n  say:\n    - core.md\n',
          path: 'boot.yml',
        });
        if (result?.mode !== 'simple')
          throw new MalfunctionError('expected simple');
        expect(result.budget).toEqual({ tokens: 5000 });
      });
    });
  });

  given('[case9] a declared budget, in subject mode', () => {
    when('[t0] budget.tokens sits beside always and subject.*', () => {
      const content = `
budget:
  tokens: 12000

always:
  briefs:
    say:
      - core.md

subject.review:
  briefs:
    say:
      - review/**/*.md
`;

      then('the mode is still subject', () => {
        const result = parseRoleBootYaml({ content, path: 'boot.yml' });
        expect(result?.mode).toEqual('subject');
      });

      // the sharper half of the clamp: the subject schema carries
      // `.catchall(schemaSubjectSection)`, which would otherwise parse an unnamed
      // `budget` AS a subject section — its `tokens` key dropped by the non-strict
      // object, the section validated as empty, then discarded by the `subject.`
      // prefix filter
      then('the budget is resolved, never swallowed by the catchall', () => {
        const result = parseRoleBootYaml({ content, path: 'boot.yml' });
        if (result?.mode !== 'subject')
          throw new MalfunctionError('expected subject');
        expect(result.budget).toEqual({ tokens: 12000 });
      });

      then('budget does NOT appear as a subject', () => {
        const result = parseRoleBootYaml({ content, path: 'boot.yml' });
        if (result?.mode !== 'subject')
          throw new MalfunctionError('expected subject');
        expect(Object.keys(result.subjects)).toEqual(['review']);
      });
    });
  });

  given('[case10] a malformed budget', () => {
    // budget: 0 is refused because it cannot be MET — the gate counts the full
    // emitted payload, so xml chrome alone is nonzero. a ref-only boot is declared
    // with `say: []` plus a chrome-sized cap, never with 0
    when('[t0] tokens is 0', () => {
      const content = `
budget:
  tokens: 0
briefs:
  say:
    - core.md
`;
      then('it throws', () => {
        expect(() =>
          parseRoleBootYaml({ content, path: 'boot.yml' }),
        ).toThrow();
      });
    });

    when('[t1] tokens is negative', () => {
      const content = `
budget:
  tokens: -1
briefs:
  say:
    - core.md
`;
      then('it throws', () => {
        expect(() =>
          parseRoleBootYaml({ content, path: 'boot.yml' }),
        ).toThrow();
      });
    });

    // 🔴 the fixture is a NON-DIGIT string on purpose. a digit-run string (`"5000"`)
    // is now valid — yaml has no separator, so `tokens: 5_000` arrives as a string and
    // `asNumberFromDigitGroups` casts it. a fixture that reads as a number no longer
    // exercises the malformed case at all
    when('[t2] tokens is a string that names no number', () => {
      const content = `
budget:
  tokens: "five thousand"
briefs:
  say:
    - core.md
`;
      then('it throws', () => {
        expect(() =>
          parseRoleBootYaml({ content, path: 'boot.yml' }),
        ).toThrow();
      });
    });

    when('[t4] tokens is a digit run with a unit suffix', () => {
      const content = `
budget:
  tokens: 5k
briefs:
  say:
    - core.md
`;
      then('it throws — a suffix is not a separator', () => {
        expect(() =>
          parseRoleBootYaml({ content, path: 'boot.yml' }),
        ).toThrow();
      });
    });

    when('[t3] tokens is a float', () => {
      const content = `
budget:
  tokens: 5000.5
briefs:
  say:
    - core.md
`;
      then('it throws', () => {
        expect(() =>
          parseRoleBootYaml({ content, path: 'boot.yml' }),
        ).toThrow();
      });
    });
  });

  given('[case11] a budget with no payload to cap', () => {
    when('[t0] budget is the only key', () => {
      const content = `
budget:
  tokens: 5000
`;

      // without this guard the spec resolves to mode `none` → null → "no boot.yml"
      // → say-all, and the declared cap is discarded in silence
      then('it throws rather than silently discard the cap', () => {
        expect(() =>
          parseRoleBootYaml({ content, path: 'boot.yml' }),
        ).toThrow();
      });
    });
  });

  given(
    '[case12] a budget nested inside a section — the forbidden cell',
    () => {
      when('[t0] budget sits inside always:', () => {
        const content = `
always:
  budget:
    tokens: 5000
  briefs:
    say:
      - core.md
`;

        then(
          'it throws — a budget caps the whole payload, so it lives at the top',
          () => {
            expect(() =>
              parseRoleBootYaml({ content, path: 'boot.yml' }),
            ).toThrow();
          },
        );
      });

      when('[t1] budget sits inside subject.*', () => {
        const content = `
subject.review:
  budget:
    tokens: 5000
  briefs:
    say:
      - review/**/*.md
`;

        then('it throws', () => {
          expect(() =>
            parseRoleBootYaml({ content, path: 'boot.yml' }),
          ).toThrow();
        });
      });
    },
  );

  /**
   * .why = a misspelt top-level budget key is refused rather than silently absorbed, in
   *   either mode. subject mode carries `.catchall(schemaSubjectSection)`, so an unnamed
   *   `budgt:` block would otherwise parse AS a subject section — its `tokens` key
   *   dropped by the non-strict object, the section validated as empty, then discarded
   *   by the `subject.` prefix filter; simple mode would strip it as an unknown key.
   *   either mechanism leaves the author's declared cap ungated.
   */
  given('[case13] a MISSPELT top-level budget key — the silent pass', () => {
    when('[t0] the typo sits in a simple-mode spec', () => {
      const content = `
budgt:
  tokens: 20
briefs:
  say:
    - core.md
`;

      then('it throws rather than boot unbudgeted', () => {
        expect(() =>
          parseRoleBootYaml({ content, path: 'boot.yml' }),
        ).toThrow();
      });

      then('the refusal names the key it read and the one it wanted', () => {
        const error = getError(() =>
          parseRoleBootYaml({ content, path: 'boot.yml' }),
        );

        // an error that states a symptom alone is a blocker
        // (`rule.require.errors-name-the-fix`) — so the key AS WRITTEN travels with
        // it, since `budgt` is what the author must find in their own file
        expect(error.message).toMatch(/"key":\s*"budgt"/);
        expect(error.message).toMatch(/"expected":\s*"budget"/);
      });
    });

    when('[t1] the typo sits in a subject-mode spec', () => {
      const content = `
budgt:
  tokens: 20
always:
  briefs:
    say:
      - core.md
`;

      // 🔴 the two modes swallowed it by DIFFERENT mechanisms — a catchall here, a
      //    non-strict strip in [t0] — so one case cannot stand for both
      then('it throws too', () => {
        expect(() =>
          parseRoleBootYaml({ content, path: 'boot.yml' }),
        ).toThrow();
      });
    });

    when('[t2] a plural typo — the likeliest real slip', () => {
      const content = `
budgets:
  tokens: 20
briefs:
  say:
    - core.md
`;

      // the guard is STRUCTURAL rather than a list of typos, so an unenumerated
      // variant is caught by the same branch
      then('it throws', () => {
        expect(() =>
          parseRoleBootYaml({ content, path: 'boot.yml' }),
        ).toThrow();
      });
    });

    when('[t3] a correctly spelt budget — the POSITIVE CONTROL', () => {
      const content = `
budget:
  tokens: 5000
briefs:
  say:
    - core.md
`;

      // 🔴 without this, a guard that refused EVERY top-level `tokens` — the real
      //    budget among them — would pass [t0]–[t2] and break the whole feature.
      //    the three negative assertions above cannot part "refuses a typo" from
      //    "refuses all budgets"
      then('it parses, and the cap reaches the spec', () => {
        const result = parseRoleBootYaml({ content, path: 'boot.yml' });
        expect(result?.budget).toEqual({ tokens: 5000 });
      });
    });

    when('[t4] a foreign spec adds a key we do not know — NOT a typo', () => {
      const content = `
hooks:
  onStop:
    - some.command
briefs:
  say:
    - core.md
`;

      // 🔴 the SECOND positive control, and the one that bounds the fix. a strict
      //    top-level schema would halt a CONSUMER here, on a symlinked spec they
      //    cannot edit — the unclosable halt requirement 8 exists to prevent. so the
      //    guard tests for a `tokens` FIELD, never for an unknown key
      then('it parses, and the unknown key is ignored as it is today', () => {
        const result = parseRoleBootYaml({ content, path: 'boot.yml' });
        expect(result?.mode).toEqual('simple');
        expect(result?.budget).toEqual(null);
      });
    });
  });

  /**
   * .why = the TWIN of `[case13]`, one axis over, and the worse of the two. a swallowed
   *   budget under-gates a payload that still boots; a swallowed SECTION drops briefs the
   *   author believes are resident, so the role boots underequipped at exit 0. the parse
   *   guards the PAYLOAD (a section key) with the same rigor `[case13]` guards the
   *   MODIFIER (the budget key).
   *
   * .note = the two positive controls at `[t3]`/`[t4]` bound the guard, exactly as they do
   *   for `[case13]`. without `[t5]` a guard that refused every unknown top-level key would
   *   pass the negatives and halt a consumer on a symlinked foreign spec
   *   (`define.invariant.a-symlink-under-agent-is-foreign`).
   */
  given('[case14] a MISSPELT section key — the silent payload drop', () => {
    when('[t0] the subject prefix is mistyped', () => {
      const content = `
subjct.repo:
  briefs:
    say:
      - core.md
always:
  briefs:
    say:
      - base.md
`;

      then('it throws rather than drop the section', () => {
        expect(() =>
          parseRoleBootYaml({ content, path: 'boot.yml' }),
        ).toThrow();
      });

      then('the refusal names the key it read and the shape it wanted', () => {
        const error = getError(() =>
          parseRoleBootYaml({ content, path: 'boot.yml' }),
        );

        // the key AS WRITTEN travels with the error — it is what the author must find in
        // their own file (`rule.require.errors-name-the-fix`)
        expect(error.message).toMatch(/"key":\s*"subjct\.repo"/);
        expect(error.message).toContain('subject.');
      });
    });

    when('[t1] the separator is a hyphen rather than a dot', () => {
      const content = `
subject-repo:
  briefs:
    say:
      - core.md
always:
  skills:
    say:
      - do.sh
`;

      // the guard is STRUCTURAL rather than a list of typos, so a separator slip lands in
      // the same branch a prefix slip does
      then('it throws too', () => {
        expect(() =>
          parseRoleBootYaml({ content, path: 'boot.yml' }),
        ).toThrow();
      });
    });

    when('[t2] the mistyped key is the ONLY section in the spec', () => {
      const content = `
subjct.repo:
  briefs:
    say:
      - core.md
`;

      // 🔴 the ORDER clamp. the guard runs BEFORE `computeBootMode`, so this refuses by
      //    NAME rather than collapse to mode `none` — which would either boot an empty
      //    payload or refuse with a subject the author cannot act on
      then('the refusal still names the KEY, not the absent mode', () => {
        const error = getError(() =>
          parseRoleBootYaml({ content, path: 'boot.yml' }),
        );

        expect(error.message).toMatch(/"key":\s*"subjct\.repo"/);
      });
    });

    when('[t3] correctly spelt section keys — the POSITIVE CONTROL', () => {
      const content = `
always:
  briefs:
    say:
      - base.md
subject.repo:
  briefs:
    say:
      - core.md
`;

      // 🔴 without this, a guard that refused EVERY key that carries `briefs` would pass
      //    every negative above and break subject mode outright
      then('it parses, and both sections survive', () => {
        const result = parseRoleBootYaml({ content, path: 'boot.yml' });
        expect(result?.mode).toEqual('subject');
      });
    });

    when(
      '[t4] SIMPLE mode — its own keys are top-level, never a section',
      () => {
        const content = `
briefs:
  say:
    - core.md
skills:
  say:
    - do.sh
`;

        // 🔴 the second positive control, and the one a naive guard breaks first: in simple
        //    mode `briefs`/`skills` ARE top-level keys, so a guard that read them as inert
        //    sections would refuse every simple-mode spec in the tree
        then('it parses unchanged', () => {
          const result = parseRoleBootYaml({ content, path: 'boot.yml' });
          expect(result?.mode).toEqual('simple');
        });
      },
    );

    when('[t5] a foreign key that carries no payload — NOT a typo', () => {
      const content = `
hooks:
  onStop:
    - some.command
always:
  briefs:
    say:
      - core.md
`;

      // 🔴 the bound. a foreign spec is a symlink the consumer cannot edit, so the guard
      //    tests for a `briefs`/`skills` FIELD rather than for an unknown key
      then('it parses, and the unknown key is ignored as it is today', () => {
        const result = parseRoleBootYaml({ content, path: 'boot.yml' });
        expect(result?.mode).toEqual('subject');
      });
    });
  });
});
