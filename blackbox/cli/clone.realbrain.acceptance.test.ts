import { given, then, useBeforeAll, when } from 'test-fns';
import { genTempDir } from 'test-fns';

import {
  enrollRealClaudeAndWaitReach,
  getRealClaudeOrThrow,
  sayAndPollForMarker,
  setupEnrollFixture,
  trustFolderForRealClaude,
} from '@/blackbox/.test/infra/enrollCloneHarness';
import { asSnapshotSafe } from '@/blackbox/.test/infra/invokeRhachetCliBinary';

/**
 * .what = the real-brain tier of the socket proof — the reach round-trip (enroll →
 *   say → get) against a REAL claude, not the hermetic stub. the stub proves the
 *   MECHANISM (bytes on the wire, transcript on disk); a real claude proves the
 *   INTEGRATION (a live brain-cli boots under our pty, receives our dispatch as if
 *   typed, submits it, and its own reply reads back through `get`).
 * .why =
 *   - `rule.forbid.acceptance.mocks` + the wish's paramount priority: the socket is
 *     not "delivered" until it is proven against a real brain, never only a stub
 *   - `rule.forbid.faked-or-quarantined-acceptance`: this real-brain proof lives in
 *     the ONE acceptance suite (jest.acceptance.config), NOT a separate real-only
 *     gate. it is credential-gated and COSTLY (a real token spend + LLM boot latency
 *     + nondeterministic replies), so it gates LOUD when the brain/credential is
 *     absent — a ConstraintError (exit 2) naming the fix — and NEVER skips
 *   - the gate + trust pre-accept + enroll + say/poll are all shared harness fixtures,
 *     per `rule.require.shared-test-fixtures` (one home for the real-tier setup, reused
 *     by this bare-enroll reach and the multi-turn joker conversation)
 */

// the real-claude reply contract — a stable sentinel the prompt asks claude to echo
// verbatim, so `get` can match it deterministically despite LLM nondeterminism
const REACH_SENTINEL = 'RHACHET-REACH-OK';

describe('rhx clone reach vs a REAL claude (real acceptance)', () => {
  given('[case1] a real, authenticated claude on PATH', () => {
    const scene = useBeforeAll(async () => {
      // the loud gate — throws a ConstraintError (exit 2) when the real brain or its
      // credentials are absent; this tier proves the integration or fails, never skips
      const { binDir } = getRealClaudeOrThrow();

      const dir = genTempDir({ slug: 'clone-real' });
      setupEnrollFixture({ dir });

      // pre-accept the folder-trust gate so a fresh fixture dir never wedges the
      // enroll on claude's one-time "trust this project?" prompt
      trustFolderForRealClaude({ dir });

      // put the REAL claude first on PATH (its own binDir), and DO NOT override
      // CLAUDE_CONFIG_DIR — the real brain must find its real ~/.claude credentials
      const env = { PATH: `${binDir}:${process.env.PATH ?? ''}` };

      // enroll the real claude through the outer pty (so the socket stands up); the
      // deterministic json handoff carries the clone's serial we address
      const enrolled = await enrollRealClaudeAndWaitReach({ dir, env });

      return { dir, env, ...enrolled };
    });
    afterAll(async () => {
      await scene.bg.kill();
    });

    when('[t0] a real prompt is dispatched, then observed', () => {
      const roundtrip = useBeforeAll(async () => {
        // a unique nonce per run, so a stale transcript can never satisfy the match
        const nonce = `${Date.now().toString(36)}-${Math.random()
          .toString(36)
          .slice(2, 8)}`;
        const wanted = `${REACH_SENTINEL} ${nonce}`;

        // dispatch a prompt that asks the real brain to echo the sentinel verbatim,
        // then poll `get` until the real reply lands
        return sayAndPollForMarker({
          address: scene.address,
          what: `Reply with exactly this text and no other words: ${wanted}`,
          marker: wanted,
          dir: scene.dir,
          env: scene.env,
        });
      });

      then('the say command is accepted (exit 0)', () => {
        expect(roundtrip.said.status).toEqual(0);
      });

      then('the real brain`s reply carries the sentinel + nonce', () => {
        expect(roundtrip.landed).toBe(true);
      });

      then('the say-delivered tree (human) is locked — brain-independent, so snapshot-safe', () => {
        // the say output is a plain `delivered` tree with NO brain prose in it, so it is
        // fully deterministic (unlike the reply, which a real brain never repeats) — the
        // joker suite locks the same shape; this pins it for the bare-enroll reach too
        expect(asSnapshotSafe(roundtrip.said.stdout)).toMatchSnapshot();
      });
    });
  });
});
