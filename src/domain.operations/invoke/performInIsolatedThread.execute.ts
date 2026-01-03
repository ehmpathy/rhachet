import type { ProcedureInput } from 'as-procedure';
import { BadRequestError, UnexpectedCodePathError } from 'helpful-errors';
import {
  deSerialBase64,
  deSerialJSON,
  isSerialBase64,
  isSerialJSON,
} from 'serde-fns';

import type { InvokeOpts } from '@src/domain.objects/InvokeOpts';

import { getRegistriesByOpts } from './getRegistriesByOpts';
import { performInCurrentThreadForActor } from './performInCurrentThreadForActor';
import { performInCurrentThreadForStitch } from './performInCurrentThreadForStitch';

/**
 * .what = executes the performance of a skill within a currently isolated thread
 * .why = branches between stitch-mode and actor-mode based on RHACHET_INVOKE_MODE env
 * .how =
 *   - reads mode from environment variable
 *   - stitch-mode: performs via performInCurrentThreadForStitch (thread.stitch)
 *   - actor-mode: performs via performInCurrentThreadForActor (brain.act)
 */
export const executePerformInIsolatedThread = async (input: {
  opts: InvokeOpts<{
    config: string;
    role: string;
    skill: string;
    // stitch-mode fields
    ask?: string;
    // actor-mode fields
    brain?: string;
    output?: string;
  }>;
}): Promise<void> => {
  // read mode from environment variable; failfast if not declared
  const mode =
    process.env.RHACHET_INVOKE_MODE ??
    UnexpectedCodePathError.throw(
      'RHACHET_INVOKE_MODE should have been set by performInIsolatedThread.invoke',
      { env: process.env },
    );

  // branch based on mode
  if (mode === 'stitch') {
    // grab the registries for the current options
    const registries = await getRegistriesByOpts({ opts: input.opts });

    // perform in the current thread via stitch-mode
    await performInCurrentThreadForStitch({ opts: input.opts, registries });
    return;
  }

  if (mode === 'actor') {
    // perform via actor.act in isolated thread
    await performInCurrentThreadForActor({ opts: input.opts });
    return;
  }

  // unexpected mode
  UnexpectedCodePathError.throw(`unknown RHACHET_INVOKE_MODE: ${mode}`, {
    mode,
    opts: input.opts,
  });
};

/**
 * .what = subthread entrypoint
 * .why =
 *   - when this module is executed directly, automatically execute the attempt
 * .how =
 *   - is main import, run the executor with `workerData`, exit 0/1
 */
if (require.main === module)
  (async () => {
    // decode the payload from env
    const payloadEnvVar: string =
      process.env.RHACHET_INVOKE_OPTS_PAYLOAD ??
      BadRequestError.throw('RHACHET_INVOKE_OPTS_PAYLOAD was not defined');
    const payloadDecoded = deSerialJSON<
      ProcedureInput<typeof executePerformInIsolatedThread>
    >(
      isSerialJSON.assure(deSerialBase64(isSerialBase64.assure(payloadEnvVar))),
    );
    if (!payloadDecoded.opts)
      // basic runtime validation
      throw new BadRequestError('did not find .opts on payload decoded', {
        payloadDecoded,
      });

    // execute against that payload
    await executePerformInIsolatedThread(payloadDecoded);
  })()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
