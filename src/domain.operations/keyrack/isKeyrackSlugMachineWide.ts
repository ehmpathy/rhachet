import { asKeyrackSlugOrgKind } from './asKeyrackSlugOrgKind';

/**
 * .what = is this ONE slug machine-wide — the `@all` org sigil?
 * .why = a machine-wide key belongs to the box's own namespace, so no repo manifest can declare
 *        it. every read path that must skip the manifest asks this question, and it was asked
 *        inline at several sites before it earned a name
 *
 * .note = the test is the ORG SEGMENT of a VALID slug, exactly — never a loose match on the
 *         string `all`, and never a bare split that trusts a malformed key:
 *         - `@allstar.prep.FOO` ⇒ false (a real org whose name merely starts with the letters)
 *         - `ehmpathy.all.FOO` ⇒ false (that is `env.all`, a different axis of the slug)
 *         - `@all.badenv.FOO` ⇒ false (not a full slug at all — a bare key name with dots)
 * .note = built on `asKeyrackSlugOrgKind` rather than its own parser, so it cannot disagree with
 *         `isKeyrackSlugRepoBound` about the same string
 */
export const isKeyrackSlugMachineWide = (input: { slug: string }): boolean =>
  asKeyrackSlugOrgKind({ slug: input.slug }) === 'machine-wide';
