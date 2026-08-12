import { BadRequestError } from 'helpful-errors';

import {
  type KeyrackKeyReach,
  KeyrackKeySpec,
  KeyrackRepoManifest,
} from '@src/domain.objects/keyrack';
import { asKeyrackKeyReach } from '@src/domain.operations/keyrack/reach/asKeyrackKeyReach';

import { join } from 'node:path';
import {
  type KeyrackManifestExplicit,
  loadManifestExplicit,
} from './loadManifestExplicit';

/**
 * .what = one parsed key entry from an env.* array
 * .why = named once so every parse branch below returns the same shape
 */
interface KeyEntryParsed {
  key: string;
  grade: KeyrackKeySpec['grade'];
  flags: KeyrackKeySpec['flags'];
  reaches: KeyrackKeyReach[];
}

/**
 * .what = parse the `reaches:` list declared under a key
 * .why = a repo declares which reaches every developer here must hold, so `fill`
 *        provisions them without a human who names each one by hand
 *
 * .note = uses the same `asKeyrackKeyReach` parser the cli flag uses, so a manifest can
 *         never legalize a reach exid the flag rejects (e2)
 * .note = a declared reach is UNCONDITIONAL — every entry is one `fill` must satisfy, and
 *         a failure on any one halts. the list carries no strength words: a repo that
 *         declares a reach declares the checkout does not work without it, and a
 *         softer tier would only invite a half-provisioned machine to read as done
 */
const parseReaches = (input: {
  declared: unknown;
  key: string;
}): KeyrackKeyReach[] => {
  if (input.declared == null) return [];
  // .note = a MAP is refused, never flattened. the block was a map while `reaches` carried
  //         strength words (`require:` / `prefer:`), so an old-shape manifest still sits on
  //         real machines. to read its values leniently would provision the right
  //         reaches from the wrong shape and leave the manifest silently stale; to read
  //         its KEYS would provision reaches named `require` and `prefer`. a refusal is
  //         the only answer that sends a human to the line that needs the edit
  //         (rule.prefer.prevent-over-correct)
  if (!Array.isArray(input.declared))
    throw new BadRequestError('invalid reaches block in keyrack manifest', {
      key: input.key,
      declared: input.declared,
      hint: 'reaches must be a list of plaintext reach exids',
    });

  const reaches: KeyrackKeyReach[] = [];
  for (const exid of input.declared) {
    if (typeof exid !== 'string')
      throw new BadRequestError('a reach exid must be a string', {
        key: input.key,
        exid,
      });

    // an exid declared twice would have `fill` walk the same reach twice. the
    // manifest is hand-authored, so this is a human's typo and it is cheaper to refuse
    // than to silently collapse (rule.prefer.prevent-over-correct)
    if (reaches.some((prior) => prior.exid === exid))
      throw new BadRequestError(
        `reach '${exid}' is declared more than once for one key`,
        { key: input.key, exid, hint: `declare '${exid}' exactly once` },
      );

    reaches.push(asKeyrackKeyReach({ exid }));
  }

  return reaches;
};

/**
 * .what = parse a key entry from env.* array
 * .why = handles bare key names, key:grade shorthand, { key, is-optional-if-has } form,
 *        and the { <name>: { reaches } } form
 */
