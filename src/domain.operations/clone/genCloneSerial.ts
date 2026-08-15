import { getUuid } from 'uuid-fns';

/**
 * .what = mint a fresh serial — the clone's stable primary id
 * .why = every spawn of an actor is a distinct clone with its own socket,
 *   history, and lifecycle; the serial is what `say`/`get`/`list` address it by
 *   when no `--as` slug was given (and the primary ref even when one was)
 */
export const genCloneSerial = (): string => getUuid();
