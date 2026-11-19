import type { BootDeltaCounts } from '@src/domain.operations/boot/BootDeltaCounts';

/**
 * .what = the boot drift of one clone, as its record and the boots on disk say
 * .why = the reader (`getOneCloneBootDrift`), the nudge decision, and the readout each speak this
 *        one shape, so the three cannot drift apart
 *
 * .note = `legacy` spawned before boot drift; `resumed` holds the boot its resumed session first
 *         recorded, which no record names; `current` holds the current boot; `drifted` holds an
 *         older one, and its drift rides the revision's `CLAUDE.md`
 * .note = `capped` says the drift ran past `BOOT_DRIFT_CARRY_LINES_MAX`, so its `CLAUDE.md`
 *         carries a stub and no block: a compaction takes naught, and only a respawn takes the boot
 */
export type CloneBootDrift =
  | { kind: 'legacy' }
  | { kind: 'resumed' }
  | {
      kind: 'current';
      revision: string;
      drift: null;
      lines: number;
      counts: BootDeltaCounts;
      outside: boolean;
      capped: false;
    }
  | {
      kind: 'drifted';
      revision: string;
      drift: string;
      lines: number;
      counts: BootDeltaCounts;
      outside: boolean;
      capped: boolean;
    };
