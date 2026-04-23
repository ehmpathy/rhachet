import { isValidKeyrackEnv } from './constants';

/**
 * .what = check if a string looks like a full keyrack slug (org.env.key format)
 * .why = CLI needs to detect if user passed a slug or just a key name
 */
export const isKeyrackSlugFormat = (input: { value: string }): boolean => {
  const parts = input.value.split('.');
  if (parts.length < 3) return false;
  const envCandidate = parts[1] ?? '';
  return isValidKeyrackEnv(envCandidate);
};
