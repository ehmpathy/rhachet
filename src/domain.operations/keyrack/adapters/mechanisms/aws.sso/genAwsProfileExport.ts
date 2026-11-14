import { ConstraintError, MalfunctionError } from 'helpful-errors';
import {
  addDuration,
  asIsoTimeStamp,
  type IsoDuration,
  type IsoTimeStamp,
  isIsoTimeStamp,
  now,
  toMilliseconds,
  toMillisecondsSinceEpoch,
} from 'iso-time';

import { getHomeDir } from '@src/infra/getHomeDir';
import { withDiskMutex } from '@src/infra/lock/withRepoMutex';
import { setFileAtomic } from '@src/infra/setFileAtomic';

import { exec } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { asAwsExecFailureText } from './asAwsExecFailureText';
import { asAwsProfileExportDiskFixHint } from './asAwsProfileExportDiskFixHint';
import { emitAwsProfileExportWaitNotice } from './emitAwsProfileExportWaitNotice';
import { getOneAwsProfileExportCacheDir } from './getOneAwsProfileExportCacheDir';

const execAsync = promisify(exec);

/**
 * .what = how much life a cached export must have left to be served
 * .why = fifteen minutes, the window the aws cli itself refreshes within (botocore's advisory
 *   refresh and its cached-fetcher expiry window), so no caller gets creds with less life than
 *   a direct `aws configure export-credentials` would have handed it (fulcrum F3)
 */
const FRESH_MARGIN: IsoDuration = { minutes: 15 };

/**
 * .what = how long one export may run before its cli is killed
 * .why = two minutes; a healthy export takes seconds even on a loaded box, and an unbounded
 *   hang would hold the key and every waiter behind it
 */
const HANG_GUARD: IsoDuration = { minutes: 2 };

/**
 * .what = how long one hold may last before a peer may take the key
 * .why = three minutes; it outlasts the hang guard, so a live holder never loses its key,
 *   and a killed holder blocks its peers for at most this long
 */
const LEASE: IsoDuration = { minutes: 3 };

/**
 * .what = how long a caller waits for a peer's hold before it fails loud
 * .why = five minutes; it outlasts the lease, so a waiter behind a killed holder acquires
 *   once the lease lapses
 */
const WAIT: IsoDuration = { minutes: 5 };

/**
 * .what = how long an export lives when the cli names no expiry
 * .why = fifty-five minutes, the bound `deliverForGet` set before this op, so no caller sees a
 *   change in the expiry it gets
 */
const EXPIRY_FALLBACK: IsoDuration = { minutes: 55 };

/**
 * .what = the creds of one profile's export, and when they expire
 * .why = one shape for the cli's export, the cache's entry, and the caller's result
 */
type AwsProfileExport = {
  credentials: Record<string, string>;
  expiresAt: IsoTimeStamp;
};

/**
 * .what = the identity of an export: the profile name and the config files the cli reads it from
 * .why = one profile name under two config files names two different creds, so the cache file
 *   and the mutex key are both named by all three
 */
type AwsProfileExportIdentity = {
  profile: string;
  configPath: string;
  credentialsPath: string;
};

/**
 * .what = the shape of one cache file: the identity it was exported for, and the export
 * .why = the file records whom it was exported for, so a read can refuse another identity's file
 */
type AwsProfileExportCacheEntry = AwsProfileExportIdentity & AwsProfileExport;

/**
 * .what = each config path of the identity: the env var that overrides it, and its default
 * .why = one definition for the identity and the hand-run hint, so a hint never reruns against a
 *   config other than the one keyed
 */
const AWS_PROFILE_EXPORT_KEYED_ENV = {
  configPath: { name: 'AWS_CONFIG_FILE', fallback: ['.aws', 'config'] },
  credentialsPath: {
    name: 'AWS_SHARED_CREDENTIALS_FILE',
    fallback: ['.aws', 'credentials'],
  },
} as const satisfies Record<
  Exclude<keyof AwsProfileExportIdentity, 'profile'>,
  { name: string; fallback: readonly string[] }
>;

/**
 * .what = the path the aws cli reads for one keyed env var: its override, else its default
 * .why = the identity and the cli must agree on which file a profile is read from
 */
