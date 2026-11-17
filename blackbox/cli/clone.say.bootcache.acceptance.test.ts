import { MalfunctionError } from 'helpful-errors';
import { genTempDir, given, then, useBeforeAll, useThen, when } from 'test-fns';

import {
  enrollCloneAndWaitReady,
  setupEnrollFixture,
  setupRichStubBrainPath,
} from '@/blackbox/.test/infra/enrollCloneHarness';
import { invokeRhachetCliBinaryAsync } from '@/blackbox/.test/infra/invokeRhachetCliBinary';
import { setCloneTranscriptRow } from '@src/.test/assets/setCloneTranscriptRow';
import { getBootCacheLeadPath } from '@src/domain.operations/clone/fleet/getBootCacheLeadPath';
import { getOneBootHashOfActor } from '@src/domain.operations/clone/fleet/getOneBootHashOfActor';
import { getCloneTraceLogPath } from '@src/domain.operations/clone/getCloneTraceLogPath';

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';

/**
 * .what = the actor dir that holds a clone, found by the clone's serial
 */
const getActorDirOfSerial = (input: { dir: string; serial: string }): string => {
  const actorsDir = join(input.dir, '.agent', '.actors');
  const actorDir = readdirSync(actorsDir)
    .map((name) => join(actorsDir, name))
    .find((path) =>
      existsSync(join(path, 'clones', `serial=${input.serial}`)),
    );
  if (!actorDir)
    throw new MalfunctionError('no actor dir holds the enrolled clone', {
      serial: input.serial,
      actorsDir,
      hint: 'check that the enroll wrote the clone under .agent/.actors/<actor>/clones/',
    });
  return actorDir;
};

/**
 * .what = the lead record path of the boot an actor holds now, keyed by the gate's own leaves
 * .note = setup reaches into prod for the on-disk key, so this suite and the gate share one
 *   source of truth for it; the behavior under test is still reached through the real cli
 */
const getLeadPathOfActor = (input: { dir: string; actorDir: string }): string => {
  const bootHash = getOneBootHashOfActor({ actorDir: input.actorDir });
  if (!bootHash)
    throw new MalfunctionError('the enrolled actor holds no boot.md', {
      actorDir: input.actorDir,
      hint: 'check that the enroll rendered the actor boot',
    });
  return getBootCacheLeadPath({ repoPath: input.dir, bootHash });
};

/**
 * .what = append one transcript row to a lead clone's history, as the brain-cli would
 */
const setLeadTranscriptRow = (input: {
  actorDir: string;
  serial: string;
  type: 'user' | 'assistant';
}): void =>
  setCloneTranscriptRow({
    cloneDir: join(input.actorDir, 'clones', `serial=${input.serial}`),
    type: input.type,
  });

/**
 * .what = stderr with the run-specific values masked: clone serials and held seconds
 * .note = the known lead's short serial masks to `@:<lead>`, so a notice that named the wrong
 *   clone as lead reds the snapshot; any other serial masks to `@:<serial>`
 */
const asHoldStderrSnapshotSafe = (input: {
  stderr: string;
  leadSerial: string | null;
}): string =>
  (input.leadSerial === null
    ? input.stderr
    : input.stderr.split(`@:${input.leadSerial.slice(0, 8)}`).join('@:<lead>')
  )
    .replace(/@:[0-9a-f]{8}/g, '@:<serial>')
    .replace(/held \d+\.\ds/g, 'held <n>s')
    .replace(/up to \d+\.\ds/g, 'up to <n>s');

/**
 * .what = json stdout with the run-specific values masked: serials, uuids, iso stamps, ms counts
 */
const asJsonStdoutSnapshotSafe = (stdout: string): string =>
  stdout
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '<uuid>')
    .replace(/@:[0-9a-f]{8}/g, '@:<serial>')
    .replace(/\d{4}-\d{2}-\d{2}T[\d:.]+Z/g, '<iso>')
    .replace(/("[a-zA-Z]*(?:Ms|Seconds|At)"\s*:\s*)\d+(\.\d+)?/g, '$1<n>');

/**
 * .what = the boot cache gate, reached through a real `rhx clone say`
 * .why = proves `invokeCloneSay` calls the gate on a clone's first say: the faulted, held, and
 *   json-mode paths, each through the real cli against stub clones, no key and no live brain
 * .note = the bound math and each decision branch are proven at the function grain in
 *   `holdFirstSayForBootCache.integration.test.ts`; this file proves the wire and the channels
 */
