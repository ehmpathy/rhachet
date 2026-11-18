import { HOOK_DISPATCH } from './constants';

/**
 * .what = the shell command claude runs for one event's dispatcher:
 *   `bash <bin> <manifest> <event>`
 * .why = one builder, beside its one parser (`asManifestPathOfHookDispatcherCommand`), so the two
 *   cannot drift; a round-trip test holds them together
 */
export const asHookDispatcherCommand = (input: {
  manifestPathRel: string;
  event: string;
}): string =>
  `bash ${HOOK_DISPATCH.bin} ${input.manifestPathRel} ${input.event}`;