const getOneAwsProfileExportKeyedPath = (input: {
  keyed: { name: string; fallback: readonly string[] };
}): string =>
  process.env[input.keyed.name] || join(getHomeDir(), ...input.keyed.fallback);

/**
 * .what = the identity of this caller's export of one profile
 * .why = the cache key must match what the cli would read, else a caller with an override config
 *   could be served another config's creds
 * .note = the paths are those the aws cli reads: the env overrides, else their defaults
 * .note = only these two files key the export; other env that could change the cli's output
 *   (e.g. `AWS_DATA_PATH`, `AWS_CA_BUNDLE`) is not keyed, so callers that differ only there
 *   share one entry
 */
const getOneAwsProfileExportIdentity = (input: {
  profile: string;
}): AwsProfileExportIdentity => ({
  profile: input.profile,
  configPath: getOneAwsProfileExportKeyedPath({
    keyed: AWS_PROFILE_EXPORT_KEYED_ENV.configPath,
  }),
  credentialsPath: getOneAwsProfileExportKeyedPath({
    keyed: AWS_PROFILE_EXPORT_KEYED_ENV.credentialsPath,
  }),
});

/**
 * .what = the text of a config file the cli reads, or '' if there is none
 * .why = the key hashes what the profile points at, so an absent file is a valid state (the
 *   cli reads defaults); any other read fault is loud, with the path
 */
const getOneAwsConfigFileContent = (input: {
  profile: string;
  path: string;
}): string => {
  try {
    return readFileSync(input.path, 'utf8');
  } catch (error) {
    // .cast = node fs errors carry `code` at the external boundary; only ENOENT means absent
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return '';
    // .note = a node fs error may come from another realm (a jest sandbox), so read it by shape
    const diskError = String(
      (error as { message?: unknown })?.message ?? error,
    );
    throw new ConstraintError('aws config file could not be read', {
      profile: input.profile,
      path: input.path,
      diskError,
      // .note = the hint names the disk's code only; its full message rides in `diskError`
      hint: `make ${input.path} readable by this user, then retry; the disk said ${(error as NodeJS.ErrnoException).code ?? diskError}`,
      cause: error instanceof Error ? error : undefined,
    });
  }
};

/**
 * .what = the name one identity's cache file and mutex key share: `profile=$profile.$sha8`
 * .why = the sha of both config paths and their content parts two identities that share a
 *   profile name, and re-keys a profile whose config was re-pointed (another account or role)
 *   under the same path, as the cli's own cache keys on what the profile points at; the profile
 *   is uri-encoded so no name can carry a path separator into the file name
 * .note = any edit to either file re-keys every profile it holds; the next read re-exports, and
 *   the prior entry rests until its expiry or a relock drops it
 */
const asAwsProfileExportKey = (input: {
  identity: AwsProfileExportIdentity;
}): string => {
  const { profile, configPath, credentialsPath } = input.identity;
  const sha8 = createHash('sha256')
    .update(
      JSON.stringify([
        configPath,
        credentialsPath,
        getOneAwsConfigFileContent({ profile, path: configPath }),
        getOneAwsConfigFileContent({ profile, path: credentialsPath }),
      ]),
    )
    .digest('hex')
    .slice(0, 8);
  return `profile=${encodeURIComponent(profile)}.${sha8}`;
};

/**
 * .what = the cache dir, the cache file, and the mutex key for one identity
 * .why = the file and the key share one name, so a reader and a writer of one identity always
 *   meet on one file and one key, and two identities never do
 */
const getOneAwsProfileExportPaths = (input: {
  identity: AwsProfileExportIdentity;
}): { cacheDir: string; cachePath: string; lockDir: string; key: string } => {
  const key = asAwsProfileExportKey({ identity: input.identity });
  const cacheDir = getOneAwsProfileExportCacheDir();
  return {
    cacheDir,
    cachePath: join(cacheDir, `${key}.json`),
    lockDir: join(cacheDir, '.locks'),
    key,
  };
};

/**
 * .what = a cache disk fault as a ConstraintError whose hint names the path and the disk's error
 * .why = a refused cache path is the caller's to fix (a `sudo rhx` that left it root-owned, a
 *   read-only HOME); a retry cannot cure it. the unlock row shows a ConstraintError's hint, so the
 *   path and the disk's error ride in the hint, where a human reads them
 * .note = a node fs error may come from another realm (a jest sandbox), so its message is read
 *   by shape, never gated on `instanceof Error`
 */
