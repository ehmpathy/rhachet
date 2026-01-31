import { DomainLiteral } from 'domain-objects';

/**
 * .what = atomic request-response pair in a brain conversation
 * .why = captures the fundamental unit of brain interaction
 *
 * .note = immutable after creation; hash is content-derived from input + output
 */
export interface BrainExchange {
  /**
   * .what = content-derived identity
   * .why = enables comparison and deduplication based on actual content
   *
   * .note = computed from input + output; excludes exid
   */
  hash: string;

  /**
   * .what = the user's request
   */
  input: string;

  /**
   * .what = the brain's response
   */
  output: string;

  /**
   * .what = supplier-assigned exchange id
   * .why = allows suppliers to track their own ids
   *
   * .note = opaque to rhachet; null if not provided by supplier
   */
  exid: string | null;
}

export class BrainExchange
  extends DomainLiteral<BrainExchange>
  implements BrainExchange {}
