import { DomainEntity } from 'domain-objects';
import type { IsoDuration } from 'iso-time';

import type { BrainHookEvent } from './BrainHookEvent';
import { BrainHookFilter } from './BrainHookFilter';

/**
 * .what = brain hook with author namespace for ownership track
 * .why = enables declarative sync with namespace isolation
 *
 * .note = author format: "repo={registry.slug}/role={role.slug}"
 * .note = timeout format: ISO 8601 duration (e.g., "PT60S", "PT5M")
 */
export interface BrainHook {
  author: string;
  event: BrainHookEvent;
  command: string;
  timeout: IsoDuration;
  filter?: BrainHookFilter;
}

export class BrainHook extends DomainEntity<BrainHook> implements BrainHook {
  public static unique = ['author', 'event', 'command'] as const;
  public static updatable = ['filter', 'timeout'] as const;
  public static nested = {
    filter: BrainHookFilter,
  };
}
