/**
 * .what = type-level tests for BrainSpec.gain.grades extensibility
 * .why = verifies baseline grades + custom grades via index signature
 *
 * .note = these tests run at compile time, not runtime
 *   if the file compiles, the type tests pass
 */
import type { BrainSpec } from './BrainSpec';

/**
 * test: baseline grades are typed as number | undefined
 */
() => {
  const spec = {} as BrainSpec;

  // positive: baseline grades accessible
  const _swePro: number | undefined = spec.gain.grades.swePro;
  const _sweVer: number | undefined = spec.gain.grades.sweVer;
  const _gpqa: number | undefined = spec.gain.grades.gpqa;
  const _math: number | undefined = spec.gain.grades.math;
  const _ifeval: number | undefined = spec.gain.grades.ifeval;
  const _arcagi: number | undefined = spec.gain.grades.arcagi;

  void [_swePro, _sweVer, _gpqa, _math, _ifeval, _arcagi];
};

/**
 * test: custom grades accessible via index signature
 */
() => {
  const spec = {} as BrainSpec;

  // positive: custom grades accessible via index signature
  const _hle: number | undefined = spec.gain.grades['hle'];
  const _livecodebench: number | undefined = spec.gain.grades['livecodebench'];
  const _arena: number | undefined = spec.gain.grades['arena'];
  const _anyCustom: number | undefined = spec.gain.grades['whatever-benchmark'];

  void [_hle, _livecodebench, _arena, _anyCustom];
};

/**
 * test: grades object can be constructed with baseline only
 */
() => {
  const grades: BrainSpec['gain']['grades'] = {
    swePro: 45.9,
    gpqa: 68.4,
  };

  void grades;
};

/**
 * test: grades object can be constructed with baseline + custom
 */
() => {
  const grades: BrainSpec['gain']['grades'] = {
    swePro: 45.9,
    gpqa: 68.4,
    hle: 12.3, // custom: Humanity's Last Exam
    livecodebench: 55.0, // custom: LiveCodeBench
    arena: 1250, // custom: Arena Elo (note: not 0-100 scale)
  };

  void grades;
};

/**
 * test: grades values must be number | undefined
 */
() => {
  const grades: BrainSpec['gain']['grades'] = {
    swePro: 45.9,
    // @ts-expect-error - string not assignable to number | undefined
    customBad: 'not a number',
  };

  void grades;
};

/**
 * test: can iterate over grades with Object.entries
 * .why = proves runtime access to both baseline and custom grades
 */
() => {
  const spec = {} as BrainSpec;

  // positive: can iterate over all grades (baseline + custom)
  for (const [key, value] of Object.entries(spec.gain.grades)) {
    const _key: string = key;
    const _value: number | undefined = value;
    void [_key, _value];
  }
};

/**
 * runtime test that validates the type tests compiled successfully
 * if this file compiles, all type tests pass
 */
describe('BrainSpec.gain.grades types', () => {
  it('should compile type tests successfully', () => {
    // if we reach here, all type tests above compiled successfully
    expect(true).toBe(true);
  });
});
