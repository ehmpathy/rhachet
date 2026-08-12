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
          '└─ ✋ blocked: key not found in manifest: SOME_KEY',
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

  given('[case6] a refusal that names NEITHER a hint nor a fix', () => {
    const error = new ConstraintError('the vault is unreachable');

    when('[t0] the blocked report is built', () => {
      const report = getKeyrackBlockedReport({ error, command: 'keyrack set' });

      // a renderer that emitted an empty `hint:` leaf would render a promise it cannot keep
      then('no hint leaf is invented', () => {
        expect(report).not.toContain('hint:');
      });

      then('the blocked node still closes the tree', () => {
        expect(report).toContain('└─ ✋ blocked: the vault is unreachable');
      });
    });
  });
});
