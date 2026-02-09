/**
 * .what = resolves brief files with .md.min preference
 * .why = when a .md.min counterpart exists, the minified variant
 *        is preferred for content load while the .md path is kept as identity
 */
export const getRoleBriefRefs = (input: {
  briefFiles: string[];
  briefsDir: string;
}): {
  refs: RoleBriefRef[];
  orphans: Array<Omit<RoleBriefRef, 'pathToOriginal'>>;
} => {
  const minSuffix = '.md.min';

  // partition into .md files and .md.min files
  const mdFiles = input.briefFiles.filter(
    (f) => f.endsWith('.md') && !f.endsWith(minSuffix),
  );
  const minFiles = new Set(
    input.briefFiles.filter((f) => f.endsWith(minSuffix)),
  );
  const mdFileSet = new Set(mdFiles);

  // resolve refs: for each .md file, check if .md.min counterpart exists
  const refs: RoleBriefRef[] = mdFiles.map((mdPath) => {
    const minPath = `${mdPath}.min`;
    const pathToMinified = minFiles.has(minPath) ? minPath : null;
    return { pathToOriginal: mdPath, pathToMinified };
  });

  // detect orphans: .md.min files with no .md source
  const orphans: Array<Omit<RoleBriefRef, 'pathToOriginal'>> = [];
  for (const minPath of minFiles) {
    const mdSource = minPath.slice(0, -4); // strip ".min"
    if (!mdFileSet.has(mdSource)) {
      orphans.push({ pathToMinified: minPath });
    }
  }

  return { refs, orphans };
};

/**
 * .what = a reference to a brief file with optional minified counterpart
 * .why = enables consumers to use pathToOriginal for identity and
 *        pathToMinified ?? pathToOriginal for content
 */
export interface RoleBriefRef {
  pathToOriginal: string;
  pathToMinified: string | null;
}
