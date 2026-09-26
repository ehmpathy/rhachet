import { BOOT_STATS_ZERO, type BootStats } from './BootStats';

/**
 * .what = join per-role boot contents into one corpus — bodies in input order, stats summed
 * .why = a brain dir holds one `boot.md` for all its roles; the caller owns the order
 */
export const asBootCorpus = (input: {
  contents: { body: string; stats: BootStats }[];
}): { body: string; stats: BootStats } => ({
  body: input.contents.map((content) => content.body).join(''),
  stats: input.contents.reduce<BootStats>(
    (sum, content) => ({
      roles: sum.roles + content.stats.roles,
      files: sum.files + content.stats.files,
      briefsSay: sum.briefsSay + content.stats.briefsSay,
      briefsRef: sum.briefsRef + content.stats.briefsRef,
      skillsSay: sum.skillsSay + content.stats.skillsSay,
      skillsRef: sum.skillsRef + content.stats.skillsRef,
      chars: sum.chars + content.stats.chars,
    }),
    BOOT_STATS_ZERO,
  ),
});
