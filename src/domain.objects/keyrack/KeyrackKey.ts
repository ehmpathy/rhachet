import type { KeyrackKeyGrade } from './KeyrackKeyGrade';
import type { KeyrackKeySecret } from './KeyrackKeySecret';

/**
 * .what = a credential with its security grade
 * .why = bundles secret with grade for enforcement
 */
export interface KeyrackKey {
  secret: KeyrackKeySecret;
  grade: KeyrackKeyGrade;
}
