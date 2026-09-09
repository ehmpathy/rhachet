import { MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { getKeyrackInfraInitErrorReport } from './getKeyrackInfraInitErrorReport';

describe('getKeyrackInfraInitErrorReport', () => {
  given('[case1] a helpful error with slug + stderr + hint metadata', () => {
    const error = new MalfunctionError('gh repo create failed', {
      slug: 'ehmpathy/keyrack-infra',
      stderr: 'HTTP 403: forbidden',
      status: 1,
      hint: 'if unauthenticated, run `gh auth status`; if authenticated but forbidden (403), ask an org owner to grant you repo-create access',
    });

    when('[t0] the blocked report is built', () => {
      const report = getKeyrackInfraInitErrorReport({ error });

      then('it roots on the keyrack lock glyph, no role mascot', () => {
        expect(report).toContain('🔐 keyrack infra init');
        expect(report).not.toContain('🐢');
      });

      then(
        'it names the error CLASS at the node, under the CLASS-matched glyph',
        () => {
          // ⚠️ the class is the node label, never the term. `MalfunctionError` names the OWNER
          //    (the server) and fixes the exit code (1) — both of which a bare `blocked:` drops
          //    (`rule.require.unabridged-error-prefix`)
          // ⚠️ the glyph is `💥`, NOT `✋`. the two are a PAIR, and between them they name one
          //    fact: `✋`+`ConstraintError` = the caller fixes it (exit 2); `💥`+`MalfunctionError`
          //    = the server fixes it (exit 1). a `✋ MalfunctionError` asserts both at once, and a
          //    reader who trusts the glyph would go hunt their own input for a server-side fault
          //    (`rule.require.keyrack-emoji-palette` — `💥` is the MalfunctionError glyph)
          expect(report).toContain(
            '💥 MalfunctionError: gh repo create failed',
          );
          expect(report).not.toContain('✋ MalfunctionError');
        },
      );

      then('it surfaces the caller-relevant metadata as leaves', () => {
        expect(report).toContain('repo: ehmpathy/keyrack-infra');
        expect(report).toContain('stderr: HTTP 403: forbidden');
        // the two-branch hint nests: a `hint:` node with a sub-branch per condition
        expect(report).toContain('hint:');
        expect(report).toContain('if unauthenticated');
        expect(report).toContain('if authenticated but forbidden');
      });

      then('the blocked treestruct stays locked', () => {
        expect(report).toMatchSnapshot();
      });
    });
  });

  given('[case2] a plain error with no metadata', () => {
    const error = new Error('the wave wiped out');

    when('[t0] the blocked report is built', () => {
      const report = getKeyrackInfraInitErrorReport({ error });

      then('it names the base class verbatim, never a substitute word', () => {
        expect(report).toContain('🔐 keyrack infra init');
        expect(report).not.toContain('🐢');
        // ⚠️ `Error` is rendered AS IS — the renderer never swaps a class it judges
        //    uninformative for a friendlier word. the prefix is unabridged or it is a
        //    redaction, and there is no third option (`rule.require.unabridged-error-prefix`)
        // ⚠️ .why = `Error` here is a DEFECT MARKER: a bare `Error` reached a human-faced
        //    renderer at all, which `rule.forbid.helpful-error-parents` grades a blocker at the
        //    THROW SITE. that marker is only findable if the word survives — a reviewer greps
        //    a snapshot for `Error:` and lands on exactly the throw sites that owe a leaf
        //    class. substitute the word and the defect becomes ungreppable
        // ⚠️ the GLYPH is 💥, not ✋ — and this is the one axis of this assertion that moved.
        //    an unclassified error never declared its caller can fix it, and `✋` IS that
        //    declaration; a bare `Error` under `✋` misreports a malfunction as a refusal and
        //    disagrees with the exit code the same fault yields (1, not 2). the CLASS TOKEN is
        //    unchanged — the defect-marker intent above is preserved verbatim, since `Error:` is
        //    what keeps a bare throw site greppable (`rule.require.keyrack-emoji-palette`)
        expect(report).toContain('💥 Error: the wave wiped out');
        expect(report).not.toContain('✋');
        expect(report).not.toContain('blocked:');
      });

      then('the minimal blocked treestruct stays locked', () => {
        expect(report).toMatchSnapshot();
      });
    });
  });
});
