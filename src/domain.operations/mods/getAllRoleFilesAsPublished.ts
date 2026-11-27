import type {
  RoleModdedViewRecord,
  RoleModdedViewSource,
} from '@src/domain.objects/RoleModdedViewRecord';
import { getAllDirEntriesOrNone } from '@src/infra/filesystem/getAllDirEntriesOrNone';
import { getAllFilesFromDir } from '@src/infra/filesystem/getAllFilesFromDir';

import { lstatSync, readlinkSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, sep } from 'node:path';
import { asPathItself } from './asPathItself';
import { asPathsSorted } from './asPathsSorted';
import { asRoleModdedViewRecordPath } from './asRoleModdedViewRecordPath';
import { asRoleModFaultOrNull } from './asRoleModFaultOrNull';
import { ROLE_MOD_KINDS } from './constants';
import { getAllFilesLessModFiles } from './getAllFilesLessModFiles';
import { getOneRoleModdedViewRecord } from './getOneRoleModdedViewRecord';
import { isDirLink } from './isDirLink';

const KINDS = ROLE_MOD_KINDS;

/**
 * .what = the record of a role's modded view, or null where none can be read
 * .why = a corrupt record is a fault the skip already names; the published sources are then
 *        read from the links on disk
 *
 * .note = it admits the same faults the mod gate admits (`asRoleModFaultOrNull`): this role was
 *   skipped on one of them, so a re-read that meets it again must degrade, never crash the boot.
 *   every other throw escapes
 */
const getOneRecordOrNull = (input: {
  roleDir: string;
}): RoleModdedViewRecord | null => {
  try {
    return getOneRoleModdedViewRecord({ roleDir: input.roleDir });
  } catch (error: unknown) {
    if (!asRoleModFaultOrNull({ error })) throw error;
    return null;
  }
};

/**
 * .what = the files under one source dir, or none where the dir faults on read
 * .why = a skipped role boots as published whatever its view holds; a source dir the gate's own
 *        allowlist names a fault (an fs errno, a refused walk) is read as empty, never a crash
 */
const getAllFilesOfSourceOrNone = (input: {
  dirSource: string;
  skipDirNames: string[];
}): string[] => {
  try {
    return getAllFilesFromDir(
      { dir: input.dirSource },
      { skipDirNames: input.skipDirNames },
    );
  } catch (error: unknown) {
    if (!asRoleModFaultOrNull({ error })) throw error;
    return [];
  }
};

/**
 * .what = whether a path is itself a symlink, false where it is absent
 */
const isPathSymlink = (input: { path: string }): boolean =>
  lstatSync(input.path, { throwIfNoEntry: false })?.isSymbolicLink() ?? false;

/**
 * .what = the walked files that sit under a dir, by path prefix
 */
const getAllFilesUnderDir = (input: {
  files: string[];
  dir: string;
}): string[] =>
  input.files.filter((file) => file.startsWith(`${input.dir}${sep}`));

/**
 * .what = the walked files that sit under none of the given dirs
 * .why = the role dir's own files, and each kind left as published, stand beside the rebuilt kinds
 */
const getAllFilesUnderNoDir = (input: {
  files: string[];
  dirs: string[];
}): string[] =>
  input.files.filter(
    (file) => !input.dirs.some((dir) => file.startsWith(`${dir}${sep}`)),
  );

/**
 * .what = each source once, by its mount point and target
 * .why = every file link of one source reveals that same source
 */
const asRoleViewSourcesUnique = (input: {
  sources: RoleModdedViewSource[];
}): RoleModdedViewSource[] => [
  ...new Map(
    input.sources.map((one) => [`${one.at}\0${one.target}`, one]),
  ).values(),
];

/**
 * .what = whether a kind dir is a modded view: a real dir of file links, never a link that
 *         `roles link` made, nor a native dir of files
 * .why = only a modded view has lost files a walk cannot see; a linked or native kind dir walks
 *        as published already
 */
