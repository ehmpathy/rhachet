import { HelpfulError } from 'helpful-errors';

/**
 * .what = error thrown when brain choice is not found in available brains
 * .why = enables downstream consumers to catch and display formatted message via stderr
 *
 * @example
 * ```ts
 * try {
 *   genContextBrain({ atoms, repls, choice: 'antrhopic/cloude-code' });
 * } catch (error) {
 *   if (error instanceof BrainChoiceNotFoundError) {
 *     console.error(error.message); // formatted with available brains
 *     process.exit(1);
 *   }
 *   throw error;
 * }
 * ```
 */
export class BrainChoiceNotFoundError extends HelpfulError {}
