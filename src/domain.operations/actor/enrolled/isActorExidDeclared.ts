/**
 * .what = whether an actor exid is a declared one — `slug=<x>` or `slug=<x>._.delta=<h>`
 * .why = a declared actor re-derives from `.agent/actors.yml`; a hash or repo actor never does,
 *        so each sweep asks this one question rather than test the exid prefix by hand
 */
export const isActorExidDeclared = (input: { exid: string }): boolean =>
  input.exid.startsWith('slug=');
