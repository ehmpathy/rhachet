import { MalfunctionError } from 'helpful-errors';
import type { IsoTimeStamp } from 'iso-time';

import type { KeyrackKeyGrant } from '@src/domain.objects/keyrack/KeyrackKeyGrant';

/**
 * .what = the outcome of one silent renew attempt for an sso grant
 * .why = a renew has exactly two answers it may act on; every other outcome is a
 *        thrown fault, which the tick counts and retries — never a lapse
 */
export type SsoGrantRenewal =
  | { status: 'renewed'; expiresAt: IsoTimeStamp }
  | { status: 'lapsed' };

/**
 * .what = renew an aws sso grant from the live portal session, silently
 * .why = the role creds behind an sso grant end in about an hour, while the portal
 *        session behind them lives for hours. the silent proof re-derives the role
 *        creds with no browser; a lapsed portal answers `lapsed` at once
 *
 * .note = never reaches `aws sso login`. the browser path is unreachable from here by
 *         construction, so a lapsed portal can never hang the daemon on a prompt
 * .note = the grant's secret is the sso profile name (aws.config holds a reference,
 *         never creds), so the profile is read off the grant itself
 * .note = the imports are lazy: a daemon that holds no sso grant never loads the aws
 *         sdk (rule.require.thinnest-import-path)
 * .note = an unknown error throws (a MalfunctionError from the proof or the mech); the
 *         caller counts it as a fault, never as a lapse
 */
export const getOneSsoGrantRenewal = async (input: {
  grant: KeyrackKeyGrant;
}): Promise<SsoGrantRenewal> => {
  const profileName = input.grant.key.secret;

  // prove the portal session live, with no browser
  const { getOneAwsSsoSessionProof } = await import(
    '@src/domain.operations/keyrack/adapters/vaults/aws.config/getOneAwsSsoSessionProof'
  );
  const proof = await getOneAwsSsoSessionProof({
    profileName,
    onInvalidLevel: 'debug',
  });
  if (!proof.live) return { status: 'lapsed' };

  // re-read the role creds' expiry from the cli
  const { mechAdapterAwsSso } = await import(
    '@src/domain.operations/keyrack/adapters/mechanisms/aws.sso/mechAdapterAwsSso'
  );
  const { expiresAt } = await mechAdapterAwsSso.deliverForGet({
    source: profileName,
  });

  // a renew with no expiry would store a grant that never dies; fail loud instead
  if (!expiresAt)
    throw new MalfunctionError('sso renew returned no expiry', { profileName });

  return { status: 'renewed', expiresAt };
};
