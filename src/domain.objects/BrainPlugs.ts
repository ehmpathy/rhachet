import { DomainLiteral } from 'domain-objects';

import type { BrainPlugToolDefinition } from './BrainPlugToolDefinition';

/**
 * .what = configuration plugs for Brain instances (atom and repl)
 * .why = enables extensible tools, memory, and access control
 *   for brain workloads, decoupled from specific SDK implementations
 */
export interface BrainPlugs {
  /**
   * .what = tools that can be invoked by the brain
   * .why = enables tool use for agentic workflows
   *
   * .note = when tools are plugged, the brain may request tool invocations
   *   instead of (or in addition to) direct output
   */
  tools?: BrainPlugToolDefinition[];

  /**
   * .what = memory and context management strategy
   * .why = enables custom context compression, session persistence,
   *   and artifact management for long-run workflows
   *
   * .example = session resume, context compaction hooks
   */
  memory?: never; // todo: allow configuration
  // memory?: BrainActorMemory;

  /**
   * .what = permission guard and access control
   * .why = enables custom authorization logic, audit log,
   *   and tool-level access policies beyond SDK defaults
   *
   * .example = canUseTool callbacks, preToolUse hooks
   */
  access?: never; // todo: allow configuration
  // access?: BrainActorAccess;
}
export class BrainPlugs
  extends DomainLiteral<BrainPlugs>
  implements BrainPlugs {}