const asAwsProfileExportDiskFault = (input: {
  message: string;
  profile: string;
  path: string;
  error: unknown;
}) => {
  const diskError = String(
    (input.error as { message?: unknown })?.message ?? input.error,
  );
  return new ConstraintError(input.message, {
    profile: input.profile,
    path: input.path,
    diskError,
    hint: asAwsProfileExportDiskFixHint({
      path: input.path,
      error: input.error,
    }),
    cause: input.error instanceof Error ? input.error : undefined,
  });
};

/**
 * .what = findsert the cache dir, readable only by its owner
 * .why = the dir holds creds; `mkdir`'s mode applies only to a dir it creates, so the mode is
 *   re-asserted on an extant one too
 */
const setAwsProfileExportCacheDir = (input: {
  profile: string;
  cacheDir: string;
}): void => {
  try {
    mkdirSync(input.cacheDir, { recursive: true, mode: 0o700 });
    chmodSync(input.cacheDir, 0o700);
  } catch (error) {
    // a file at or above the dir path blocks the mkdir; a chmod cannot cure that, so say so
    const code = (error as { code?: unknown })?.code;
    const isFileInTheWay = code === 'EEXIST' || code === 'ENOTDIR';
    throw asAwsProfileExportDiskFault({
      message: isFileInTheWay
        ? 'a file blocks the aws export cache dir'
        : 'aws export cache dir could not be made owner-only',
      profile: input.profile,
      path: input.cacheDir,
      error,
    });
  }
};

/**
 * .what = drop this identity's cache file; a no-op if absent
 * .why = a refresh must leave no pre-login creds for any reader, before it queues and again
 *   under the hold
 */
const delAwsProfileExportCached = (input: {
  profile: string;
  cachePath: string;
}): void => {
  try {
    rmSync(input.cachePath, { force: true });
  } catch (error) {
    throw asAwsProfileExportDiskFault({
      message: 'aws export cache drop failed',
      profile: input.profile,
      path: input.cachePath,
      error,
    });
  }
};

/**
 * .what = whether an export still has more than the margin of life left
 * .why = a caller must never be handed creds that lapse before it can use them
 */
const isAwsProfileExportFresh = (input: {
  expiresAt: IsoTimeStamp;
  margin: IsoDuration;
}): boolean => {
  const freshUntil = addDuration(now(), input.margin);
  return (
    toMillisecondsSinceEpoch(input.expiresAt) >
    toMillisecondsSinceEpoch(freshUntil)
  );
};

/**
 * .what = the text of the cache file, or null if there is none
 * .why = absent is the common case and no fault; any other read fault is loud, with the path
 */
const getOneAwsProfileExportCacheContent = (input: {
  profile: string;
  cachePath: string;
}): string | null => {
  try {
    return readFileSync(input.cachePath, 'utf8');
  } catch (error) {
    // .cast = node fs errors carry `code` at the external boundary; only ENOENT means absent
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw asAwsProfileExportDiskFault({
      message: 'aws export cache read failed',
      profile: input.profile,
      path: input.cachePath,
      error,
    });
  }
};

/**
 * .what = the cache file text as json, or null if it is not json
 * .why = a file that does not parse is no cache; any other fault is loud
 */
const asAwsProfileExportCacheParsed = (input: {
  content: string;
}): Partial<AwsProfileExportCacheEntry> | null => {
  try {
    // .cast = json from disk is untyped; every field is checked by asAwsProfileExportCacheEntryOf
    return JSON.parse(input.content) as Partial<AwsProfileExportCacheEntry>;
  } catch (error) {
    if (error instanceof SyntaxError) return null;
    throw error;
  }
};

/**
 * .what = the cached export for this identity, if one is on disk and has life left
 * .why = a valid cache answers a caller with a file read, where the cli costs seconds
 * .note = a file that does not parse, lacks a credential key, or records another identity
 *   counts as absent; the caller then exports and overwrites it
 */