describe('rhx clone say, boot cache gate (acceptance)', () => {
  given('[case1] a fresh clone whose boot lead record cannot be read', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'clone-bootgate' });
      const configDir = genTempDir({ slug: 'clone-bootgate-cfg' });
      setupEnrollFixture({ dir });
      const stubPath = setupRichStubBrainPath({ dir });
      const env = { PATH: stubPath, CLAUDE_CONFIG_DIR: configDir };
      const { bg, serial } = await enrollCloneAndWaitReady({
        dir,
        env,
        as: '@:bootgate',
      });

      // a dir where the lead record belongs: the gate's read faults with EISDIR
      const actorDir = getActorDirOfSerial({ dir, serial });
      mkdirSync(getLeadPathOfActor({ dir, actorDir }), { recursive: true });
      return { dir, env, bg };
    });
    afterAll(async () => scene.bg.kill());

    when('[t0] the clone gets its first say', () => {
      // async, never sync — the live pty must drain while the say runs
      //   (rule.forbid.sync-invoke-while-a-pty-is-live)
      const said = useThen('the say returns', () =>
        invokeRhachetCliBinaryAsync({
          args: ['clone', 'say', '@:bootgate', '--what', 'poke bootgate-1'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('the gate ran: stderr names its fault and that the say goes unheld', () => {
        expect(said.stderr).toContain('🟡 the boot cache gate faulted');
        expect(said.stderr).toContain('this say goes unheld');
      });

      then('the say is still delivered', () => {
        expect(said.status).toEqual(0);
      });

      then('the faulted stderr is locked', () => {
        expect(
          asHoldStderrSnapshotSafe({
            stderr: said.stderr.split(scene.dir).join('<dir>'),
            leadSerial: null,
          }),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case2] two clones of one boot; the lead has sent and not answered', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'clone-bootheld' });
      const configDir = genTempDir({ slug: 'clone-bootheld-cfg' });
      setupEnrollFixture({ dir });
      const stubPath = setupRichStubBrainPath({ dir });
      const env = { PATH: stubPath, CLAUDE_CONFIG_DIR: configDir };
      const lead = await enrollCloneAndWaitReady({ dir, env, as: '@:bootlead' });
      const follower = await enrollCloneAndWaitReady({
        dir,
        env,
        as: '@:bootfollow',
      });
      const actorDir = getActorDirOfSerial({ dir, serial: lead.serial });
      return { dir, env, lead, follower, actorDir };
    });
    afterAll(async () => {
      await scene.lead.bg.kill();
      await scene.follower.bg.kill();
    });

    when('[t0] the follower gets its first say, and the lead answers 10s in', () => {
      const said = useThen('the say returns', async () => {
        // the lead claimed and sent its first request just now; no answer yet
        // .note = stamped here, not in the beforeAll, so a slow peer setup cannot age the claim
        //   past its bound before the say runs
        mkdirSync(join(scene.dir, '.agent', '.actors', '.boot.leads'), {
          recursive: true,
        });
        writeFileSync(
          getLeadPathOfActor({ dir: scene.dir, actorDir: scene.actorDir }),
          `${JSON.stringify({ serial: scene.lead.serial, claimedAtMs: Date.now() })}\n`,
        );
        setLeadTranscriptRow({
          actorDir: scene.actorDir,
          serial: scene.lead.serial,
          type: 'user',
        });
        // .note = 10s, not less: a cold say on a loaded box can take seconds to reach the gate, and
        //   an answer that lands first reads as warm, so the hold this case proves never begins
        const answered = new Promise((done) => setTimeout(done, 10_000)).then(
          () =>
            setLeadTranscriptRow({
              actorDir: scene.actorDir,
              serial: scene.lead.serial,
              type: 'assistant',
            }),
        );
        const result = await invokeRhachetCliBinaryAsync({
          args: ['clone', 'say', '@:bootfollow', '--what', 'poke bootheld-1'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
        await answered;
        return result;
      });

      then('the say is delivered, exit 0', () => {
        expect(said.status).toEqual(0);
      });

      then('stderr names the hold as it begins and as it ends', () => {
        expect(said.stderr).toContain('ℹ held for the boot cache, up to');
        expect(said.stderr).toContain('this clone reads the boot from cache');
      });

      then('stdout carries no hold line', () => {
        expect(said.stdout).not.toContain('boot cache');
      });

      then('the held stderr is locked', () => {
        expect(
          asHoldStderrSnapshotSafe({ stderr: said.stderr, leadSerial: scene.lead.serial }),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case4] a cold fleet of four clones of one boot, no lead record seeded', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'clone-bootfleet' });
      const configDir = genTempDir({ slug: 'clone-bootfleet-cfg' });
      setupEnrollFixture({ dir });
      const stubPath = setupRichStubBrainPath({ dir });
      const env = { PATH: stubPath, CLAUDE_CONFIG_DIR: configDir };
      // .note = 60s readiness: four serial enrolls under a full suite outrun the 20s default
      const first = await enrollCloneAndWaitReady({
        dir,
        env,
        as: '@:fleet1',
        timeoutMs: 60_000,
      });
      const second = await enrollCloneAndWaitReady({
        dir,
        env,
        as: '@:fleet2',
        timeoutMs: 60_000,
      });
      // a gap past the 2s spawn tolerance: neither clone of [t2] can link a transcript of a clone
      //   that says (fulcrum F13), on a fast box or a slow one
      await new Promise((done) => setTimeout(done, 2_500));

      // a live clone that never says: the lead of [t2], claimed and never sent
      const quiet = await enrollCloneAndWaitReady({
        dir,
        env,
        as: '@:fleet3',
        timeoutMs: 60_000,
      });
      // the sayer of [t2], spawned beside only clones that never say
      // .note = a clone spawned within 2s of a said peer can link that peer's transcript, as
      //   the spawn window admits it (fulcrum F13), and then reads as already started
      await new Promise((done) => setTimeout(done, 2_500));
      const fourth = await enrollCloneAndWaitReady({
        dir,
        env,
        as: '@:fleet4',
        timeoutMs: 60_000,
      });
      const actorDir = getActorDirOfSerial({ dir, serial: first.serial });
      return { dir, env, first, second, quiet, fourth, actorDir };
    });
    afterAll(async () => {
      await scene.first.bg.kill();
      await scene.second.bg.kill();
      await scene.quiet.bg.kill();
      await scene.fourth.bg.kill();
    });

    when('[t0] the first clone gets the fleet\'s first say', () => {
      const said = useThen('the say returns', () =>
        invokeRhachetCliBinaryAsync({
          args: ['clone', 'say', '@:fleet1', '--what', 'poke fleet-1'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        }),
      );

      then('it goes at once, with no hold line', () => {
        expect(said.status).toEqual(0);
        expect(said.stderr).not.toContain('boot cache');
        // and no advisory line of any kind: a stray gate line in other words still reds
        expect(said.stderr).not.toMatch(/^(ℹ|🟡) /mu);
      });

      then('the say wrote the lead record: this clone claimed the boot', () => {
        const record = JSON.parse(
          readFileSync(
            getLeadPathOfActor({ dir: scene.dir, actorDir: scene.actorDir }),
            'utf8',
          ),
        ) as { serial: string };
        expect(record.serial).toEqual(scene.first.serial);
      });

    });

    when('[t1] the second clone says first, after the lead answered', () => {
      const said = useThen('the say returns', () => {
        // the lead's progress rows, seeded into its history as the brain-cli would write them
        // .note = seeded, not read off the stub: clones of one actor share one transcript dir, and
        //   the history link quarantines every transcript as ambiguous once two land in a clone's
        //   spawn window, so a stub fleet's history stays empty (fulcrum F13, measured: four
        //   `.exids/*.ambiguous`, an empty `history/`). the CLAIM above is the real one
        setLeadTranscriptRow({
          actorDir: scene.actorDir,
          serial: scene.first.serial,
          type: 'user',
        });
        setLeadTranscriptRow({
          actorDir: scene.actorDir,
          serial: scene.first.serial,
          type: 'assistant',
        });
        return invokeRhachetCliBinaryAsync({
          args: ['clone', 'say', '@:fleet2', '--what', 'poke fleet-2'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
      });

      then('the record the first say wrote reads as warm: no hold, no line', () => {
        expect(said.status).toEqual(0);
        expect(said.stderr).not.toContain('boot cache');
        // and no advisory line of any kind: a stray gate line in other words still reds
        expect(said.stderr).not.toMatch(/^(ℹ|🟡) /mu);
      });
    });

    when('[t2] the fourth clone says first on a lead that sent and never answers', () => {
      const said = useThen('the say returns', async () => {
        // a live clone that sent its first request and never answers; its 45s bound 10s out
        // .note = 10s of margin: a cold say on a loaded box can take seconds to reach the gate,
        //   and a bound passed before it arrives turns the hold into a silent claim
        setLeadTranscriptRow({
          actorDir: scene.actorDir,
          serial: scene.quiet.serial,
          type: 'user',
        });
        writeFileSync(
          getLeadPathOfActor({ dir: scene.dir, actorDir: scene.actorDir }),
          `${JSON.stringify({ serial: scene.quiet.serial, claimedAtMs: Date.now() - 35_000 })}\n`,
        );
        return invokeRhachetCliBinaryAsync({
          args: ['clone', 'say', '@:fleet4', '--what', 'poke fleet-4'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
      });

      then('it waits to the bound, then goes: exit 0', () => {
        expect(said.status).toEqual(0);
      });

      then('the follower held, never claimed: the lead record still names the quiet lead', () => {
        // a claim here means the gate read the lead as dead or past its bound before it held
        const record = JSON.parse(
          readFileSync(
            getLeadPathOfActor({ dir: scene.dir, actorDir: scene.actorDir }),
            'utf8',
          ),
        ) as { serial: string };
        expect(record.serial).toEqual(scene.quiet.serial);
      });

      then('stderr names the bound: this clone writes the boot itself', () => {
        expect(said.stderr).toContain('this clone writes the boot itself');
      });

      then('the bound stderr is locked', () => {
        expect(
          asHoldStderrSnapshotSafe({ stderr: said.stderr, leadSerial: scene.quiet.serial }),
        ).toMatchSnapshot();
      });
    });
  });

  given('[case3] a json say held on a lead that has not sent', () => {
    const scene = useBeforeAll(async () => {
      const dir = genTempDir({ slug: 'clone-bootjson' });
      const configDir = genTempDir({ slug: 'clone-bootjson-cfg' });
      setupEnrollFixture({ dir });
      const stubPath = setupRichStubBrainPath({ dir });
      const env = { PATH: stubPath, CLAUDE_CONFIG_DIR: configDir };
      const lead = await enrollCloneAndWaitReady({
        dir,
        env,
        as: '@:jsonlead',
        timeoutMs: 60_000,
      });
      const follower = await enrollCloneAndWaitReady({
        dir,
        env,
        as: '@:jsonfollow',
        timeoutMs: 60_000,
      });
      // a clone whose first say is a client command, for [t1]
      const modeler = await enrollCloneAndWaitReady({
        dir,
        env,
        as: '@:jsonmodel',
        timeoutMs: 60_000,
      });
      const actorDir = getActorDirOfSerial({ dir, serial: lead.serial });
      return { dir, env, lead, follower, modeler, actorDir };
    });
    afterAll(async () => {
      await scene.lead.bg.kill();
      await scene.follower.bg.kill();
      await scene.modeler.bg.kill();
    });

    /**
     * .what = seed a lead that sent and never answered, claimed now: a held first say waits ~45s
     */
    const setLeadSentNotAnswered = (): void => {
      setLeadTranscriptRow({
        actorDir: scene.actorDir,
        serial: scene.lead.serial,
        type: 'user',
      });
      writeFileSync(
        getLeadPathOfActor({ dir: scene.dir, actorDir: scene.actorDir }),
        `${JSON.stringify({ serial: scene.lead.serial, claimedAtMs: Date.now() })}\n`,
      );
    };

    when('[t0] the follower gets its first say with `--output json`', () => {
      const said = useThen('the say returns', async () => {
        // the lead claimed just now and has not sent: the 5s short bound ends the hold
        // .note = the full 5s of margin: a cold say on a loaded box can take seconds to reach the
        //   gate, and a bound passed before it arrives turns the hold into a silent claim (red
        //   once with 1.5s of margin, 2026-11-05)
        mkdirSync(join(scene.dir, '.agent', '.actors', '.boot.leads'), {
          recursive: true,
        });
        writeFileSync(
          getLeadPathOfActor({ dir: scene.dir, actorDir: scene.actorDir }),
          `${JSON.stringify({ serial: scene.lead.serial, claimedAtMs: Date.now() })}\n`,
        );
        return invokeRhachetCliBinaryAsync({
          args: [
            'clone',
            'say',
            '@:jsonfollow',
            '--what',
            'poke bootjson-1',
            '--output',
            'json',
          ],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
      });

      then('the say is delivered, exit 0, and stdout is the json envelope', () => {
        expect(said.status).toEqual(0);
        const parsed = JSON.parse(said.stdout) as { delivered: boolean; verdict: string };
        expect(parsed.delivered).toEqual(true);
        // the stub's screen decides which delivered verdict reads first; the gate decides neither
        expect(['released', 'enqueued']).toContain(parsed.verdict);
        expect(
          asJsonStdoutSnapshotSafe(said.stdout).replace(
            /"verdict": "(released|enqueued)"/,
            '"verdict": "<delivered>"',
          ),
        ).toMatchSnapshot();
      });

      then('stderr holds no hold line: it is a machine channel', () => {
        expect(said.stderr).not.toContain('boot cache');
        // and no advisory line of any kind: a stray gate line in other words still reds
        expect(said.stderr).not.toMatch(/^(ℹ|🟡) /mu);
      });

      then('the hold lines reach the trace log: it began, and the bound ended it', () => {
        // the say ran today; a run that straddles midnight reads both days
        const linesHold = [
          getCloneTraceLogPath({ repoPath: scene.dir, at: new Date(Date.now() - 60_000) }),
          getCloneTraceLogPath({ repoPath: scene.dir, at: new Date() }),
        ]
          .filter((path, index, paths) => paths.indexOf(path) === index)
          .filter((path) => existsSync(path))
          .flatMap((path) => readFileSync(path, 'utf8').split('\n'))
          .filter((line) => line.includes('boot cache'));
        // one row per hold line: the begin and the end never run together
        expect(linesHold).toHaveLength(2);
        expect(linesHold.join('\n')).toContain('held for the boot cache');
        expect(linesHold.join('\n')).toContain('this clone writes the boot itself');
        expect(
          asHoldStderrSnapshotSafe({
            stderr: linesHold.join('\n'),
            leadSerial: scene.lead.serial,
          }),
        ).toMatchSnapshot();
      });
    });

    when('[t1] a fresh clone says a client command first, on a lead that sent and never answers', () => {
      const said = useThen('the say returns', async () => {
        setLeadSentNotAnswered();
        const beganMs = Date.now();
        const result = await invokeRhachetCliBinaryAsync({
          args: ['clone', 'say', '@:jsonmodel', '--what', '/model haiku'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
        return { ...result, elapsedMs: Date.now() - beganMs };
      });

      then('it neither holds nor names the gate: a client command sends no request', () => {
        expect(said.stderr).not.toContain('boot cache');
        // and no advisory line of any kind: a stray gate line in other words still reds
        expect(said.stderr).not.toMatch(/^(ℹ|🟡) /mu);
        // a held say would wait to the ~45s bound
        expect(said.elapsedMs).toBeLessThan(20_000);
      });

      then('it never claims: the lead record still names the lead', () => {
        const record = JSON.parse(
          readFileSync(
            getLeadPathOfActor({ dir: scene.dir, actorDir: scene.actorDir }),
            'utf8',
          ),
        ) as { serial: string };
        expect(record.serial).toEqual(scene.lead.serial);
      });
    });

    when('[t2] the follower says again, on a lead that sent and never answers', () => {
      const said = useThen('the say returns', async () => {
        setLeadSentNotAnswered();
        // the follower's own sent row, seeded as the brain-cli would write it
        // .note = seeded, not read off the stub: three clones of one actor enrolled back to back
        //   share one transcript dir, and the history link quarantines a transcript as ambiguous
        //   once two land in a spawn window, so the stub's own row may never link (fulcrum F13;
        //   red once under a seven-suite run, 2026-11-05)
        setLeadTranscriptRow({
          actorDir: scene.actorDir,
          serial: scene.follower.serial,
          type: 'user',
        });
        const beganMs = Date.now();
        const result = await invokeRhachetCliBinaryAsync({
          args: ['clone', 'say', '@:jsonfollow', '--what', 'poke bootjson-2'],
          cwd: scene.dir,
          env: scene.env,
          logOnError: false,
        });
        return { ...result, elapsedMs: Date.now() - beganMs };
      });

      then('a later say goes at once: only a first say is held', () => {
        expect(said.status).toEqual(0);
        expect(said.stderr).not.toContain('boot cache');
        // and no advisory line of any kind: a stray gate line in other words still reds
        expect(said.stderr).not.toMatch(/^(ℹ|🟡) /mu);
        expect(said.elapsedMs).toBeLessThan(20_000);
      });
    });
  });
});
