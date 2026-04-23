import { asKeyrackSlugParts } from './asKeyrackSlugParts';

export const findSlugByEnvAndKeyName = (input: {
  slugs: string[];
  env: string;
  keyName: string;
}): string | undefined => {
  return input.slugs.find((s) => {
    const { env, keyName } = asKeyrackSlugParts({ slug: s });
    return env === input.env && keyName === input.keyName;
  });
};