const getOneAwsProfileExportCached = (input: {
  identity: AwsProfileExportIdentity;
  cachePath: string;
}): AwsProfileExport | null => {
  // read and parse the file; absent or not json counts as no cache
  const content = getOneAwsProfileExportCacheContent({
    profile: input.identity.profile,
    cachePath: input.cachePath,
  });
  if (content === null) return null;
  const parsed = asAwsProfileExportCacheParsed({ content });
  const entry = asAwsProfileExportCacheEntryOf({
    entry: parsed,
    identity: input.identity,
  });
  if (!entry) return null;

  // serve it only with life left
  const isFresh = isAwsProfileExportFresh({
    expiresAt: entry.expiresAt,
    margin: FRESH_MARGIN,
  });
  if (!isFresh) return null;
  return { credentials: entry.credentials, expiresAt: entry.expiresAt };
};

/**
 * .what = a parsed cache file as a whole entry of this identity, or null if it is not one
 * .why = a name collision or a hand-edited file must never return another identity's creds,
 *   nor creds short a key
 */
const asAwsProfileExportCacheEntryOf = (input: {
  entry: Partial<AwsProfileExportCacheEntry> | null;
  identity: AwsProfileExportIdentity;
}): AwsProfileExportCacheEntry | null => {
  const { entry, identity } = input;
  if (!entry || typeof entry !== 'object') return null;
  if (entry.profile !== identity.profile) return null;
  if (entry.configPath !== identity.configPath) return null;
  if (entry.credentialsPath !== identity.credentialsPath) return null;
  if (typeof entry.expiresAt !== 'string' || !isIsoTimeStamp(entry.expiresAt))
    return null;
  if (!entry.credentials || typeof entry.credentials !== 'object') return null;
  if (!entry.credentials.AWS_ACCESS_KEY_ID) return null;
  if (!entry.credentials.AWS_SECRET_ACCESS_KEY) return null;
  return {
    ...identity,
    credentials: entry.credentials,
    expiresAt: entry.expiresAt,
  };
};

/**
 * .what = write an export to this identity's cache file, owner-only, atomic
 * .why = a peer reads the file the moment the key frees, so it must never see a partial file
 * .note = a write that fails throws, names the path and the disk's error, and leaves no
 *   temp file; it never returns creds it could not cache in silence (collapse 11)
 */
const setAwsProfileExportCached = (input: {
  identity: AwsProfileExportIdentity;
  cacheDir: string;
  cachePath: string;
  exported: AwsProfileExport;
}): void => {
  const entry: AwsProfileExportCacheEntry = {
    ...input.identity,
    ...input.exported,
  };
  setAwsProfileExportCacheDir({
    profile: input.identity.profile,
    cacheDir: input.cacheDir,
  });
  try {
    setFileAtomic(
      { path: input.cachePath, content: JSON.stringify(entry) },
      { mode: 0o600 },
    );
  } catch (error) {
    throw asAwsProfileExportDiskFault({
      message: 'aws export cache write failed',
      profile: input.identity.profile,
      path: input.cachePath,
      error,
    });
  }
};

/**
 * .what = the expiry the cli names, cast to utc; else, only when the cli names none, the fallback
 * .why = the cli omits `AWS_CREDENTIAL_EXPIRATION` for some sources; a cache entry still needs
 *   a bound, so it takes one under the shortest session it could hold
 * .note = the cli prints the expiry as python's `isoformat()` (`…+00:00`), never the strict `…Z`
 *   form, so a named expiry is cast at the boundary; a named one that does not parse fails loud,
 *   since a silent fallback would serve creds past their real expiry
 */
const asAwsProfileExportExpiresAt = (input: {
  profile: string;
  credentials: Record<string, string>;
}): IsoTimeStamp => {
  // absent → the fallback bound
  const named = input.credentials.AWS_CREDENTIAL_EXPIRATION;
  if (!named) return addDuration(now(), EXPIRY_FALLBACK);

  // the strict form as is; any other form the clock can read, cast to utc
  if (isIsoTimeStamp(named)) return named;
  const parsed = new Date(named);
  if (!Number.isNaN(parsed.getTime())) return asIsoTimeStamp(parsed);
  throw new MalfunctionError(
    'aws configure export-credentials named an expiry that does not parse',
    {
      profile: input.profile,
      expiration: named,
      hint: `run \`${asAwsProfileExportHandRun({ profile: input.profile })}\` by hand to see the expiry the cli emits, then report it`,
      hintAfterRetry: true,
    },
  );
};

/**
 * .what = a value as one single-quoted shell word
 * .why = the profile comes from a manifest a human may edit; inside single quotes the shell
 *   expands naught, so a `$(…)` or a backtick in a name stays text, never a command
 */
