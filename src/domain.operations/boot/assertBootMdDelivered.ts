import { MalfunctionError } from 'helpful-errors';

/**
 * .what = prove the `boot.md` read back off disk is the corpus that was rendered
 * .why = rendered == delivered. the write is atomic, so a PARTIAL file cannot be produced
 *        by the render itself. what a rename cannot rule out is a filesystem that took the
 *        bytes and kept other ones — a full disk, a read-only overlay that discards, a fuse
 *        mount that lies. each of those hands a clone a corpus nobody rendered, and the
 *        brain-cli reads it without a word, so the failure is SILENT and WRONG
 *
 * .note = it clamps the render, never the whole life of the file: a third party that drops
 *   `boot.md` after the render returns is past rhachet's reach
 */
export const assertBootMdDelivered = (input: {
  bootMdPath: string;
  rendered: string;
  delivered: string;
}): void => {
  if (input.delivered === input.rendered) return;

  throw new MalfunctionError(
    'brain dir boot.md was written but read back different',
    {
      bootMdPath: input.bootMdPath,
      charsRendered: input.rendered.length,
      charsDelivered: input.delivered.length,
      hint: 'the filesystem under this brain dir did not keep what was written — check for a full disk, a read-only mount, or an overlay that discards writes',
    },
  );
};
