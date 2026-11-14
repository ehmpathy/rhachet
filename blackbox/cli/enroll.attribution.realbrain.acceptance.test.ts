import { MalfunctionError } from 'helpful-errors';
import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';
import { getUuid } from 'uuid-fns';

import {
  enrollRealClaudeAndWaitReach,
  getRealClaudeOrThrow,
  sayAndPollForMarker,
  setupEnrollFixture,
  setRealClaudeFirstRunAccepted,
} from '@/blackbox/.test/infra/enrollCloneHarness';
import { envIsolated } from '@/blackbox/.test/infra/envIsolated';
import { genIsolatedClaudeHome } from '@/blackbox/.test/infra/genIsolatedClaudeHome';
import type { RhachetBackgroundHandle } from '@/blackbox/.test/infra/spawnRhachetCliBackground';
import { getActorOndiskDir } from '@src/domain.operations/actor/enrolled/getActorOndiskDir';
import { getBrainOndiskDir } from '@src/domain.operations/actor/enrolled/getBrainOndiskDir';
import { asCloneRef } from '@src/domain.operations/clone/asCloneRef';
import { genCloneHistoryRelink } from '@src/domain.operations/clone/genCloneHistoryRelink';
import { getCloneDir } from '@src/domain.operations/clone/getCloneDir';
import { getCloneTranscriptText } from '@src/domain.operations/clone/getCloneTranscriptText';
import { getOneCloneByRef } from '@src/domain.operations/clone/getOneCloneByRef';
import { getOneRepoPath } from '@src/infra/host/getOneRepoPath';

import { readFileSync, writeFileSync } from 'node:fs';
import { delimiter, join } from 'node:path';

// a real claude boot (~30-90s) plus one turn exceeds the 90s global hook cap
jest.setTimeout(300000);

/**
 * .what = a real enrolled clone receives no commit or pr attribution reminder
 * .why =
 *   - claude injects its "Co-Authored-By: Claude" trailer + "Generated with Claude Code"
 *     footer reminder as a transcript attachment, never via the system prompt; only the
 *     `attribution` key in the config the clone boots can mute it
 *   - the unit + integration clamps prove the key is written; this proves a real brain
 *     reads it and emits no reminder
 * .note = the clone's own transcript is the witness: claude persists each attachment it
 *   injects as a jsonl line, so an absent attribution attachment is a deterministic read
 * .note = a real-brain tier: credential-gated, fails loud (never skips) via
 *   getRealClaudeOrThrow, per rule.forbid.faked-or-quarantined-acceptance
 */

// one nonce per run, so a stale transcript can never satisfy the turn
const MARKER = `ATTRIBUTION-TURN-${getUuid()}`;
const MARKER_GROVE = `ATTRIBUTION-GROVE-TURN-${getUuid()}`;
const MARKER_PEER = `ATTRIBUTION-PEER-TURN-${getUuid()}`;

// a grove that asks for its own trailer + footer, by a text no default could hold
const GROVE_SENTINEL = 'Grove Sentinel <grove@example.com>';
const GROVE_BYTES = `${JSON.stringify(
  {
    attribution: {
      commit: `Co-Authored-By: ${GROVE_SENTINEL}`,
      pr: `footer from ${GROVE_SENTINEL}`,
    },
  },
  null,
  2,
)}\n`;

/**
 * .what = the attachments in a transcript that carry a non-empty commit or pr text
 * .why = claude writes its attribution reminder as an attachment line with `commit` + `pr`
 */
const getAttributionAttachments = (input: {
  transcript: string;
}): { commit: unknown; pr: unknown }[] =>
  input.transcript
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as { attachment?: Record<string, unknown> })
    .map((record) => record.attachment ?? null)
    .filter((attachment): attachment is Record<string, unknown> => attachment !== null)
    .filter((attachment) => Boolean(attachment.commit) || Boolean(attachment.pr))
    .map((attachment) => ({ commit: attachment.commit, pr: attachment.pr }));

/**
 * .what = enroll a real clone and look it up on disk
 * .why = each case reads the clone's own transcript and its actor's config
 */
