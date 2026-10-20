/**
 * .what = what a `<repo>/.claude` sync did to the link, if it touched it at all
 * .why = the effect is already computed by `setRepoBrainDirSymlink`; the report names
 *        it rather than re-derive it
 */
export type BrainDirSyncSymlink = {
  effect: 'CREATED' | 'FOUND' | 'REWRITTEN' | 'MIGRATED';
  drops: string[];
  moves: string[];
  overwrites: string[];
};

/**
 * .what = a settings name where the layout found a real file and took the name back
 * .why = the file's content is gone (one answer, rhachet's), so the human must learn of it
 * .note = `target` is the arrow put in its place; null on a box with no grove, where the
 *   grove names hold no arrow at all, so the file is removed outright
 */
export type BrainDirSyncSettingsReplaced = {
  name: string;
  target: string | null;
};