const asShellSingleQuoted = (input: { value: string }): string =>
  `'${input.value.split("'").join(`'\\''`)}'`;

/**
 * .what = the export command a human can paste to rerun this caller's export by hand
 * .why = a hint that omits an override config would rerun against a different config than the
 *   one that failed, so each override this process carries is set on the command too
 * .note = the overrides come from AWS_PROFILE_EXPORT_KEYED_ENV, the same table the identity reads
 */
const asAwsProfileExportHandRun = (input: { profile: string }): string => {
  const overrides = Object.values(AWS_PROFILE_EXPORT_KEYED_ENV)
    .map((keyed) => keyed.name)
    .filter((name) => !!process.env[name])
    .map(
      (name) =>
        `${name}=${asShellSingleQuoted({ value: process.env[name]! })} `,
    )
    .join('');
  return `${overrides}aws configure export-credentials --profile ${asShellSingleQuoted({ value: input.profile })}`;
};

/**
 * .what = a bound as words a human reads, in whole minutes where it fits, else seconds
 * .why = a hint says how long to wait, never an iso duration shape
 */
const asDurationWords = (input: { duration: IsoDuration }): string => {
  const ms = toMilliseconds(input.duration);
  if (ms >= 60_000 && ms % 60_000 === 0) return `${ms / 60_000} minutes`;
  return `${Math.ceil(ms / 1000)} seconds`;
};

/**
 * .what = run `aws configure export-credentials` for one profile, under the hang guard
 * .why = the one place the cli runs, so its bound and its error shape hold for every caller
 * .note = a failure names the profile and the cli's own error, never a credential value; the
 *   cli's error object is not chained as a cause, since it carries the cli's stdout
 */
const getOneAwsProfileExportFromCli = async (input: {
  profile: string;
  hangGuard: IsoDuration;
}): Promise<AwsProfileExport> => {
  // run the cli under this process's env, the one its identity was read from
  // .note = `exec aws …` makes the shell replace itself with the cli, so `.child` (which the
  //   promisified exec attaches to its promise) is the cli itself, never a wrapper shell
  const exportAwaited = execAsync(
    `exec aws configure export-credentials --profile ${asShellSingleQuoted({ value: input.profile })} --format env-no-export`,
    { env: process.env },
  );

  // kill the cli at the hang guard
  // .note = a race, not exec's `timeout`: a grandchild that held the pipe would stretch that bound
  // .note = deliberate mutation — the timer handle is cleared once the race settles
  let timer: NodeJS.Timeout | undefined;
  const hung = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      const isKillSent = exportAwaited.child.kill('SIGKILL');
      reject(
        new MalfunctionError('aws configure export-credentials hung', {
          profile: input.profile,
          hangGuard: input.hangGuard,
          isKillSent,
          hint: `run \`${asAwsProfileExportHandRun({ profile: input.profile })}\` by hand to see where it stalls`,
          hintAfterRetry: true,
        }),
      );
    }, toMilliseconds(input.hangGuard));
  });
  // the first to settle wins; a hang is already a MalfunctionError, a cli fault becomes one
  const stdout = await Promise.race([exportAwaited, hung])
    .then(
      (settled) => settled.stdout,
      (error: unknown) => {
        if (error instanceof MalfunctionError) throw error;
        throw new MalfunctionError('aws configure export-credentials failed', {
          profile: input.profile,
          cliError: asAwsExecFailureText({ error }),
          hint: `run \`${asAwsProfileExportHandRun({ profile: input.profile })}\` by hand to see the cli's own error, then fix the profile or its sso session`,
          hintAfterRetry: true,
        });
      },
    )
    .finally(() => clearTimeout(timer));

  // parse the env lines
  const credentials = asAwsCredentialsFromEnvLines({ stdout });
  if (!credentials.AWS_ACCESS_KEY_ID || !credentials.AWS_SECRET_ACCESS_KEY)
    throw new MalfunctionError(
      'aws configure export-credentials did not return expected credentials',
      {
        profile: input.profile,
        keysFound: Object.keys(credentials),
        hint: `run \`${asAwsProfileExportHandRun({ profile: input.profile })}\` by hand to see what the cli emits, fix the profile's config, then retry`,
        hintAfterRetry: true,
      },
    );

  // bound its life
  const expiresAt = asAwsProfileExportExpiresAt({
    profile: input.profile,
    credentials,
  });
  return { credentials, expiresAt };
};