const isKindDirModdedView = (input: { kindDir: string }): boolean => {
  // a single-dir link reads as a link, never a dir, under lstat
  const stats = lstatSync(input.kindDir, { throwIfNoEntry: false });
  if (!stats?.isDirectory()) return false;

  // an array-dir link mounts each source as an entry of the kind dir
  const entries = getAllDirEntriesOrNone({ dir: input.kindDir });
  if (entries.some((entry) => isDirLink({ path: join(input.kindDir, entry) })))
    return false;
  return getAllFilesFromDir({ dir: input.kindDir }).some((file) =>
    isPathSymlink({ path: file }),
  );
};

/**
 * .what = the source of one published file link of a modded view, or null where the link
 *         does not reveal it
 * .why = a view keeps each published file as a link into its source dir, at the path a
 *        published link gives it: `kind/<at>/<rest>` → `<source>/<rest>`. so the target, less
 *        the file's path within the kind dir, is the source dir, whether the kind dir was a
 *        single-dir link (`at` empty) or an array-dir link (`at` one entry)
 */
const getOneSourceOfFileLink = (input: {
  roleDir: string;
  kindDir: string;
  file: string;
}): RoleModdedViewSource | null => {
  const linkText = readlinkSync(input.file);
  const target = isAbsolute(linkText)
    ? linkText
    : join(dirname(input.file), linkText);
  const rel = relative(input.kindDir, input.file);
  const asSource = (cut: {
    at: string;
    rest: string;
  }): RoleModdedViewSource | null =>
    target.endsWith(`${sep}${cut.rest}`)
      ? {
          at: cut.at,
          target: relative(
            input.roleDir,
            target.slice(0, -(cut.rest.length + 1)),
          ),
        }
      : null;

  // a single-dir link first (`at` empty), then an array-dir link (`at` one entry)
  const [head, ...tail] = rel.split(sep);
  const sourceOfSingleDir = asSource({ at: '', rest: rel });
  if (sourceOfSingleDir) return sourceOfSingleDir;
  if (head && tail.length > 0)
    return asSource({ at: head, rest: tail.join(sep) });
  return null;
};

/**
 * .what = the published sources of one modded kind dir, read from its file links
 * .why = a view whose record cannot be read (C11) still links each published file it kept into
 *        its source dir; that dir holds the files the mod not-ed too, so a walk of it is the
 *        published kind, every file of it
 *
 * .note = the caller passes the walk less every mod file, so no link into the mods dir is read
 *   as a source
 */
const getAllRoleViewSourcesOfFileLinks = (input: {
  roleDir: string;
  kind: (typeof KINDS)[number];
  filesWalked: string[];
}): RoleModdedViewSource[] => {
  const kindDir = join(input.roleDir, input.kind);

  // each file link of the kind dir, read for the source it reveals
  const links = getAllFilesUnderDir({
    files: input.filesWalked,
    dir: kindDir,
  }).filter((file) => isPathSymlink({ path: file }));
  const sources = links.flatMap((file) => {
    const source = getOneSourceOfFileLink({
      roleDir: input.roleDir,
      kindDir,
      file,
    });
    return source ? [source] : [];
  });
  return asRoleViewSourcesUnique({ sources });
};

/**
 * .what = the kinds a skipped role's boot rebuilds from its sources
 * .why = a readable record names every kind it rewrote; without one, each kind dir left a
 *        modded view is rebuilt
 */
const getAllKindsModded = (input: {
  roleDir: string;
  record: RoleModdedViewRecord | null;
}): Array<(typeof KINDS)[number]> => {
  if (input.record !== null) return [...KINDS];
  return KINDS.filter((kind) =>
    isKindDirModdedView({ kindDir: join(input.roleDir, kind) }),
  );
};

/**
 * .what = each published file of one source, as [the path a published link gives it, the file]
 */
const getAllPathsReadOfSource = (input: {
  roleDir: string;
  kind: (typeof KINDS)[number];
  source: RoleModdedViewSource;
  skipDirNames: string[];
}): Array<readonly [string, string]> => {
  const dirSource = join(input.roleDir, input.source.target);
  return getAllFilesOfSourceOrNone({
    dirSource,
    skipDirNames: input.skipDirNames,
  }).map(
    (file) =>
      [
        join(
          input.roleDir,
          input.kind,
          input.source.at,
          relative(dirSource, file),
        ),
        file,
      ] as const,
  );
};

/**
 * .what = the register of each rebuilt kind's published files: view path → the file to read
 * .why = a not-ed file lives only in its source dir, never at its view path
 */
