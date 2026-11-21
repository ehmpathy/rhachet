/**
 * .what = whether a failure message reads as a timeout
 * .why = jest's own case timeout and the harness's bounded waits both say so in their message
 */
export const isTimeoutFailure = (input: { message: string }): boolean =>
  /Exceeded timeout of|timed out after/.test(input.message);
