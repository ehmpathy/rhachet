import { execFileSync } from 'node:child_process';

/**
 * .what = probe whether the `age` binary is on PATH, for blackbox test preconditions
 * .why  = an acceptance test is a black box: it drives the built CLI as a subprocess
 *         and must NOT reach into @src domain internals (rule.forbid.scope-leaks). the
 *         "is age installed" check is a generic ENV probe, not keyrack domain logic, so
 *         it lives here in general test infra — the test imports it from blackbox infra,
 *         never from the domain. used to fail-fast (never skip) when age is absent
 *
 * .note = allowlists ONLY the expected "command not found" outcome (`which` ran and
 *         exited non-zero → `error.status` is a number). a genuine fault — `which`
 *         itself absent (ENOENT on spawn), a signal, a permission error — has no
 *         numeric `.status`, so it surfaces loud (rule.forbid.failhide). mirrors the
 *         production isAgeCliAvailable; the predicate is inlined because blackbox infra
 *         must not import from @src
 */
export const isAgeCliAvailable = (): boolean => {
  try {
    // bound the probe: a wedged `which` must not hang the event loop
    execFileSync('which', ['age'], {
      stdio: 'pipe',
      env: process.env,
      timeout: 10_000,
    });
    return true;
  } catch (error) {
    // expected outcome: `which` ran and exited non-zero → numeric .status → age absent
    if (
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      typeof (error as { status: unknown }).status === 'number'
    )
      return false;
    // any other error (spawn ENOENT, signal, permission) is a genuine fault → fail loud
    throw error;
  }
};
