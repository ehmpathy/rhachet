/**
 * .what = flag to control whether live-api tests run
 * .why = a live-api test bills a funded vendor credential; no credential is funded for ci,
 *        so these tests skip unless a run targets them by name
 *
 * runs when:
 * - LIVE_API=true (explicit opt-in, with a funded credential in the env)
 */
export const RUN_LIVE_API_TEST = process.env.LIVE_API === 'true';