const genEnrolledRealClone = async (input: {
  dir: string;
  env: Record<string, string | undefined>;
  roles?: string[];
}): Promise<{
  bg: RhachetBackgroundHandle;
  address: string;
  repoPath: string;
  clone: NonNullable<ReturnType<typeof getOneCloneByRef>>;
}> => {
  const enrolled = await enrollRealClaudeAndWaitReach(input);

  // look up the clone on disk, to read its own transcript
  const repoPath = getOneRepoPath({ from: input.dir });
  const clone = getOneCloneByRef({
    repoPath,
    ref: asCloneRef({ raw: enrolled.address }),
  });
  if (clone === null)
    throw new MalfunctionError('the enrolled clone was not found on disk', {
      address: enrolled.address,
      hint: 'check .agent/.actors/ under the fixture dir',
    });

  return { bg: enrolled.bg, address: enrolled.address, repoPath, clone };
};

/**
 * .what = the clone's transcript text, plus the attribution key its actor config holds
 * .why = the transcript proves what the brain did; the config names the bytes it booted
 */
const getCloneWitness = (input: {
  repoPath: string;
  clone: NonNullable<ReturnType<typeof getOneCloneByRef>>;
}): { text: string; attribution: unknown; actorDirName: string } => {
  // the transcript link is lazy; relink it before the read
  genCloneHistoryRelink({ repoPath: input.repoPath, clone: input.clone });
  const actorDir = getActorOndiskDir({
    repoPath: input.clone.actor.repoPath,
    exid: input.clone.actor.exid,
  });
  const cloneDir = getCloneDir({ actorDir, serial: input.clone.serial });
  const settings = JSON.parse(
    readFileSync(
      join(getBrainOndiskDir({ actorDir }), 'settings.of.repo.json'),
      'utf-8',
    ),
  ) as { attribution?: unknown };
  return {
    text: getCloneTranscriptText({ cloneDir }),
    attribution: settings.attribution,
    actorDirName: actorDir.split('/').slice(-1)[0] ?? '',
  };
};

