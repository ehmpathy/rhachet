// deep-import: ContextAwsApi + sdkSsm are NOT on declastruct-aws's public entrypoint
// (dist/contract/sdks/index) — only the metadata-only DAO ops are (its DAO get is @writeonly,
// value-blind by design, so there is NO public read seam to use instead). keyrack reaches the
// read seam at its internal dist path directly.
// .follow-up = publish getOneParameter + ContextAwsApi on declastruct-aws's entrypoint, then
//              swap this deep-import for the public one. tracked in this route's open items
//              (3.3.1.blueprint.product.yield.md → open items → declastruct-aws export map).
//              the integration tests are the safety net against an internal reshuffle meanwhile
import type { ContextAwsApi } from 'declastruct-aws/dist/domain.objects/ContextAwsApi';

import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * .what = build a ContextAwsApi from a region (+ filler for the fields the SSM read never reads)
 * .why = getOneParameter reads only aws.credentials.region, but ContextAwsApi's type demands
 *        account + tunnel cache dirs; supply filler for those so the read composes
 *
 * .note = declastruct-aws 1.10.1's ContextAwsApi has NO endpoint field, and every sdkSsm op
 *         builds `new SSMClient({ region })` only — so no endpoint override rides the context.
 *         there is no local SSM emulator lane: the integration + acceptance tests exercise the
 *         real SSM boundary against a live identity vended through keyrack (useKeyrack).
 *         the AWS SDK's own AWS_ENDPOINT_URL_SSM env var is read by the SDK itself, below keyrack
 *         — an operator must not set it in a prod/grove process (the same discipline as any AWS
 *         SDK env var); keyrack has no app-level seam to gate an SDK-native variable
 */
export const asContextAwsApi = (input: { region: string }): ContextAwsApi => ({
  aws: {
    credentials: {
      // account is unused-by-this-call — getOneParameter reads only region
      account: 'unused-by-aws-params-read',
      region: input.region,
    },
    cache: {
      // the tunnel cache dirs are unused-by-this-call — the SSM read opens no tunnel
      DeclaredAwsSsmVpcTunnel: {
        processes: { dir: join(tmpdir(), 'keyrack-aws-params-unused') },
      },
    },
  },
});
