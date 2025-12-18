import type { ProcedureInput } from 'as-procedure';
import { BadRequestError } from 'helpful-errors';
import {
  deSerialBase64,
  deSerialJSON,
  isSerialBase64,
  isSerialJSON,
} from 'serde-fns';

import type { InvokeOpts } from '@src/domain.objects/InvokeOpts';

import { getRegistriesByOpts } from './getRegistriesByOpts';
import { performInCurrentThread } from './performInCurrentThread';

/**
 * .what = executes the performance of a skill within a currently isolated thread
 *   - looks up the registries from the opts
 *   - performs in current thread
 */
export const executePerformInIsolatedThread = async (input: {
  opts: InvokeOpts<{
    config: string;
    ask: string;
    role: string;
    skill: string;
  }>;
}): Promise<void> => {
  // grab the registries for the current options
  const registries = await getRegistriesByOpts({ opts: input.opts });

  // perform in the current thread
  await performInCurrentThread({ opts: input.opts, registries });
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