const getAllPathsReadOfKinds = (input: {
  roleDir: string;
  kinds: Array<(typeof KINDS)[number]>;
  record: RoleModdedViewRecord | null;
  filesWalked: string[];
  skipDirNames: string[];
}): Map<string, string> => {
  const pairs = input.kinds.flatMap((kind) => {
    const sources =
      input.record?.sources[kind] ??
      getAllRoleViewSourcesOfFileLinks({
        roleDir: input.roleDir,
        kind,
        filesWalked: input.filesWalked,
      });
    return sources.flatMap((source) =>
      getAllPathsReadOfSource({
        roleDir: input.roleDir,
        kind,
        source,
        skipDirNames: input.skipDirNames,
      }),
    );
  });
  return new Map(pairs);
};

/**
 * .what = the dir of each kind, within a role dir
 */
const getAllKindDirs = (input: {
  roleDir: string;
  kinds: Array<(typeof KINDS)[number]>;
}): string[] => input.kinds.map((kind) => join(input.roleDir, kind));

/**
 * .what = the path a file is read from, by the register: its source file, else itself
 * .why = a rebuilt kind's file lives in its source dir; every other file at its own path
 */
const asPathReadOfRegister =
  (input: { pathsRead: Map<string, string> }) =>
  (path: string): string =>
    input.pathsRead.get(path) ?? path;

/**
 * .what = every file of a skipped role as published, at the path its view would hold it, and
 *         the path each one is read from
 * .why = a skipped mod is skipped whole (F03), yet a view the last render left modded still lacks
 *        each not and still links each shadow into the mods dir. so the published files are read
 *        from the view's sources — its record's, or, where the record cannot be read (C11), those
 *        its file links reveal — each at the path a published link gives it, and a boot of the
 *        role is the published role, every file of it
 *
 * .note = a kind dir never modded links its sources as published, so its walk, less any mod
 *   file a stray left in it, is already the published form
 * .note = the boot never heals the view; the next render returns it to published on disk
 * .note = it returns two things: `files`, the published role's paths as a walk of the role dir
 *   would list them, so every downstream filter (briefs, skills, boot.yml globs) reads them as
 *   it always has; and `asPathToRead`, which maps one such path to the file that holds its
 *   bytes, since a not-ed file lives only in its source dir, never at its view path
 */
export const getAllRoleFilesAsPublished = (input: {
  roleDir: string;
  cwd: string;

  /**
   * .what = entry names no walk descends into, the same list an unskipped role's walk reads
   * .why = a skipped role and a published one must walk the same universe
   */
  skipDirNames: string[];
}): { files: string[]; asPathToRead: (path: string) => string } => {
  // the walk, less each mod file and the view's own record: neither is a file of the role
  const pathRecord = asRoleModdedViewRecordPath({ roleDir: input.roleDir });
  const walked = getAllFilesLessModFiles({
    files: getAllFilesFromDir(
      { dir: input.roleDir },
      { skipDirNames: input.skipDirNames },
    ),
    cwd: input.cwd,
  }).filter((file) => file !== pathRecord);

  // the kinds to rebuild: every kind the record holds, else each kind dir left a modded view
  const record = getOneRecordOrNull({ roleDir: input.roleDir });
  const kindsModded = getAllKindsModded({ roleDir: input.roleDir, record });
  if (kindsModded.length === 0)
    return {
      files: asPathsSorted({ paths: walked }),
      asPathToRead: asPathItself,
    };

  // each published file of each source, at the path a published link gives it
  const pathsRead = getAllPathsReadOfKinds({
    roleDir: input.roleDir,
    kinds: kindsModded,
    record,
    filesWalked: walked,
    skipDirNames: input.skipDirNames,
  });

  // the role dir's own files, and each kind left as published, beside the rebuilt kinds
  const filesKept = getAllFilesUnderNoDir({
    files: walked,
    dirs: getAllKindDirs({ roleDir: input.roleDir, kinds: kindsModded }),
  });
  return {
    files: asPathsSorted({ paths: [...filesKept, ...pathsRead.keys()] }),
    asPathToRead: asPathReadOfRegister({ pathsRead }),
  };
};
