import { ConstraintError } from 'helpful-errors';

import type { KeyrackKeyHostMeta } from '@src/domain.objects/keyrack/KeyrackKeyHostMeta';

import type { DeclastructAws } from './getOneDeclastructAws';
import { getOneDeclastructAws } from './getOneDeclastructAws';
import { getOneKeyrackAwsParamEndpoint } from './getOneKeyrackAwsParamEndpoint';
import { isKeyrackAwsParamMeta } from './isKeyrackAwsParamMeta';
import { isKeyrackAwsParamName } from './isKeyrackAwsParamName';

/**
 * .what = the shared pre-SSM readiness prechecks for an aws.params op — exid name legal (gate 0)
 *         + peer present (gate 1) + region present (gate 3), the three gates knowable before any
 *         SSM call, in precedence order — plus the resolved optional SSM endpoint (real AWS in
 *         prod; a local emulator under test)
 * .why = unlock and get both need gates 0 + 1 + 3 before any SSM call; one source enforces the
 *        order so the two call sites cannot drift
 *
 * .note = this does NOT cover AWS-side authorization (identity/read/decrypt) — those surface
 *         inside the actual SSM call; this is a pre-SSM precheck only
 */
export const getOneKeyrackAwsParamReadyContext = async (input: {
  exid: string | null | undefined;
  meta: KeyrackKeyHostMeta | null;
}): Promise<{
  declastruct: DeclastructAws;
  region: string;
  exid: string;
  endpoint: string | null;
}> => {
  // gate 0a: aws.params always registers an exid at set, so an absent exid is a corrupt manifest.
  // owned here — not at each call site — so unlock() and get() share ONE canonical message and
  // cannot drift (the presence check is upstream of the name/peer/region gates, same as those)
  if (!input.exid)
    ConstraintError.throw('aws.params requires an exid', {
      input,
      hint: 'the manifest entry must carry the ssm parameter path (register via keyrack set)',
    });

  // gate 0: the exid is a legal SSM name — a malformed explicit --exid fails loud first
  isKeyrackAwsParamName.assure(input.exid);

  // gate 1: peer absent → fail loud with the install fix
  const declastruct = await getOneDeclastructAws();

  // gate 3: region recorded at set + carried in meta; NOT ambient. narrow the stored open-union
  // meta to { region: string } — no as-cast; fail loud with the gate-3 fix if the narrow fails.
  // .note = deliberately `.assess` + a manual ConstraintError, NOT `.assure`: type-fns's `.assure`
  //         throws a fixed AssureIsOfTypeRejectionError with no per-call hint, which would drop the
  //         actionable "re-run set with a region in scope" fix criteria uc15 requires. so gate 0's
  //         `.assure` idiom is intentionally not used here — the hint is worth the manual throw
  if (!isKeyrackAwsParamMeta.assess(input.meta))
    ConstraintError.throw('aws.params requires a region', {
      input,
      hint: 're-run set with a region in scope (AWS_REGION) so it is recorded in meta.region',
    });

  // the SSM endpoint: null in prod (the SDK resolves the real AWS endpoint), or a local SSM
  // emulator URL under test. sourced from the ONE shared communicator getOneKeyrackAwsParamEndpoint
  // so the read path (here) and the github-app persist path cannot drift; the endpoint is the ONE
  // injection point the acceptance/journey harness uses to point the real SSMClient at the emulator
  // (a real backend swap, not a mock — rule.forbid.acceptance.mocks holds)
  const endpoint = getOneKeyrackAwsParamEndpoint();

  return { declastruct, region: input.meta.region, exid: input.exid, endpoint };
};
