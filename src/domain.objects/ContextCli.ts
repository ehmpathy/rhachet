import { DomainLiteral } from 'domain-objects';

/**
 * .what = context for CLI operations
 * .why = standardizes cwd across domain operations
 */
export interface ContextCli {
  /**
   * .what = current work directory
   */
  cwd: string;
}
export class ContextCli
  extends DomainLiteral<ContextCli>
  implements ContextCli
{
  public static unique = ['cwd'] as const;
}

/**
 * .what = creates a ContextCli instance
 * .why = provides consistent instantiation pattern
 */
export const genContextCli = (input: { cwd: string }): ContextCli =>
  new ContextCli(input);