describe('rhx enroll — a real clone gets no attribution reminder (real acceptance)', () => {
  given('[case1] a real claude enrolled through a real pty', () => {
    const scene = useBeforeAll(async () => {
      // the loud gate: ConstraintError when the real brain or its credentials are absent
      const { binDir } = getRealClaudeOrThrow();

      const dir = genTempDir({ slug: 'enroll-attribution' });
      setupEnrollFixture({ dir });
      setRealClaudeFirstRunAccepted({ dir });

      // the real claude first on PATH; its real ~/.claude credentials stay in reach
      const env = { PATH: `${binDir}${delimiter}${process.env.PATH ?? ''}` };
      const enrolled = await genEnrolledRealClone({ dir, env });
      return { dir, env, ...enrolled };
    });
    afterAll(async () => {
      await scene.bg.kill();
    });

    when('[t0] the clone takes one turn', () => {
      const turn = useThen('the turn round-trips', () =>
        sayAndPollForMarker({
          address: scene.address,
          what: `Reply with only this token and no other text: ${MARKER}`,
          marker: MARKER,
          dir: scene.dir,
          env: scene.env,
          getScreen: () => scene.bg.getOutput(),
        }),
      );
      const witness = useThen('its transcript is read', () =>
        getCloneWitness({ repoPath: scene.repoPath, clone: scene.clone }),
      );

      then('the turn lands, so the transcript covers a live session', () => {
        expect(turn.said.status).toEqual(0);
        expect(turn.landed).toBe(true);
        expect(witness.text).toContain(MARKER);
      });

      then('no attachment carries a commit or pr attribution text', () => {
        expect(getAttributionAttachments({ transcript: witness.text })).toEqual(
          [],
        );
      });

      then('the transcript holds no co-author trailer or claude footer', () => {
        expect(witness.text).not.toContain('Co-Authored-By: Claude');
        expect(witness.text).not.toContain('Generated with [Claude Code]');
      });

      then('the booted config and the emitted attachments match the snapshot', () => {
        // the deterministic slice of a live run: the bytes booted, the reminders emitted
        expect({
          actor: witness.actorDirName,
          attribution: witness.attribution,
          attributionAttachments: getAttributionAttachments({ transcript: witness.text }),
        }).toMatchSnapshot();
      });
    });
  });

  given('[case2] a grove that asks for its own attribution text', () => {
    const scene = useBeforeAll(async () => {
      // a temp HOME: only the credential is shared, so the host's grove never reaches the run
      const { home, binDir } = genIsolatedClaudeHome({
        slug: 'enroll-attribution-home',
      });

      // the grove — the user rank the clone boots — asks for a trailer and a footer
      const grovePath = join(home, '.claude', 'settings.json');
      writeFileSync(grovePath, GROVE_BYTES);

      const dir = genTempDir({ slug: 'enroll-attribution-grove' });
      setupEnrollFixture({ dir });

      // the isolated HOME; the cached claude first on PATH
      const env = {
        ...envIsolated(home),
        PATH: `${binDir}${delimiter}${process.env.PATH ?? ''}`,
        CLAUDE_CONFIG_DIR: undefined,
      };
      const enrolled = await genEnrolledRealClone({ dir, env });
      return { dir, env, grovePath, ...enrolled };
    });
    afterAll(async () => {
      await scene.bg.kill();
    });

    when('[t0] the clone takes one turn', () => {
      const turn = useThen('the turn round-trips', () =>
        sayAndPollForMarker({
          address: scene.address,
          what: `Reply with only this token and no other text: ${MARKER_GROVE}`,
          marker: MARKER_GROVE,
          dir: scene.dir,
          env: scene.env,
          getScreen: () => scene.bg.getOutput(),
        }),
      );
      const witness = useThen('its transcript is read', () =>
        getCloneWitness({ repoPath: scene.repoPath, clone: scene.clone }),
      );

      then('the turn lands, so the transcript covers a live session', () => {
        expect(turn.said.status).toEqual(0);
        expect(turn.landed).toBe(true);
        expect(witness.text).toContain(MARKER_GROVE);
      });

      then('the actor config outranks the grove: no attribution attachment', () => {
        expect(getAttributionAttachments({ transcript: witness.text })).toEqual(
          [],
        );
        expect(witness.text).not.toContain(GROVE_SENTINEL);
      });

      then('the grove file is left byte-identical', () => {
        // the human's own settings are never written; only the actor config is
        expect(readFileSync(scene.grovePath, 'utf-8')).toEqual(GROVE_BYTES);
      });

      then('the booted config and the emitted attachments match the snapshot', () => {
        // the grove's own ask sits beside the booted key, so the snap shows which one won
        expect({
          groveAsked: (
            JSON.parse(readFileSync(scene.grovePath, 'utf-8')) as {
              attribution: unknown;
            }
          ).attribution,
          actor: witness.actorDirName,
          attribution: witness.attribution,
          attributionAttachments: getAttributionAttachments({ transcript: witness.text }),
        }).toMatchSnapshot();
      });
    });
  });

  given('[case3] a peer clone of a specific roleset (a hash actor)', () => {
    const scene = useBeforeAll(async () => {
      const { binDir } = getRealClaudeOrThrow();

      const dir = genTempDir({ slug: 'enroll-attribution-peer' });
      setupEnrollFixture({ dir });
      setRealClaudeFirstRunAccepted({ dir });

      // a roleset without the driver: the shape of a fleet peer, in its own hash actor
      const env = { PATH: `${binDir}${delimiter}${process.env.PATH ?? ''}` };
      const enrolled = await genEnrolledRealClone({
        dir,
        env,
        roles: ['mechanic'],
      });
      return { dir, env, ...enrolled };
    });
    afterAll(async () => {
      await scene.bg.kill();
    });

    when('[t0] the clone takes one turn', () => {
      const turn = useThen('the turn round-trips', () =>
        sayAndPollForMarker({
          address: scene.address,
          what: `Reply with only this token and no other text: ${MARKER_PEER}`,
          marker: MARKER_PEER,
          dir: scene.dir,
          env: scene.env,
          getScreen: () => scene.bg.getOutput(),
        }),
      );
      const witness = useThen('its transcript is read', () =>
        getCloneWitness({ repoPath: scene.repoPath, clone: scene.clone }),
      );

      then('the clone lives in a hash actor, not the repo actor', () => {
        expect(witness.actorDirName).toMatch(/^actor\.via\.hash=/);
      });

      then('the turn lands, so the transcript covers a live session', () => {
        expect(turn.said.status).toEqual(0);
        expect(turn.landed).toBe(true);
        expect(witness.text).toContain(MARKER_PEER);
      });

      then('no attachment carries a commit or pr attribution text', () => {
        expect(getAttributionAttachments({ transcript: witness.text })).toEqual(
          [],
        );
        expect(witness.text).not.toContain('Co-Authored-By: Claude');
        expect(witness.text).not.toContain('Generated with [Claude Code]');
      });

      then('the booted config and the emitted attachments match the snapshot', () => {
        // the hash differs per roleset; the snap pins only that it is a hash actor
        expect({
          actor: witness.actorDirName.replace(/=.*$/, '=$HASH'),
          attribution: witness.attribution,
          attributionAttachments: getAttributionAttachments({ transcript: witness.text }),
        }).toMatchSnapshot();
      });
    });
  });
});
