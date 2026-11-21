import { asKeyrackSlugFullOrNull } from '../asKeyrackSlugFullOrNull';

/**
 * .what = the env and the slug a machine-wide (no repo manifest) unlock ask names
 * .why = with no manifest to default from, the env comes from `--env`, else from a full-slug
 *        `--key`; and a refusal must name the slug as the human asked for it, never a doubled
 *        `@all.<env>.@all.<env>.<name>`
 *
 * .note = a full-slug ask names itself; a bare key name composes under `@all.<env>`
 * .note = env is null when neither `--env` nor a full slug names one; the caller refuses
 */
export const asKeyrackMachineWideAsk = (input: {
  keyAsk: string | null;
  envFlag: string | null;
}): { env: string | null; slugAsked: string | null } => {
  // decode a full-slug ask once
  const slugFull =
    input.keyAsk === null
      ? null
      : asKeyrackSlugFullOrNull({ key: input.keyAsk });

  // env: the flag, else the full slug's own
  const env = input.envFlag ?? (slugFull?.env || null);

  // no key asked: no slug to name
  if (input.keyAsk === null) return { env, slugAsked: null };

  // a full slug names itself
  if (slugFull !== null) return { env, slugAsked: input.keyAsk };

  // a bare name composes under @all.<env>, once env is known
  return {
    env,
    slugAsked: env === null ? null : `@all.${env}.${input.keyAsk}`,
  };
};