/**
 * .what = the `KEY=value` lines of `--format env-no-export`, as a record
 * .why = callers set these keys into an env, so the record keeps the cli's own key names
 */
const asAwsCredentialsFromEnvLines = (input: {
  stdout: string;
}): Record<string, string> =>
  Object.fromEntries(
    input.stdout
      .trim()
      .split('\n')
      .map((line) => line.match(/^([A-Z_]+)=(.*)$/))
      .filter((match): match is RegExpMatchArray => !!match?.[1])
      .map((match) => [match[1]!, match[2] ?? '']),
  );

/**
 * .what = the aws creds of one profile: found in an owner-only disk cache while they have life
 *   left, else exported — at most one export at a time per profile per box — and cached
 * .why = `aws configure export-credentials` costs a python startup and an sso round trip;
 *   a burst of callers for one profile (a jest env, N unlocks) ran it N times at once
 *   (ehmpathy/rhachet#656). its output is idempotent within its expiry, so it is a value to
 *   find-or-create, not an act to repeat
 *
 * .note = `refresh: true` finds none: it drops the entry before it queues and again under the
 *   hold, then exports and writes — for the post-login refresh, so creds minted before a
 *   re-login are never served after it (fulcrum F2)
 * .note = no credential value reaches a log or an error; the cache file is 0600 in a 0700 dir
 * .note = a wait on a peer's export is announced once per wait, on stderr (fulcrum F6)
 * .note = runs only the aws cli and the cache file under its hold, so it never nests its key
 */
export const genAwsProfileExport = async (
  input: {
    profile: string;
    refresh: boolean;
  },
  options?: {
    /** the bounds; a test shortens them to prove a lapse or a hang within its run */
    bounds?: { lease: IsoDuration; wait: IsoDuration; hangGuard: IsoDuration };
  },
): Promise<AwsProfileExport> => {
  const bounds = options?.bounds ?? {
    lease: LEASE,
    wait: WAIT,
    hangGuard: HANG_GUARD,
  };
  const identity = getOneAwsProfileExportIdentity({ profile: input.profile });
  const { cacheDir, cachePath, lockDir, key } = getOneAwsProfileExportPaths({
    identity,
  });
  setAwsProfileExportCacheDir({ profile: input.profile, cacheDir });

  // a refresh drops the prior entry before it waits, so no reader in the wait gets it
  if (input.refresh)
    delAwsProfileExportCached({ profile: input.profile, cachePath });

  // a warm read returns before it takes the key
  if (!input.refresh) {
    const cached = getOneAwsProfileExportCached({ identity, cachePath });
    if (cached) return cached;
  }

  // take the box mutex on this identity; one export at a time
  return withDiskMutex(
    {
      dir: lockDir,
      key,
      lease: bounds.lease,
      wait: bounds.wait,
      onWait: () =>
        emitAwsProfileExportWaitNotice({
          profile: input.profile,
          waitWords: asDurationWords({ duration: bounds.wait }),
          leaseWords: asDurationWords({ duration: bounds.lease }),
        }),
      asTimeoutError: ({ cause }) =>
        new ConstraintError(
          'another process held the aws export for this profile past the wait bound',
          {
            profile: input.profile,
            wait: bounds.wait,
            hint: `if the other process was killed, its hold lapses on its own within ${asDurationWords({ duration: bounds.lease })}; retry then, or run \`${asAwsProfileExportHandRun({ profile: input.profile })}\` by hand to check that it completes`,
            cause,
          },
        ),
    },
    async () => {
      // a peer may have filled the cache while we waited; a refresh drops it again
      if (input.refresh)
        delAwsProfileExportCached({ profile: input.profile, cachePath });
      if (!input.refresh) {
        const cached = getOneAwsProfileExportCached({ identity, cachePath });
        if (cached) return cached;
      }

      // export
      const exported = await getOneAwsProfileExportFromCli({
        profile: input.profile,
        hangGuard: bounds.hangGuard,
      });

      // cache it, then return it
      setAwsProfileExportCached({ identity, cacheDir, cachePath, exported });
      return exported;
    },
  );
};
