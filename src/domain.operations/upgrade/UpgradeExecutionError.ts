import { HelpfulError } from 'helpful-errors';

/**
 * .what = error thrown when npm install fails during upgrade
 * .why = enables callers to catch and handle upgrade failures gracefully
 */
export class UpgradeExecutionError extends HelpfulError {
  /**
   * .what = the exit code from npm install
   * .why = enables callers to forward the original exit code to process.exit()
   */
  public readonly exitCode: number;

  constructor(
    message: string,
    metadata: { packages: string[]; exitCode: number | null },
  ) {
    super(message, metadata);
    this.exitCode = metadata.exitCode ?? 1;
  }
}