const parseKeyEntry = (entry: unknown): KeyEntryParsed => {
  // bare string: just key name, no grade, no conditional
  if (typeof entry === 'string')
    return {
      key: entry,
      grade: null,
      flags: { isOptionalIfHas: null },
      reaches: [],
    };

  // object form
  if (typeof entry === 'object' && entry !== null) {
    // .cast = yaml boundary. `entry` came off a hand-authored file, so its shape is not
    //         ours to type — the guard above narrows it to a non-null object, and this
    //         widens that to a readable map WITHOUT a claim about any value: each stays
    //         `unknown` and is checked below before use. the alternative, `Object.entries`
    //         on `object`, hands back `any` — strictly weaker (rule.forbid.as-cast, which
    //         permits a documented cast at an external boundary)
    // .removal = drops away the day the repo manifest is parsed through a zod schema, as
    //         the HOST manifest already is
    const obj = entry as Record<string, unknown>;

    // new form: { key: 'X', 'is-optional-if-has': 'Y', grade?: 'ephemeral', reaches?: [...] }
    if ('key' in obj && typeof obj.key === 'string') {
      const isOptionalIfHas =
        'is-optional-if-has' in obj &&
        typeof obj['is-optional-if-has'] === 'string'
          ? obj['is-optional-if-has']
          : null;
      const gradeStr = 'grade' in obj ? obj.grade : null;
      return {
        key: obj.key,
        grade: parseGradeShorthand(gradeStr),
        flags: { isOptionalIfHas },
        reaches: parseReaches({
          declared: obj.reaches ?? null,
          key: obj.key,
        }),
      };
    }

    // legacy form: { KEY_NAME: 'encrypted' } or { KEY_NAME: 'ephemeral' }
    // widened form: { KEY_NAME: { reaches: [ 'beav@ehmpathy.com', ... ] } }
    const [key, declared] = Object.entries(obj)[0] ?? [];
    if (!key)
      throw new BadRequestError('empty key entry in keyrack manifest', {
        entry: obj,
        hint: 'each key entry must have a key name',
      });

    // a mapped value that is an object carries facets (reaches, grade), not a grade shorthand
    if (typeof declared === 'object' && declared !== null) {
      // .cast = yaml boundary, same shape as the `obj` cast that heads this branch:
      //         narrow by guard, widen to a map of `unknown`, check each value before
      //         use (rule.forbid.as-cast)
      const facets = declared as Record<string, unknown>;
      return {
        key,
        grade: parseGradeShorthand(facets.grade ?? null),
        flags: { isOptionalIfHas: null },
        reaches: parseReaches({
          declared: facets.reaches ?? null,
          key,
        }),
      };
    }

    return {
      key,
      grade: parseGradeShorthand(declared),
      flags: { isOptionalIfHas: null },
      reaches: [],
    };
  }

  throw new BadRequestError('invalid key entry in keyrack manifest', { entry });
};

/**
 * .what = parse grade shorthand string to grade shape
 * .why = converts 'encrypted', 'ephemeral', 'encrypted,ephemeral' to structured grade
 */
const parseGradeShorthand = (gradeStr: unknown): KeyrackKeySpec['grade'] => {
  if (gradeStr == null || gradeStr === '') return null;
  if (typeof gradeStr !== 'string') return null;

  const parts = gradeStr.split(',').map((s) => s.trim());
  return {
    protection: parts.includes('encrypted') ? 'encrypted' : null,
    duration: parts.includes('ephemeral') ? 'ephemeral' : null,
  };
};

/**
 * .what = extract env names from section keys (env.* sections except env.all)
 * .why = transforms 'env.test' -> 'test', 'env.prod' -> 'prod'; ignores 'env.all'
 */
const asEnvNamesFromSectionKeys = (input: {
  sectionKeys: string[];
}): string[] =>
  input.sectionKeys.filter((k) => k !== 'env.all').map((k) => k.slice(4)); // remove 'env.' prefix

/**
 * .what = transform keys to use a different org in their slugs
 * .why = extended keys must use root manifest's org, not their original org
 */
const asKeysWithOrg = (input: {
  keys: Record<string, KeyrackKeySpec>;
  org: string;
}): Record<string, KeyrackKeySpec> => {
  const result: Record<string, KeyrackKeySpec> = {};
  for (const [originalSlug, spec] of Object.entries(input.keys)) {
    // construct new slug with target org
    const newSlug = `${input.org}.${spec.env}.${spec.name}`;
    result[newSlug] = new KeyrackKeySpec({
      ...spec,
      slug: newSlug,
    });
  }
  return result;
};

/**
 * .what = extract keys from env sections of a manifest
 * .why = reusable key extraction for both root and extended manifests
 *
 * .note = env.all keys create both .all. slugs AND expand to declared envs
 * .note = .all. slugs are always created for env.all keys (directly resolvable)
 */
