/**
 * .what = the base slug of a declared actor's exid — `slug=<x>` or `slug=<x>._.delta=<h>` → `<x>`
 * .why = a derived actor re-derives from its base, and the exid alone names that base
 */
export const asSlugBaseOfActorExid = (input: { exid: string }): string =>
  input.exid.slice('slug='.length).split('._.delta=')[0] ?? '';
