import type { ActorOndisk } from '@src/domain.objects/ActorOndisk';
import { abbreviate } from '@src/utils/abbreviate';

/**
 * .what = build the `rhx actor list` view — the enrolled identities on disk, as a
 *   human tree and machine data
 * .why =
 *   - a caller (human or machine) discovers WHO is enrolled before it reaches a
 *     clone; this is the identity read (`actor list`), distinct from the run read
 *     (`clone list`)
 *   - tree + data are built from ONE input, so the two views never disagree
 *   - an empty state names the get-started move, so a first run is never a dead end
 *     (rule.require.discoverability). the move differs by cause: a LINKED repo with
 *     no actors says "enroll one"; a NEVER-linked repo (linked=false) says "link
 *     roles first" — else it points the human at `rhx enroll`, which would itself
 *     fail on an unlinked repo. the two empty states are labelled distinctly so the
 *     inaccurate "(no actors enrolled yet)" never shows on an unlinked repo, and the
 *     linked-empty label matches `clone list`'s phrase for one consistent voice
 *     (rule.forbid.snapshot-visual-blemishes)
 *
 * .note = pure: the invoker reads the actors off disk AND probes whether the repo is
 *   linked (impure), then hands both here. the shown hash is abbreviated for the
 *   human tree; the data carries the full hash a machine reaches by
 */
export const asActorListView = (input: {
  actors: ActorOndisk[];
  linked: boolean;
}): {
  tree: string;
  data: { actors: ActorOndisk[] };
} => {
  const { actors } = input;

  // .note = deliberate mutation — `lines` is a local tree-render accumulator,
  //         built up then joined; it never escapes this function
  const lines: string[] = ['🎭 actors'];

  // a never-linked repo cannot enroll — name the link fix, not the enroll one
  if (actors.length === 0 && !input.linked) {
    lines.push('   └─ (repo not linked)');
    lines.push('      └─ link roles first with `rhx init --roles <role>`');
    return { tree: lines.join('\n'), data: { actors } };
  }

  if (actors.length === 0) {
    lines.push('   └─ (no actors enrolled yet)');
    lines.push('      └─ enroll one with `rhx enroll <brain>`');
    return { tree: lines.join('\n'), data: { actors } };
  }

  actors.forEach((actor, idx) => {
    const last = idx === actors.length - 1;
    const prefix = last ? '   └─' : '   ├─';
    lines.push(
      // roles are shown sorted so the display is deterministic (it matches the
      // sorted roleset the identity hash is derived from) — never incidental order
      `${prefix} @${abbreviate({ value: actor.hash, keep: 7 })}  brain=${actor.brain}  roles=${[...actor.roles].sort().join(',')}`,
    );
  });

  return { tree: lines.join('\n'), data: { actors } };
};
