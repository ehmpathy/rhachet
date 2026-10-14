/**
 * .what = whether an actor ref prefix names this actor exid
 * .why = a human types the exid whole (`@hash=9c1e`) or its value alone (`@9c1e`); both
 *        must reach the actor, git-style, by prefix
 *
 * .note = the value is the exid after its `<namespace>=` token (`hash=9c1e0a7b` → `9c1e0a7b`)
 */
export const isActorExidMatchedByPrefix = (input: {
  exid: string;
  prefix: string;
}): boolean => {
  const value = input.exid.slice(input.exid.indexOf('=') + 1);
  return input.exid.startsWith(input.prefix) || value.startsWith(input.prefix);
};
