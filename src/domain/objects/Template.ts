import { DomainEntity, type RefByUnique } from 'domain-objects';
import type { GitFile } from 'rhachet-artifact-git';

/**
 * .what = a template reference that can be hydrated with variables
 * .why = enables rendering reusable text templates with custom input
 *
 * .cases =
 *   - load a GitFile template from a known uri
 *   - hydrate the template using input variables
 *   - return the final string with placeholders filled
 */
export interface Template<TVariables = any> {
  ref: RefByUnique<typeof GitFile>;

  /**
   * .what = renders the template with the given variables
   * .why = supports consistent formatting for any templated output
   */
  use: (input: TVariables) => Promise<string>;
}

export class Template<TVariables = any>
  extends DomainEntity<Template<TVariables>>
  implements Template<TVariables> {}