const extractKeysFromEnvSections = (input: {
  org: string;
  envSections: Record<string, unknown[]>;
}): Record<string, KeyrackKeySpec> => {
  const keys: Record<string, KeyrackKeySpec> = {};
  const { org, envSections } = input;

  // identify declared envs (env.* sections except env.all)
  const declaredEnvs = asEnvNamesFromSectionKeys({
    sectionKeys: Object.keys(envSections),
  });

  // extract env.all entries
  const envAllEntries: KeyEntryParsed[] = [];
  const envAll = envSections['env.all'];
  if (Array.isArray(envAll)) {
    for (const entry of envAll) {
      envAllEntries.push(parseKeyEntry(entry));
    }
  }

  // register env.all keys with .all. slug (always directly resolvable)
  for (const { key, grade, flags, reaches } of envAllEntries) {
    const slug = `${org}.all.${key}`;
    keys[slug] = new KeyrackKeySpec({
      slug,
      mech: null,
      env: 'all',
      name: key,
      grade,
      reaches,
      flags,
    });
  }

  // register keys for each declared env
  for (const env of declaredEnvs) {
    // expand env.all keys for this env
    for (const { key, grade, flags, reaches } of envAllEntries) {
      const slug = `${org}.${env}.${key}`;
      keys[slug] = new KeyrackKeySpec({
        slug,
        mech: null,
        env,
        name: key,
        grade,
        reaches,
        flags,
      });
    }

    // add env-specific keys (override env.all grade if same key)
    const envEntries = envSections[`env.${env}`];
    if (Array.isArray(envEntries)) {
      for (const entry of envEntries) {
        const { key, grade, flags, reaches } = parseKeyEntry(entry);
        const slug = `${org}.${env}.${key}`;
        keys[slug] = new KeyrackKeySpec({
          slug,
          mech: null,
          env,
          name: key,
          grade,
          reaches,
          flags,
        });
      }
    }
  }

  return keys;
};

/**
 * .what = hydrates KeyrackRepoManifest from explicit manifest with extends resolution
 * .why = centralizes hydration logic with recursive extends traversal
 *
 * .note = merge semantics:
 *   - later extends override earlier extends (last-wins)
 *   - root keys override all extended keys (root-wins)
 *   - org is taken from root manifest only (not inherited)
 */
export const hydrateKeyrackRepoManifest = (
  input: {
    explicit: KeyrackManifestExplicit;
    manifestPath: string;
    visited?: Set<string>;
  },
  context: {
    gitroot: string;
  },
): KeyrackRepoManifest => {
  const { explicit, manifestPath } = input;
  const visited = input.visited ?? new Set<string>();

  // check for circular extends
  if (visited.has(manifestPath)) {
    throw new BadRequestError('circular extends detected in keyrack chain', {
      manifestPath,
      visitedPaths: Array.from(visited),
    });
  }

  // add current path to visited set
  visited.add(manifestPath);

  // collect keys from extended manifests (in order, last-wins)
  let mergedKeys: Record<string, KeyrackKeySpec> = {};
  const extendsChain: string[] = [];

  if (explicit.extends && explicit.extends.length > 0) {
    for (const extendPath of explicit.extends) {
      // compute absolute path from gitroot
      const absolutePath = join(context.gitroot, extendPath);

      // load extended manifest
      const extendedExplicit = loadManifestExplicit({ path: absolutePath });
      if (!extendedExplicit) {
        throw new BadRequestError('extended keyrack not found', {
          path: extendPath,
          absolutePath,
          from: manifestPath,
        });
      }

      // recursively hydrate extended manifest
      const extendedManifest = hydrateKeyrackRepoManifest(
        {
          explicit: extendedExplicit,
          manifestPath: absolutePath,
          visited,
        },
        context,
      );

      // merge extended keys (last-wins)
      mergedKeys = { ...mergedKeys, ...extendedManifest.keys };

      // track extends chain for debug
      extendsChain.push(extendPath);
      if (extendedManifest.extends) {
        extendsChain.push(...extendedManifest.extends);
      }
    }

    // transform all extended keys to use root org
    mergedKeys = asKeysWithOrg({ keys: mergedKeys, org: explicit.org });
  }

  // extract keys from root manifest (use root org for slugs)
  const rootKeys = extractKeysFromEnvSections({
    org: explicit.org,
    envSections: explicit.envSections,
  });

  // root keys override extended keys (root-wins)
  const finalKeys = { ...mergedKeys, ...rootKeys };

  // extract declared envs from root manifest
  const envNames = asEnvNamesFromSectionKeys({
    sectionKeys: Object.keys(explicit.envSections),
  });

  return new KeyrackRepoManifest({
    org: explicit.org,
    envs: envNames,
    keys: finalKeys,
    extends: extendsChain.length > 0 ? extendsChain : undefined,
  });
};
