import { asKeyrackDeclastructPeerDefect } from './asKeyrackDeclastructPeerDefect';

/**
 * .what = the merged declastruct-aws surface aws.params uses: the deep-imported sdkSsm module
 *         (raw read) plus the public DAO write ops (setSsmParameterSecure + its domain object)
 * .why = the two directions use two seams by design — READ goes through the raw sdkSsm
 *        communicator (the public DAO get is value-blind, @writeonly), WRITE goes through the
 *        public setSsmParameterSecure DAO (the vision's required persist path for owned-source
 *        mechs). one loader hands back both so a caller picks the right seam per direction
 */
export type DeclastructAws =
  typeof import('declastruct-aws/dist/access/sdks/sdkSsm') &
    typeof import('declastruct-aws');

/**
 * .what = load the declastruct-aws surface at call time (both the deep sdkSsm read seam and the
 *         public DAO write seam)
 * .why = aws.params needs the AWS SDK only when used; a lazy import keeps the core lean and pays
 *        the cost only on a real unlock/set (called once per unlock, not per get)
 *
 * .note = sdkSsm is deep-imported from the internal dist path because it is not on the package
 *         entrypoint; the DAO write ops ARE on the entrypoint, so they load from the public module
 * .follow-up = publish getOneParameter on declastruct-aws's entrypoint, then drop the deep
 *              import. tracked in this route's open items (3.3.1.blueprint.product.yield.md);
 *              the integration tests guard against an internal reshuffle meanwhile
 */
export const getOneDeclastructAws = async (): Promise<DeclastructAws> => {
  try {
    const [sdk, pub] = await Promise.all([
      import('declastruct-aws/dist/access/sdks/sdkSsm'),
      import('declastruct-aws'),
    ]);
    return { ...sdk, ...pub };
  } catch (cause) {
    // classify: a peer-absent module-not-found → a ConstraintError that names the install fix;
    // any other error → null, so it rethrows unchanged (an allowlist, never a fail-hide catch-all)
    const defect = asKeyrackDeclastructPeerDefect(cause);
    if (!defect) throw cause;
    throw defect;
  }
};
