import { asPtyHostTuple } from './asPtyHostTuple';

/**
 * .what = this host's `platform-arch` tuple, read off `process`
 *
 * ⚠️ a TUPLE (`linux-x64`), never a bare platform (`linux`). the peer read
 *   `getPtyPlatformSupportFromProcess` answers at the platform grain; a merge of the two
 *   would put one word on two grains (`term=host`).
 */
export const getPtyHostTupleFromProcess = (): string =>
  asPtyHostTuple({ platform: process.platform, arch: process.arch });
