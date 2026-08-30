/**
 * .what = drop the `absent` omissions that a reach target has since contradicted
 * .why = a reachless target is kept for every slug (it walks the reachless twin and the
 *        `env=all` fallback), so for a key cut ONLY at reaches it misses and files `absent`
 *        while the reach targets beside it report the truth. to render both is to tell a
 *        human one key is simultaneously held and unheld (rule.forbid.surprises)
 *
 * .note = ONLY `absent` is dropped. `remote`, `lost`, and `errored` each name a fault of the
 *         very address that hit, so they stand whatever a peer target did
 * .note = the caller flags a slug ONLY for a reach target that goes on to produce a row of
 *         its own. a target that is skipped must never flag, or this prune would delete the
 *         one signal a human had and the key would vanish from the report entirely
 */
export const getAllKeyrackOmissionsExceptHeldAtReach = <
  TOmission extends { slug: string; reason: string },
>(input: {
  omissions: TOmission[];
  slugsHeldAtReach: Set<string>;
}): TOmission[] =>
  input.omissions.filter((omission) => {
    const isFalseAbsence =
      omission.reason === 'absent' && input.slugsHeldAtReach.has(omission.slug);
    return !isFalseAbsence;
  });
