import { ConstraintError } from 'helpful-errors';

/**
 * .what = the subject slugs a `--subject` flag names
 * .why = the subject contract has ONE owner, rather than a split/map pipeline a reader must
 *        simulate at each call site (`rule.require.named-transformers`)
 *
 * .note = `raw` holds one entry per `--subject` occurrence (`asSubjectFlagValues`), and each
 *   entry may itself be comma-separated. so `--subject a,b` and `--subject a --subject b`
 *   yield the same slugs — neither form drops a subject
 *
 * .note = an absent flag yields `undefined`, never `[]`. the two mean different things to
 *   the boot plan: absent = boot every subject; empty = boot none.
 *
 * .note = a blank slug is refused here. `--subject ''` (often an unset shell variable) or a
 *   stray comma (`a,,b`) names no subject, and to pass it on would surface downstream as a
 *   `subject not found: ` with an empty name
 */
export const getAllSubjectSlugs = (input: {
  raw: string[] | undefined;
}): string[] | undefined => {
  if (input.raw === undefined) return undefined;
  const slugs = input.raw.flatMap((entry) =>
    entry.split(',').map((slug) => slug.trim()),
  );

  // refuse a blank slug; it names no subject
  if (slugs.some((slug) => slug === ''))
    ConstraintError.throw('--subject names a blank slug', {
      subject: input.raw.join(' --subject '),
      expected:
        'one or more subject slugs, e.g. --subject alpha,beta or --subject alpha --subject beta',
      hint: 'name each subject, or omit --subject to boot every subject',
    });

  return slugs;
};
