import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { invokeRhachetCliBinary } from './invokeRhachetCliBinary';

/**
 * .what = end every clone baked under one test repo, the way a human ends one: a `/exit`
 *   said into it, so its brain exits and its detached host exits behind it
 * .why = an enroll returns while its detached host lives on with its brain. a suite that
 *   bakes clones and never ends them leaves one host + one brain per bake — measured
 *   2026-11-14: one run of `enroll.actors-yml.integration` left 14 stub brains, each held
 *   by a live `run.jit enroll` host. call this in each scene's `afterAll`
 * .note = teardown only. a say to a clone already gone is not a fault here, so its status is
 *   not asserted; the stub census (`rhx test.stubs.count`) is the read-back
 */
export const endClonesBakedIn = (input: {
  repoDir: string;
  env: Record<string, string> | null;
}): void => {
  // every actor dir under the repo, then every clone serial under each
  const actorsDir = join(input.repoDir, '.agent', '.actors');
  if (!existsSync(actorsDir)) return;
  const serials = readdirSync(actorsDir).flatMap((actorDirName) => {
    const clonesDir = join(actorsDir, actorDirName, 'clones');
    if (!existsSync(clonesDir)) return [];
    return readdirSync(clonesDir)
      .filter((name) => name.startsWith('serial='))
      .map((name) => name.slice('serial='.length));
  });

  // say `/exit` into each; the brain ends itself, so its host drains and exits
  for (const serial of serials)
    invokeRhachetCliBinary({
      args: ['clone', 'say', `@:${serial}`, '--what', '/exit'],
      cwd: input.repoDir,
      ...(input.env ? { env: input.env } : {}),
      logOnError: false,
    });
};
