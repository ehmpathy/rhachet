import { DomainLiteral } from 'domain-objects';

/**
 * .what = configuration plugs for BrainRepl instances
 * .why = enables extensible tooling, memory management, and access control
 *   for agentic workloads without coupling to specific SDK implementations
 */
export interface BrainReplPlugs {
  /**
   * .what = additional tool providers beyond built-in tools
   * .why = enables domain-specific tooling (databases, browsers, APIs)
   *   via MCP servers or custom tool definitions
   *
   * .example = playwright browser, postgres database, custom APIs
   */
  toolboxes?: never; // todo: allow configuration
  // toolboxes?: BrainActorToolbox[];

  /**
   * .what = memory and context management strategy
   * .why = enables custom context compression, session persistence,
   *   and artifact management for long-running workflows
   *
   * .example = session resume, context compaction hooks
   */
  memory?: never; // todo: allow configuration
  // memory?: BrainActorMemory;

  /**
   * .what = permission guard and access control
   * .why = enables custom authorization logic, audit logging,
   *   and tool-level access policies beyond SDK defaults
   *
   * .example = canUseTool callbacks, preToolUse hooks
   */
  access?: never; // todo: allow configuration
  // access?: BrainActorAccess;
}
export class BrainReplPlugs
  extends DomainLiteral<BrainReplPlugs>
  implements BrainReplPlugs {}
