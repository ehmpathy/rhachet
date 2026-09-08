/**
 * .what = casts a host's platform and arch into the `platform-arch` tuple node-pty
 *   names its prebuilt addons by
 *
 * ⚠️ the separator and the field order are UPSTREAM's — node-pty probes
 *   `prebuilds/${platform}-${arch}`. neither is ours to change.
 */
export const asPtyHostTuple = (input: {
  platform: string;
  arch: string;
}): string => `${input.platform}-${input.arch}`;
