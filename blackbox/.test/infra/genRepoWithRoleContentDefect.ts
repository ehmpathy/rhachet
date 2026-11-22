import { genTempDir } from 'test-fns';

import { setupEnrollFixture } from '@/blackbox/.test/infra/enrollCloneHarness';
import type { RoleContentDefectKind } from '@src/domain.objects/RoleContentDefect';

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * .what = the cache boundary literal, spelled by parts, never whole
 * .why = this file sits in the repo whose own boot is rendered; the parts keep a grep for the
 *        literal clean
 */
export const BOUNDARY_LITERAL = ['__SYSTEM_PROMPT', 'DYNAMIC_BOUNDARY__'].join(
  '_',
);

/**
 * .what = a boot.yml that says one brief whole, so its body reaches the corpus
 */
export const BOOT_YML_SAY_CORE = [
  'always:',
  '  briefs:',
  '    say:',
  '      - briefs/core.md',
  '',
].join('\n');

/**
 * .what = one fixture per content defect kind — the files that plant it, and the path it names
 * .why = keyed by every `RoleContentDefectKind`, so a new content check that lands with no
 *        fixture fails the type check here: no kind can ship unclamped
 *        (`rule.forbid.content-checks-that-halt-enroll`)
 */
export const FIXTURE_BY_KIND: {
  [K in RoleContentDefectKind]: {
    files: Record<string, string>;
    pathNamed: string;
    /** the file the clone rewrites (null = deletes) to repair the defect */
    repair: { relpath: string; content: string | null };
  };
} = {
  'orphan-min': {
    files: {
      'boot.yml': BOOT_YML_SAY_CORE,
      'briefs/core.md': '# core\n\nthe one brief every clone reads.\n',
      'briefs/lost.md.min': '# lost\n\na minified brief whose source is gone.\n',
    },
    pathNamed: '.agent/repo=.this/role=any/briefs/lost.md.min',
    repair: { relpath: 'briefs/lost.md.min', content: null },
  },
  'boundary-literal': {
    files: {
      'boot.yml': BOOT_YML_SAY_CORE,
      'briefs/core.md': [
        '# core',
        '',
        'the render splits the prompt at this line:',
        '',
        '```',
        BOUNDARY_LITERAL,
        '```',
        '',
      ].join('\n'),
    },
    pathNamed: '.agent/repo=.this/role=any/briefs/core.md',
    repair: {
      relpath: 'briefs/core.md',
      content: '# core\n\nthe render splits the prompt at the boundary line.\n',
    },
  },
  'spec-unparsed': {
    files: {
      'boot.yml': 'always:\n  briefs:\n    say: [briefs/core.md\n',
      'briefs/core.md': '# core\n\nthe one brief every clone reads.\n',
    },
    pathNamed: '.agent/repo=.this/role=any/boot.yml',
    repair: { relpath: 'boot.yml', content: BOOT_YML_SAY_CORE },
  },
};

/**
 * .what = every defect kind the fixture plants, in declared order
 * .why = a clamp walks each kind; the guard narrows the record's keys with no cast, and the
 *        record's own type already demands one fixture per kind
 */
const isKindOfFixture = (key: string): key is RoleContentDefectKind =>
  key in FIXTURE_BY_KIND;
export const KINDS_OF_FIXTURE: RoleContentDefectKind[] =
  Object.keys(FIXTURE_BY_KIND).filter(isKindOfFixture);

/**
 * .what = a repo with the roles linked and one content defect planted in its `.this` role
 * .why = one fixture for the birth clamp (integration, a stub brain) and the stop clamp
 *        (acceptance, no brain), so both grains read the same defect
 */
export const genRepoWithRoleContentDefect = (input: {
  kind: RoleContentDefectKind;
}): { dir: string; env: { CLAUDE_CONFIG_DIR: string } } => {
  const dir = genTempDir({ slug: `role-defect-${input.kind}` });
  const configDir = genTempDir({ slug: `role-defect-${input.kind}-cfg` });
  setupEnrollFixture({ dir });
  const roleDir = join(dir, '.agent', 'repo=.this', 'role=any');
  Object.entries(FIXTURE_BY_KIND[input.kind].files).forEach(
    ([relpath, content]) => {
      mkdirSync(dirname(join(roleDir, relpath)), { recursive: true });
      writeFileSync(join(roleDir, relpath), content);
    },
  );
  return { dir, env: { CLAUDE_CONFIG_DIR: configDir } };
};
