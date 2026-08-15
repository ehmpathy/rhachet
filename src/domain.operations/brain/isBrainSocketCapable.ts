import type { BrainSlug } from '@src/domain.objects/BrainSlug';

import { getSupportedBrainCommand } from './getSupportedBrainCommand';

/**
 * .what = can this brain be routed through a managed-pty socket?
 * .why = the socket (observe + dispatch) is a per-brain adapter, not a universal
 *   mechanism. this projects the `.socket` capability off the one supported-brains
 *   fact, so every socket gate (`say`, `get`, the observe adapter, the eligibility
 *   check) reads the same source and a non-capable brain always falls back to a
 *   plain spawn
 *
 * .note = an UNSUPPORTED brain throws (via getSupportedBrainCommand) — an unknown
 *   brain is a caller fault, never a silent "not capable"
 */
export const isBrainSocketCapable = (input: { brain: BrainSlug }): boolean =>
  getSupportedBrainCommand({ brain: input.brain }).socket;
