import { ConstraintError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { getKeyrackBlockedReport } from './getKeyrackBlockedReport';

/**
 * .what = clamps the invariant that makes this renderer safe: EVERY caller-relevant
 *         metadata field a throw site names must survive into the render
 * .why = the body of the message is `redact(['metadata'])`ed before it is rendered, so a
 *        field this operation does not explicitly re-emit is DROPPED — silently, and with
 *        no signal at the throw site, which still looks correct. that is the exact defect
 *        this file exists to clamp: `unlockKeyrackKeys` names
 *        `fix: rhx keyrack set --key … --env …` on its "key not found in manifest" refusal,
 *        and for as long as the renderer read only `hint`, a human saw a bare symptom with
 *        no way forward — `rule.require.errors-name-the-fix` violated by omission
 *
 * .note = 82 metadata fields across 40 keyrack files use `hint` / `fix` / `note`. a
 *         renderer that reads one of the three answers a third of them, so the drop is a
 *         CLASS of defect rather than one site (rule.require.clamp-edge-cases)
 * .note = cases 1–3 clamp the hint TREE SHAPE (header nest, flat leaves, single part);
 *         cases 4–6 clamp WHICH metadata fields reach the render at all. two axes of one
 *         renderer, so they share a file rather than split into two
 */
describe('getKeyrackBlockedReport', () => {
  given('[case1] a hint with a header-then-grant-list shape', () => {
    // the grant list hands a header part ("... needs these grants ...:") plus its grant items,
    // joined with '; ' — the exact shape asKeyrackAwsParamGrantList emits for a write denial
    const error = new ConstraintError(
      'aws.params identity cannot ssm:DescribeParameters',
      {
        exid: '/keyrack/x',
        region: 'us-east-1',
        hint: [
          'add the absent grant to this identity, then re-run',
          'why (raw AWS): AccessDeniedException — not authorized to perform: ssm:DescribeParameters',
          'aws.params set needs these grants on this identity:',
          'ssm:DescribeParameters on * (MUST be "*", no resource scope)',
          'ssm:PutParameter on parameter/keyrack/infra/vault/aws.params/*',
        ].join('; '),
      },
    );

    when('[t0] rendered as a blocked report', () => {
      const report = getKeyrackBlockedReport({ error, command: 'keyrack set' });

      then('the header renders as the last top-level hint child', () => {
        expect(report).toContain(
          '         └─ aws.params set needs these grants on this identity:',
        );
      });

      then('the grant items nest one level under the header', () => {
        // a 12-space indent proves the grant items are CHILDREN of the header, not flat
        // siblings — the exact blemish r10 flagged. a flat 9-space render fails this assertion
        expect(report).toContain(
          '            ├─ ssm:DescribeParameters on * (MUST be "*", no resource scope)',
        );
        expect(report).toContain(
          '            └─ ssm:PutParameter on parameter/keyrack/infra/vault/aws.params/*',
        );
      });

      then('the head leaves stay flat at the top hint level', () => {
        expect(report).toContain(
          '         ├─ add the absent grant to this identity, then re-run',
        );
        expect(report).toContain(
          '         ├─ why (raw AWS): AccessDeniedException — not authorized to perform: ssm:DescribeParameters',
        );
      });
    });
  });

  given('[case2] a hint with no header (all flat leaves)', () => {
    // a hint whose parts never end with ':' must render flat, unchanged by the header-nest logic
    const error = new ConstraintError('aws.params found no AWS identity', {
      exid: '/keyrack/x',
      region: 'us-east-1',
      hint: [
        'for --org @all run on a box whose instance role can read this param',
        'why (raw AWS): CredentialsProviderError — could not load credentials',
      ].join('; '),
    });

    when('[t0] rendered', () => {
      const report = getKeyrackBlockedReport({ error, command: 'keyrack set' });

      then('every part renders as a flat top-level hint child', () => {
        expect(report).toContain(
          '         ├─ for --org @all run on a box whose instance role can read this param',
        );
        expect(report).toContain(
          '         └─ why (raw AWS): CredentialsProviderError — could not load credentials',
        );
      });

      then('no deeper nest appears absent a header', () => {
        // no 12-space child indent exists when no hint part ends with ':'
        expect(report).not.toContain('            ├─');
        expect(report).not.toContain('            └─');
      });
    });
  });

  given('[case4] a refusal that names its remedy under `fix`', () => {
    /**
     * .note = this is `unlockKeyrackKeys`'s real shape, copied field for field — the site
     *         whose acceptance test caught the drop. it names NO `hint`, which is exactly
     *         why a hint-only renderer lost it
     */
    const error = new ConstraintError('key not found in manifest: SOME_KEY', {
      env: 'test',
      note: `key 'SOME_KEY' is not declared in keyrack.yml for env=test`,
      fix: `rhx keyrack set --key SOME_KEY --env test`,
    });

    when('[t0] the blocked report is built', () => {
      const report = getKeyrackBlockedReport({
        error,
        command: 'keyrack unlock',
      });

      // ⛔ THE CLAMP. revert the `fix` read in the renderer and this goes red — verified
      then('the fix reaches the human', () => {
        expect(report).toContain('rhx keyrack set --key SOME_KEY --env test');
      });

      // the fix is what a human copy-pastes, so it must close the branch rather than sit
      // mid-tree where the eye skips it (rule.require.treestruct-output)
      then('the fix closes the branch', () => {
        expect(report).toContain(
          '└─ hint: rhx keyrack set --key SOME_KEY --env test',
        );
      });

      // ⛔ THE SECOND CLAMP. `note` carries WHY the input was refused, and it was dropped
      //    by the same omission
      then('the why reaches the human', () => {
        expect(report).toContain(
          `why: key 'SOME_KEY' is not declared in keyrack.yml for env=test`,
        );
      });

      then('the symptom still leads, as the blocked node', () => {
        expect(report).toContain(
          '└─ ✋ ConstraintError: key not found in manifest: SOME_KEY',
        );
      });

      // the raw metadata json must NOT leak back in — the redaction is the whole reason
      // this renderer re-emits fields by name rather than prints the message verbatim
      then('the raw metadata json never leaks', () => {
        expect(report).not.toContain('"env"');
      });
    });
  });

  given('[case5] a refusal that names its remedy under `hint`', () => {
    const error = new ConstraintError('--reach requires a key', {
      reach: 'beav@ehmpathy.com',
      hint: 'rhx keyrack get --key API_KEY --reach beav@ehmpathy.com',
    });

    when('[t0] the blocked report is built', () => {
      const report = getKeyrackBlockedReport({ error, command: 'keyrack get' });

      // e1 for this repair: the extant `hint` path is byte-identical, so not one of the
      // 39 acceptance snapshots that already lock a hint-carried refusal may move
      then('the hint renders exactly as it did before `fix` was read', () => {
        expect(report).toContain(
          '└─ hint: rhx keyrack get --key API_KEY --reach beav@ehmpathy.com',
        );
      });

      then('no `why` leaf appears when no note was named', () => {
        expect(report).not.toContain('why:');
      });
    });
  });

  given('[case3] a single-part hint', () => {
    const error = new ConstraintError(
      'aws.params needs the declastruct-aws peer',
      {
        exid: '/keyrack/x',
        region: 'us-east-1',
        hint: 'run `pnpm add declastruct-aws`',
      },
    );

    when('[t0] rendered', () => {
      const report = getKeyrackBlockedReport({ error, command: 'keyrack set' });

      then('the sole hint renders inline as the branch closer', () => {
        expect(report).toContain(
          '      └─ hint: run `pnpm add declastruct-aws`',
        );
      });
    });
  });

  /**
   * .what = the scope leaf follows the slug's NAMESPACE — `machine:` for `@all`, `repo:` else
   * .why = `@all` is the reserved MACHINE-WIDE org, so it means the opposite of repo-scoped. a
   *        flat `repo:` leaf contradicted its own value and sent a human who hunted a reach
   *        miss to look in a repo with no part in it (`rule.forbid.ambiguous-labels`)
   * .note = clamped at UNIT grain on purpose. the branch is also asserted by the machine-wide
   *         reach journey, but this is a pure transformer, and
   *         `rule.require.test-coverage-by-grain` wants its own case rather than coverage that
   *         leans on the one acceptance journey which happens to walk it
   */
  given('[case7] the scope leaf follows the slug namespace', () => {
    when('[t0] the slug is MACHINE-WIDE (`@all`)', () => {
      const report = getKeyrackBlockedReport({
        error: new ConstraintError('no key is set for reach', {
          slug: '@all.prep.BRAINS_AUTH',
        }),
        command: 'keyrack unlock',
      });

      then('it is labelled `machine:`, never `repo:`', () => {
        expect(report).toContain('machine: @all.prep.BRAINS_AUTH');
        expect(report).not.toContain('repo: @all.');
      });
    });

    when('[t1] the slug is REPO-scoped', () => {
      const report = getKeyrackBlockedReport({
        error: new ConstraintError('no key is set for reach', {
          slug: 'testorg.prep.REPO_KEY',
        }),
        command: 'keyrack unlock',
      });

      // ⚠️ the extant label must NOT move — every peer snapshot in the repo renders `repo:`
      //    for a repo-scoped slug, and the namespace branch is additive by construction
      then('it keeps the extant `repo:` label', () => {
        expect(report).toContain('repo: testorg.prep.REPO_KEY');
      });
    });

    when(
      '[t2] a slug that merely OPENS with `@all` but is not machine-wide',
      () => {
        // .note = the probe is `startsWith('@all.')`, dot included — so an org whose name begins
        //         with the letters `@all` (e.g. `@allstate`) is NOT caught by the machine branch
        const report = getKeyrackBlockedReport({
          error: new ConstraintError('no key is set for reach', {
            slug: '@allstate.prep.REPO_KEY',
          }),
          command: 'keyrack unlock',
        });

        then(
          'it stays `repo:` — the dot is what marks the reserved org',
          () => {
            expect(report).toContain('repo: @allstate.prep.REPO_KEY');
          },
        );
      },
    );
  });

  given('[case6] a refusal that names NEITHER a hint nor a fix', () => {
    const error = new ConstraintError('the vault is unreachable');

    when('[t0] the blocked report is built', () => {
      const report = getKeyrackBlockedReport({ error, command: 'keyrack set' });

      // a renderer that emitted an empty `hint:` leaf would render a promise it cannot keep
      then('no hint leaf is invented', () => {
        expect(report).not.toContain('hint:');
      });

      then('the blocked node still closes the tree', () => {
        expect(report).toContain(
          '└─ ✋ ConstraintError: the vault is unreachable',
        );
      });
    });
  });

  /**
   * ⚠️ .what = the clamp on "no allowlist" — a metadata field this renderer never heard of
   *         must still reach the human
   * .why = the renderer knew five keys (`slug` `stderr` `note` `hint` `fix`) and dropped every
   *        other one. that is `rule.forbid.failhide` in renderer form: the throw site looks
   *        correct, the field is real, and only the render eats it — so a refusal that named
   *        `owner: mechanic` or `mechGiven: INVALID_MECH` showed a human neither, and nobody
   *        learned the context was lost. the raw dump this tree replaced printed the WHOLE
   *        metadata object, so the pretty render was a REGRESSION
   *        (`rule.require.refusals-carry-context`)
   */
  given('[case7] metadata fields the renderer was never taught', () => {
    const error = new ConstraintError('invalid --mech', {
      mechGiven: 'NOT_A_MECH',
      owner: 'mechanic',
      attempts: 3,
      hint: 'pass a valid --mech',
    });

    when('[t0] the blocked report is built', () => {
      const report = getKeyrackBlockedReport({ error, command: 'keyrack set' });

      then('an unknown string field renders under its own name', () => {
        expect(report).toContain('mechGiven: NOT_A_MECH');
        expect(report).toContain('owner: mechanic');
      });

      then('a non-string field renders too, never silently dropped', () => {
        expect(report).toContain('attempts: 3');
      });

      then('the hint still closes the branch, below them', () => {
        expect(report.indexOf('mechGiven:')).toBeLessThan(
          report.indexOf('hint:'),
        );
        expect(report).toContain('└─ hint: pass a valid --mech');
      });
    });
  });

  /**
   * ⚠️ .what = the clamp on the invocation echo — a human must be able to REPRODUCE the refusal
   * .why = a human reads an error minutes after they typed it, often from a scrollback or a CI
   *        log where the command is far above; an agent reads it with no scrollback at all. the
   *        raw dump carried an `[args]` trailer and the tree dropped it, which is the half of
   *        the regression the metadata clamp above does not cover
   */
  given('[case8] an invocation to echo', () => {
    const error = new ConstraintError('invalid --vault', {
      hint: 'pass a valid --vault',
    });

    when('[t0] the invocation is named', () => {
      const report = getKeyrackBlockedReport({
        error,
        command: 'keyrack set',
        invocation: ['keyrack', 'set', '--key', 'TEST', '--vault', 'bogus'],
      });

      then('it renders space-joined, so it can be copy-pasted', () => {
        // ⚠️ .why.spaces = the raw dump joined argv with COMMAS
        //        (`[args] keyrack,set,--key,TEST`), which a human cannot paste back into a
        //        shell. the echo is only a reproduction if it reproduces
        expect(report).toContain('ran: keyrack set --key TEST --vault bogus');
      });
    });

    when('[t1] no invocation is named', () => {
      const report = getKeyrackBlockedReport({ error, command: 'keyrack set' });

      // .why = the renderer is pure and its callers vary — a caller that names none must not
      //        render an empty `ran:` leaf, which would promise a reproduction it cannot give
      then('no echo leaf is invented', () => {
        expect(report).not.toContain('ran:');
      });
    });

    when('[t2] the invocation is an empty argv', () => {
      const report = getKeyrackBlockedReport({
        error,
        command: 'keyrack set',
        invocation: [],
      });

      then('no echo leaf is invented either', () => {
        expect(report).not.toContain('ran:');
      });
    });
  });

  // ⚠️ .why = the render-EVERY-field loop is the right rule, and it has one failure mode the
  //        allowlist it replaced did not: a value whose serialization carries no content still
  //        renders as a LEAF. an `Error` is the live instance — five aws.params gates attach one
  //        under `cause`, and `JSON.stringify(err)` is `'{}'`. a `cause: {}` line is shaped like
  //        a fact and states none, which is the same failure as a dropped field approached from
  //        the other side (`rule.require.refusals-carry-context`)
  given('[case9] metadata whose value carries content only off-JSON', () => {
    when('[t0] an Error is attached, as the aws.params gates attach it', () => {
      const report = getKeyrackBlockedReport({
        error: new ConstraintError('aws.params ssm read denied', {
          exid: 'ehmpathy/prep/FOO',
          cause: new Error(
            'User is not authorized to perform ssm:GetParameter',
          ),
          hint: 'add the absent grant to this identity, then re-run',
        }),
        command: 'keyrack get',
      });

      then('it renders the error message, never a hollow `{}`', () => {
        // .note = a BASE `Error` spells no name here — see [t2] for why. the fact this row
        //         holds is that the message survives at all, which `JSON.stringify` loses
        expect(report).toContain(
          'cause: User is not authorized to perform ssm:GetParameter',
        );
        expect(report).not.toContain('cause: {}');
      });

      then('the peer fields and the fix still render beside it', () => {
        expect(report).toContain('exid: ehmpathy/prep/FOO');
        expect(report).toContain(
          'hint: add the absent grant to this identity, then re-run',
        );
      });
    });

    when('[t1] a value serializes to an empty container', () => {
      const report = getKeyrackBlockedReport({
        error: new ConstraintError('invalid --mech', {
          mechGiven: 'BOGUS',
          attempts: [],
          detail: {},
          hint: 'pass a valid --mech',
        }),
        command: 'keyrack set',
      });

      then('the hollow leaves are omitted', () => {
        expect(report).not.toContain('attempts:');
        expect(report).not.toContain('detail:');
      });

      then('the field that carries a fact still renders', () => {
        expect(report).toContain('mechGiven: BOGUS');
      });
    });

    when('[t4] a list of scalars is attached', () => {
      // ⚠️ .why = the vault gates attach the mechs they accept under `supported`. as raw json
      //        that reads `supported: ["PERMANENT_VIA_REPLICA","EPHEMERAL_VIA_GITHUB_APP"]` —
      //        brackets, quotes and commas inside a tree whose every other leaf is prose
      const report = getKeyrackBlockedReport({
        error: new ConstraintError('os.direct does not support this mech', {
          mech: 'EPHEMERAL_VIA_GITHUB_APP',
          supported: ['PERMANENT_VIA_REPLICA', 'EPHEMERAL_VIA_AWS_SSO'],
          hint: 'try --vault os.secure',
        }),
        command: 'keyrack set',
      });

      then('it reads as a phrase, never as json', () => {
        expect(report).toContain(
          'supported: PERMANENT_VIA_REPLICA, EPHEMERAL_VIA_AWS_SSO',
        );
        expect(report).not.toContain('["');
        expect(report).not.toContain('","');
      });
    });

    when('[t5] a list of OBJECTS is attached', () => {
      // ⚠️ .why = the guard on the row above. a join would collapse each member to
      //        `[object Object]` — a hollow leaf under a real label, strictly worse than the
      //        brackets it cured. so a non-scalar list keeps its json (`rule.forbid.failhide`)
      const report = getKeyrackBlockedReport({
        error: new ConstraintError('two grants clash', {
          clashes: [{ slug: 'a.b.C' }, { slug: 'd.e.F' }],
          hint: 'drop one',
        }),
        command: 'keyrack set',
      });

      then('its json survives, rather than collapse to [object Object]', () => {
        expect(report).not.toContain('[object Object]');
        expect(report).toContain('a.b.C');
      });
    });

    /**
     * ⚠️ .what = an error's NAME is spelled only when the name is a fact
     * .why = the base `Error` is the class every `fs` failure carries, and to spell it renders
     *        `error: Error: ENOENT …` — a class name leaked into a refusal, which is the exact
     *        raw dump this whole report was built to replace (see this file's `.what`). two
     *        acceptance snapshots shipped that render, and a peer reviewer caught it.
     * ⚠️ .note.teeth = the two rows are the two SIDES of one branch, and a suite that held only
     *        one could not detect a collapse. drop the name always and [t3] goes red; spell it
     *        always and [t2] goes red. only the pair pins the condition itself
     */
    when(
      '[t2] the error is a BASE Error, whose class name states no fact',
      () => {
        const report = getKeyrackBlockedReport({
          error: new ConstraintError('could not read pem file', {
            pemPath: './no-such-file.pem',
            error: new Error(
              "ENOENT: no such file or directory, open './no-such-file.pem'",
            ),
            hint: 'check the path exists and is readable: ./no-such-file.pem',
          }),
          command: 'keyrack set',
        });

        then('the bare `Error:` prefix is dropped', () => {
          expect(report).not.toContain('error: Error:');
        });

        then(
          'the os-level code survives — it is the fact no peer leaf holds',
          () => {
            // ⚠️ .why = the hint says "exists and is READABLE", which is two conditions; `ENOENT`
            //        is what says WHICH of them failed. to drop the whole leaf as an echo would
            //        cure the class-name leak at the cost of a fact (`rule.forbid.failhide`)
            expect(report).toContain(
              "error: ENOENT: no such file or directory, open './no-such-file.pem'",
            );
          },
        );
      },
    );

    when('[t3] the error class NAMES the failure', () => {
      class AccessDeniedException extends Error {
        public constructor(message: string) {
          super(message);
          this.name = 'AccessDeniedException';
        }
      }

      const report = getKeyrackBlockedReport({
        error: new ConstraintError('aws.params ssm read denied', {
          cause: new AccessDeniedException('not authorized: ssm:GetParameter'),
          hint: 'add the absent grant to this identity, then re-run',
        }),
        command: 'keyrack get',
      });

      then('the name is kept — it is the most useful word on the leaf', () => {
        expect(report).toContain(
          'cause: AccessDeniedException: not authorized: ssm:GetParameter',
        );
      });
    });
  });

  given('[case11] metadata whose noise a curated field already covers', () => {
    // ⚠️ .why = both rows below shipped as real blemishes in the aws.params snapshots, and
    //        both are the SAME failure the hollow guard ([case9][t1]) already forbids —
    //        reached one level deeper. a top-level null is dropped; the identical absence
    //        nested inside an object rendered in full, and a curated hint's own sentence
    //        rendered a second time as a raw `cause:` leaf
    when('[t0] a nested value whose every member is absent', () => {
      const report = getKeyrackBlockedReport({
        error: new ConstraintError('aws.params requires a region', {
          input: { fromEnv: null, fromEnvDefault: null, fromProfile: null },
          hint: 'set AWS_REGION, or add `region = ...` to your aws profile',
        }),
        command: 'keyrack set',
      });

      then(
        'the all-absent object is omitted, not spelled as a wall of null',
        () => {
          expect(report).not.toContain('input:');
          expect(report).not.toContain('fromEnv');
        },
      );

      then('the fix still closes the branch', () => {
        expect(report).toContain('hint: set AWS_REGION');
      });
    });

    when('[t1] a nested value carries SOME facts beside its absences', () => {
      // .why = the prune must trim the absences, never drop the leaf that holds real facts
      const report = getKeyrackBlockedReport({
        error: new ConstraintError('aws.params requires an owner', {
          input: {
            slug: 'testorg.test.XAI_API_KEY',
            mech: 'PERMANENT_VIA_REPLICA',
            exid: null,
          },
          hint: 'pass --owner',
        }),
        command: 'keyrack set',
      });

      then('the facts render and the absent member is trimmed away', () => {
        expect(report).toContain('slug');
        expect(report).toContain('testorg.test.XAI_API_KEY');
        expect(report).toContain('PERMANENT_VIA_REPLICA');
        expect(report).not.toContain('exid');
      });
    });

    when('[t2] an Error whose message the fix already spells', () => {
      const awsSaid =
        'User: arn:aws:sts::0:assumed-role/r is not authorized to perform: ssm:DescribeParameters';
      const report = getKeyrackBlockedReport({
        error: new ConstraintError(
          'aws.params identity cannot ssm:DescribeParameters',
          {
            region: 'us-east-1',
            cause: new Error(awsSaid),
            hint: `add the absent grant to this identity, then re-run; why (raw AWS): AccessDeniedException — ${awsSaid}`,
          },
        ),
        command: 'keyrack set',
      });

      then('the aws sentence is said once, by the curated branch', () => {
        const saidTimes = report.split(awsSaid).length - 1;
        expect(saidTimes).toEqual(1);
        expect(report).not.toContain('cause:');
      });

      then('a scalar peer field is untouched by the echo guard', () => {
        // .why = the guard is scoped to Error values, so a plain fact that happens to also
        //        appear in a hint is never suppressed (`rule.forbid.failhide`)
        expect(report).toContain('region: us-east-1');
      });
    });
  });

  given(
    '[case10] a credential stored under a key the name-mask cannot see',
    () => {
      // ⚠️ .why = this is the leak a key-name mask CANNOT catch, and it fails in the worst
      //        possible direction: the render succeeds, the tree looks correct, and the
      //        credential is in the terminal and the ci log. `value` / `body` / `data` are
      //        the ordinary words a throw site reaches for, so the day one carries a
      //        vault-returned secret, only its SHAPE gives it away (isKeyrackSecretShaped)
      when('[t0] the key is `value`, `body`, or `data`', () => {
        const report = getKeyrackBlockedReport({
          error: new ConstraintError(
            'vault read returned an unexpected shape',
            {
              slug: '@all.camp.GITHUB_TOKEN',
              value: 'ghs_16C7e42F292c6912E7710c838347Ae178B4a',
              body: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NSJ9.dBjftJeZ4CVPmB92K27uhbUJU1p1rwW1gFWFOEjXk',
              data: 'aB3dE7fG9hJ2kL4mN6pQ8rS1tU5vW0xY7zA',
              hint: 'run: rhx keyrack fill --owner ehmpath',
            },
          ),
          command: 'keyrack get',
        });

        then('each credential is redacted', () => {
          expect(report).not.toContain(
            'ghs_16C7e42F292c6912E7710c838347Ae178B4a',
          );
          expect(report).not.toContain(
            'dBjftJeZ4CVPmB92K27uhbUJU1p1rwW1gFWFOEjXk',
          );
          expect(report).not.toContain('aB3dE7fG9hJ2kL4mN6pQ8rS1tU5vW0xY7zA');
          expect(report).toContain('value: __REDACTED__');
          expect(report).toContain('body: __REDACTED__');
          expect(report).toContain('data: __REDACTED__');
        });

        then('the refusal still carries its context and its fix', () => {
          expect(report).toContain('repo: @all.camp.GITHUB_TOKEN');
          expect(report).toContain(
            'hint: run: rhx keyrack fill --owner ehmpath',
          );
        });
      });

      when('[t1] the same keys carry ordinary, non-credential context', () => {
        // .why = the mask earns its place only if the context a human came for survives it
        const report = getKeyrackBlockedReport({
          error: new ConstraintError('invalid --mech', {
            value: 'BOGUS',
            data: '.agent/keyrack.yml',
            body: 'no keyrack.yml found in this repo or any parent',
            hint: 'pass a valid --mech',
          }),
          command: 'keyrack set',
        });

        then('every field renders in full', () => {
          expect(report).toContain('value: BOGUS');
          expect(report).toContain('data: .agent/keyrack.yml');
          expect(report).toContain(
            'body: no keyrack.yml found in this repo or any parent',
          );
          expect(report).not.toContain('__REDACTED__');
        });
      });
    },
  );

  given('[case13] metadata that carries a nested object', () => {
    // ⚠️ .why = both rows below shipped as real blemishes — `keyrack.firewall…snap:233` and
    //        `keyrack.vault.awsParams…snap:93` — and both are the SAME failure the scalar-list
    //        join ([case10]) already cures, one shape over: machine syntax inside a render
    //        whose every other leaf is `key: value` prose. the object form is the worse half,
    //        because a list joins to a readable phrase while an object keeps every brace, quote
    //        and colon, so a human parses syntax to reach facts a sub-branch would have stated
    when('[t0] every member is a scalar', () => {
      const report = getKeyrackBlockedReport({
        error: new ConstraintError('malformed secrets json', {
          source: { type: 'env', format: 'json', envVar: 'SECRETS_JSON' },
          hint: 'ensure the input is a valid json object',
        }),
        command: 'keyrack firewall',
      });

      then('the object expands into a sub-branch, one fact per leaf', () => {
        expect(report).toContain('├─ source');
        expect(report).toContain('│  ├─ type: env');
        expect(report).toContain('│  ├─ format: json');
        expect(report).toContain('│  └─ envVar: SECRETS_JSON');
      });

      then('no json delimiter survives into the tree', () => {
        // ⚠️ the teeth: these four assertions are what go red under the pre-expand renderer.
        //    to assert the facts render is NOT enough — they rendered before too, inside the
        //    blob. the blemish IS the syntax, so the syntax is what the clamp forbids
        expect(report).not.toContain('{"');
        expect(report).not.toContain('":"');
        expect(report).not.toContain('"}');
        expect(report).not.toContain('source: {');
      });

      then('the fix still closes the branch', () => {
        expect(report).toContain(
          '└─ hint: ensure the input is a valid json object',
        );
      });
    });

    when('[t1] the nested object is the LAST leaf of the branch', () => {
      // .why = the rail must switch from `│  ` to a blank margin when the parent closes the
      //        branch, or the tree renders a vertical line that leads nowhere below it
      const report = getKeyrackBlockedReport({
        error: new ConstraintError('aws.params requires an owner', {
          input: {
            slug: 'testorg.test.XAI_API_KEY',
            mech: 'PERMANENT_VIA_REPLICA',
          },
        }),
        command: 'keyrack set',
      });

      then(
        'the parent closes the branch and its children carry no rail',
        () => {
          expect(report).toContain('└─ input');
          expect(report).toContain('   ├─ slug: testorg.test.XAI_API_KEY');
          expect(report).toContain('   └─ mech: PERMANENT_VIA_REPLICA');
          expect(report).not.toContain('│  └─ mech');
        },
      );
    });

    when('[t2] a member is itself a container', () => {
      // .why = the expansion is bounded to ONE level on purpose. a deeper tree needs a
      //        recursive rail, and is not obviously kinder than the json — so the deeper shape
      //        keeps its blob rather than invent a margin it cannot hold. same bound, same
      //        reason, as the scalars-only rule the list join obeys
      const report = getKeyrackBlockedReport({
        error: new ConstraintError('invalid manifest', {
          input: { org: 'testorg', extends: { from: 'a.yml' } },
        }),
        command: 'keyrack set',
      });

      then('the object keeps its json rather than half-expand', () => {
        expect(report).toContain('input: {');
        expect(report).not.toContain('├─ org: testorg');
      });
    });

    when('[t3] the nested object hangs off a secret-bearing key', () => {
      // ⚠️ .why = a credential must never gain surface from a prettier render. the parent key
      //        names a secret, so the whole object is redacted as ONE value — to expand it
      //        would spread the credential across several leaves and hand the mask more places
      //        to miss (`rule.require.safe-by-default`)
      const report = getKeyrackBlockedReport({
        error: new ConstraintError('vault write failed', {
          token: { value: 'ghp_realsecretvalue', scope: 'repo' },
        }),
        command: 'keyrack set',
      });

      then('the object is masked whole, and no member escapes', () => {
        expect(report).toContain('token: __REDACTED__');
        expect(report).not.toContain('ghp_realsecretvalue');
        expect(report).not.toContain('scope: repo');
      });
    });

    when('[t4] a nested MEMBER walks like a secret', () => {
      // ⚠️ .why = the parent key is innocent, so the expansion runs — which means each child is
      //        the only thing between a vault value and a ci log. both masks therefore apply at
      //        every depth, not merely at the top level where they were first written
      const report = getKeyrackBlockedReport({
        error: new ConstraintError('vault write failed', {
          input: { vault: 'aws.params', apiToken: 'ghp_realsecretvalue' },
        }),
        command: 'keyrack set',
      });

      then('the innocent member renders and the secret one is masked', () => {
        expect(report).toContain('vault: aws.params');
        expect(report).toContain('apiToken: __REDACTED__');
        expect(report).not.toContain('ghp_realsecretvalue');
      });
    });
  });
});
