import { DomainLiteral } from 'domain-objects';

/**
 * .what = filter criteria for onTool hooks
 * .why = separates tool selection from execution time
 *
 * .note = what: tool pattern like "Bash", "Write|Edit", "*"
 * .note = when: defaults to "before" if not specified
 */
export interface BrainHookFilter {
  what: string;
  when?: 'before' | 'after';
}

export class BrainHookFilter
  extends DomainLiteral<BrainHookFilter>
  implements BrainHookFilter {}
