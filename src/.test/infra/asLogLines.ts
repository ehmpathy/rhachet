/**
 * .what = the readout a console spy yields — every emitted line, in order
 * .why = a halt writes its tree line by line, and a pass flushes its payload in one call.
 *        one readout grades both, so an assertion grades CONTENT, never the emit mechanism
 */
export const asLogLines = (spy: jest.SpyInstance): string[] =>
  spy.mock.calls.flatMap((call) => String(call[0] ?? '').split('\n'));
