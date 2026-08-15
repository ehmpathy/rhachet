import { MalfunctionError } from 'helpful-errors';
import {
  genTempDir,
  getError,
  given,
  then,
  useBeforeAll,
  when,
} from 'test-fns';

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { findsertActorOndisk } from './findsertActorOndisk';
import { getActorOndiskDir } from './getActorOndiskDir';
import { getAllActorsOndisk } from './getAllActorsOndisk';

/**
 * .what = read the enrollment.jsonl lines for an actor dir
 * .why = the roles-log assertions need the raw appended events
 */
const readRolesLog = (actorDir: string): string[] => {
  const logPath = join(actorDir, 'roles', 'enrollment.jsonl');
  if (!existsSync(logPath)) return [];
  return readFileSync(logPath, 'utf8')
    .split('\n')
    .filter((line) => line.length > 0);
};

describe('findsertActorOndisk.integration', () => {
  given('[case1] a fresh repo, one enrollment', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genTempDir({ slug: 'findsertActorOndisk-fresh' });
      const actor = findsertActorOndisk({
        repoPath,
        brain: 'claude',
        roles: ['mechanic'],
        delta: null,
        reason: 'first enrollment',
        logEnrollment: true,
      });
      return { repoPath, actor };
    });

    when('[t0] the actor is findserted', () => {
      then('the record carries the derived hash + brain + roles', () => {
        expect(scene.actor.hash).toHaveLength(8);
        expect(scene.actor.brain).toEqual('claude');
        expect(scene.actor.roles).toEqual(['mechanic']);
      });

      then('the actor.json manifest exists on disk', () => {
        const dir = getActorOndiskDir({
          repoPath: scene.actor.repoPath,
          hash: scene.actor.hash,
        });
        expect(existsSync(join(dir, 'actor.json'))).toBe(true);
      });

      then('one roles-log event was appended with the reason', () => {
        const dir = getActorOndiskDir({
          repoPath: scene.actor.repoPath,
          hash: scene.actor.hash,
        });
        const lines = readRolesLog(dir);
        expect(lines).toHaveLength(1);
        expect(JSON.parse(lines[0]!).reason).toEqual('first enrollment');
      });
    });

    when('[t1] the enrolled actors are read back', () => {
      then('the round-trip recovers the same identity', () => {
        const [readback] = getAllActorsOndisk({ repoPath: scene.repoPath });
        expect(readback?.hash).toEqual(scene.actor.hash);
        expect(readback?.brain).toEqual('claude');
        expect(readback?.roles).toEqual(['mechanic']);
      });
    });
  });

  given('[case2] identity-by-roleset — same roleset, twice', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genTempDir({ slug: 'findsertActorOndisk-idem' });
      const first = findsertActorOndisk({
        repoPath,
        brain: 'claude',
        roles: ['mechanic', 'driver'],
        delta: null,
        reason: null,
        logEnrollment: true,
      });
      const second = findsertActorOndisk({
        repoPath,
        brain: 'claude',
        roles: ['driver', 'mechanic'], // reordered — must hash the same
        delta: null,
        reason: null,
        logEnrollment: false, // a pure reuse: do NOT append again
      });
      return { repoPath, first, second };
    });

    when('[t0] both enrollments complete', () => {
      then('role order never forks the identity — one hash', () => {
        expect(scene.second.hash).toEqual(scene.first.hash);
      });

      then('only ONE actor exists on disk', () => {
        expect(getAllActorsOndisk({ repoPath: scene.repoPath })).toHaveLength(
          1,
        );
      });

      then('the pure reuse did not append a second roles-log event', () => {
        const dir = getActorOndiskDir({
          repoPath: scene.first.repoPath,
          hash: scene.first.hash,
        });
        expect(readRolesLog(dir)).toHaveLength(1);
      });
    });
  });

  given('[case3] a different roleset in the same repo', () => {
    const scene = useBeforeAll(async () => {
      const repoPath = genTempDir({ slug: 'findsertActorOndisk-distinct' });
      const a = findsertActorOndisk({
        repoPath,
        brain: 'claude',
        roles: ['mechanic'],
        delta: null,
        reason: null,
        logEnrollment: true,
      });
      const b = findsertActorOndisk({
        repoPath,
        brain: 'claude',
        roles: ['driver'],
        delta: null,
        reason: null,
        logEnrollment: true,
      });
      return { repoPath, a, b };
    });

    when('[t0] both enrollments complete', () => {
      then('each lands on a DISTINCT actor', () => {
        expect(scene.a.hash).not.toEqual(scene.b.hash);
        expect(getAllActorsOndisk({ repoPath: scene.repoPath })).toHaveLength(
          2,
        );
      });
    });
  });

  given('[case4] tolerant read of the actors root', () => {
    when('[t0] the actors root is absent entirely', () => {
      const repoPath = genTempDir({ slug: 'findsertActorOndisk-absent' });

      then('no actors are found — never a throw', () => {
        expect(getAllActorsOndisk({ repoPath })).toEqual([]);
      });
    });

    when('[t1] an actor dir has no manifest yet', () => {
      const repoPath = genTempDir({ slug: 'findsertActorOndisk-nomanifest' });
      mkdirSync(
        join(repoPath, '.agent', '.actors', 'actor.via.hash=deadbeef'),
        { recursive: true },
      );

      then('the half-built dir is skipped, not read as corrupt', () => {
        expect(getAllActorsOndisk({ repoPath })).toEqual([]);
      });
    });

    when('[t2] an actor.json is corrupt (not valid JSON)', () => {
      const repoPath = genTempDir({ slug: 'findsertActorOndisk-corrupt' });
      const dir = join(
        repoPath,
        '.agent',
        '.actors',
        'actor.via.hash=cafef00d',
      );
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, 'actor.json'), '{ not json', 'utf8');

      then('it fails loud with a MalfunctionError', async () => {
        const error = await getError(() => getAllActorsOndisk({ repoPath }));
        expect(error).toBeInstanceOf(MalfunctionError);
      });
    });

    when('[t3] an actor.json is a NEWER schema than we know', () => {
      const repoPath = genTempDir({ slug: 'findsertActorOndisk-newer' });
      const dir = join(
        repoPath,
        '.agent',
        '.actors',
        'actor.via.hash=facefeed',
      );
      mkdirSync(dir, { recursive: true });
      // valid json, but a schemaVersion from the future we cannot safely read
      writeFileSync(
        join(dir, 'actor.json'),
        JSON.stringify({
          schemaVersion: 9999,
          brain: 'claude',
          roles: ['mechanic'],
        }),
        'utf8',
      );

      then('it fails loud, and names the upgrade fix', async () => {
        const error = await getError(() => getAllActorsOndisk({ repoPath }));
        expect(error).toBeInstanceOf(MalfunctionError);
        expect(error?.message).toContain('newer schema');
      });
    });

    when('[t4] an actor.json is absent its required fields', () => {
      const repoPath = genTempDir({ slug: 'findsertActorOndisk-nofields' });
      const dir = join(
        repoPath,
        '.agent',
        '.actors',
        'actor.via.hash=0ddba110',
      );
      mkdirSync(dir, { recursive: true });
      // valid json, but roles is absent — a structurally corrupt manifest
      writeFileSync(
        join(dir, 'actor.json'),
        JSON.stringify({ brain: 'claude' }),
        'utf8',
      );

      then('it fails loud with a MalfunctionError', async () => {
        const error = await getError(() => getAllActorsOndisk({ repoPath }));
        expect(error).toBeInstanceOf(MalfunctionError);
      });
    });
  });
});
