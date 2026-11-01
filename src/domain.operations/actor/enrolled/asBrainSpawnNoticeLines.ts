import { asBrainGroveAbsentLine } from '@src/domain.operations/actor/enrolled/asBrainGroveAbsentLine';
import { asBrainAuthAbsentLine } from '@src/domain.operations/brain/auth/asBrainAuthAbsentLine';
import { asBrainAuthApiBilledLine } from '@src/domain.operations/brain/auth/asBrainAuthApiBilledLine';
import { isBrainAuthViaEnv } from '@src/domain.operations/brain/auth/isBrainAuthViaEnv';

/**
 * .what = the notices enroll prints to stderr once a brain was spawned, in print order
 * .why = one owner for the three notices and the precedence between them, so the rule
 *   "an env credential holds back the /login hint" is read and tested in one place
 * .note = the caller prints these only when a brain was spawned: a refused enroll and a
 *   live-slug reuse spawn none, so a hint there would name a clone that never started
 */
export const asBrainSpawnNoticeLines = (input: {
  env: NodeJS.ProcessEnv;
  brainAuthPath: string;
  isBrainAuthAbsent: boolean;
  grove: { isPresent: boolean; source: string };
}): string[] => {
  // the no-login hint, unless an env credential outranks the login: then /login names a fix
  //   the clone does not need (a token) or one that would not change the bill (a key)
  const absentLine =
    input.isBrainAuthAbsent && !isBrainAuthViaEnv({ env: input.env })
      ? asBrainAuthAbsentLine({ brainAuthPath: input.brainAuthPath })
      : null;

  // the api-billed notice, when a key that bills per call is set
  const apiBilledLine = asBrainAuthApiBilledLine({
    env: input.env,
    isBrainAuthAbsent: input.isBrainAuthAbsent,
  });

  // the grove-absent line, when the box defaults did not reach the clone (vision case=4)
  const groveAbsentLine = input.grove.isPresent
    ? null
    : asBrainGroveAbsentLine({ groveSource: input.grove.source });

  return [absentLine, apiBilledLine, groveAbsentLine].filter(
    (line): line is string => line !== null,
  );
};
