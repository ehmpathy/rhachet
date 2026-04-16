import { HelpfulError } from 'helpful-errors';

/**
 * .what = error thrown when brain auth operation fails
 * .why = enables downstream consumers to catch and handle auth-specific errors
 *
 * @example
 * ```ts
 * try {
 *   await getOneBrainAuthCredentialBySpec({ spec }, context);
 * } catch (error) {
 *   if (error instanceof BrainAuthError) {
 *     console.error(error.message); // formatted with auth details
 *     process.exit(1);
 *   }
 *   throw error;
 * }
 * ```
 */
export class BrainAuthError extends HelpfulError {}
