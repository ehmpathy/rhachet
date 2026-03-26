import type { Artifact } from 'rhachet-artifact';
import type { GitFile } from 'rhachet-artifact-git';

/**
 * .what = the dynamically generated brain config file for an enrollment session
 * .why = wraps a GitFile artifact with brain-specific metadata
 *
 * .note = leverages rhachet-artifact-git for file operations
 * .note = GitFile provides: path, read, write, diff, commit state
 * .note = artifact pattern enables: undo, replay, composition
 */
export type BrainCliConfigArtifact = Artifact<typeof GitFile>;
