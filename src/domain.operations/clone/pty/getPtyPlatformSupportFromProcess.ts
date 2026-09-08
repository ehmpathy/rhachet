import { getLibcFromProcess } from './getLibcFromProcess';
import {
  getPtyPlatformSupport,
  type PtyPlatformSupport,
} from './getPtyPlatformSupport';

/**
 * .what = applies the pure prebuild-support decision to the machine this process runs on
 *
 * ⚠️ the libc word passes through UNCOLLAPSED — never reduce it to a boolean here. an
 *   `unreadable` libc would then read as musl, so a glibc human with a damaged install
 *   would be told to pass `--no-socket` over a defect that was ours.
 */
export const getPtyPlatformSupportFromProcess = (): PtyPlatformSupport =>
  getPtyPlatformSupport({
    platform: process.platform,
    arch: process.arch,
    libc: getLibcFromProcess(),
  });
