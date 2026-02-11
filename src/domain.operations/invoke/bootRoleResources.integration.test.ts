import { genTempDir, given, then, useBeforeAll, when } from 'test-fns';

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { bootRoleResources } from './bootRoleResources';

/**
 * .what = integration tests for bootRoleResources with boot.yml
 * .why = verifies boot.yml integration end-to-end
 */
describe('bootRoleResources', () => {
  // capture console.log output
  let output: string[] = [];
  const originalLog = console.log;

  beforeEach(() => {
    output = [];
    console.log = (...args) => output.push(args.join(' '));
  });

  afterEach(() => {
    console.log = originalLog;
  });

  given('[case1] role with no boot.yml', () => {
    const scene = useBeforeAll(async () => {
      const tempDir = genTempDir({ slug: 'bootRoleResources-test-1' });
      const roleDir = join(tempDir, '.agent', 'repo=.this', 'role=any');

      // setup temp directory
      mkdirSync(join(roleDir, 'briefs'), { recursive: true });
      mkdirSync(join(roleDir, 'skills'), { recursive: true });

      // create test files
      writeFileSync(join(roleDir, 'readme.md'), '# readme\ntest content');
      writeFileSync(join(roleDir, 'briefs', 'brief1.md'), 'brief 1 content');
      writeFileSync(join(roleDir, 'briefs', 'brief2.md'), 'brief 2 content');
      writeFileSync(
        join(roleDir, 'skills', 'skill1.sh'),
        '#!/bin/bash\n# .what = skill 1\necho hello',
      );

      return { tempDir };
    });

    when('[t0] booted', () => {
      then('all briefs are said with full content', async () => {
        await bootRoleResources({
          slugRepo: '.this',
          slugRole: 'any',
          ifPresent: false,
          cwd: scene.tempDir,
        });

        const fullOutput = output.join('\n');

        // verify briefs have full content
        expect(fullOutput).toContain(
          '<brief.say path=".agent/repo=.this/role=any/briefs/brief1.md">',
        );
        expect(fullOutput).toContain('brief 1 content');
        expect(fullOutput).toContain(
          '<brief.say path=".agent/repo=.this/role=any/briefs/brief2.md">',
        );
        expect(fullOutput).toContain('brief 2 content');
      });

      then('all skills are said with full content', async () => {
        await bootRoleResources({
          slugRepo: '.this',
          slugRole: 'any',
          ifPresent: false,
          cwd: scene.tempDir,
        });

        const fullOutput = output.join('\n');

        // verify skill has content
        expect(fullOutput).toContain(
          '<skill.say path=".agent/repo=.this/role=any/skills/skill1.sh">',
        );
      });

      then('stats do not show say/ref breakdown', async () => {
        await bootRoleResources({
          slugRepo: '.this',
          slugRole: 'any',
          ifPresent: false,
          cwd: scene.tempDir,
        });

        const fullOutput = output.join('\n');

        // verify simple stats (no say/ref breakdown)
        expect(fullOutput).toContain('├── briefs = 2');
        expect(fullOutput).toContain('└── skills = 1');
        expect(fullOutput).not.toContain('say =');
        expect(fullOutput).not.toContain('ref =');
      });
    });
  });

  given('[case2] role with boot.yml (simple mode: say list)', () => {
    const scene = useBeforeAll(async () => {
      const tempDir = genTempDir({ slug: 'bootRoleResources-test-2' });
      const roleDir = join(tempDir, '.agent', 'repo=.this', 'role=any');

      // setup temp directory
      mkdirSync(join(roleDir, 'briefs', 'subdir'), { recursive: true });
      mkdirSync(join(roleDir, 'skills'), { recursive: true });

      // create test files
      writeFileSync(join(roleDir, 'readme.md'), '# readme\ntest content');
      writeFileSync(
        join(roleDir, 'briefs', 'always-say.md'),
        'always say content',
      );
      writeFileSync(
        join(roleDir, 'briefs', 'not-matched.md'),
        'not matched content',
      );
      writeFileSync(
        join(roleDir, 'briefs', 'subdir', 'deep.md'),
        'deep content',
      );
      writeFileSync(
        join(roleDir, 'skills', 'say-me.sh'),
        '#!/bin/bash\n# .what = say skill\necho say',
      );
      writeFileSync(
        join(roleDir, 'skills', 'ref-me.sh'),
        '#!/bin/bash\n# .what = ref skill\necho ref',
      );

      // create boot.yml with say globs (paths relative to role directory)
      writeFileSync(
        join(roleDir, 'boot.yml'),
        `briefs:
  say:
    - briefs/always-say.md
    - briefs/subdir/**/*.md
skills:
  say:
    - skills/say-me.sh
`,
      );

      return { tempDir };
    });

    when('[t0] booted', () => {
      then('matched briefs are said with full content', async () => {
        await bootRoleResources({
          slugRepo: '.this',
          slugRole: 'any',
          ifPresent: false,
          cwd: scene.tempDir,
        });

        const fullOutput = output.join('\n');

        // verify matched briefs have full content
        expect(fullOutput).toContain(
          '<brief.say path=".agent/repo=.this/role=any/briefs/always-say.md">',
        );
        expect(fullOutput).toContain('always say content');
        expect(fullOutput).toContain(
          '<brief.say path=".agent/repo=.this/role=any/briefs/subdir/deep.md">',
        );
        expect(fullOutput).toContain('deep content');
      });

      then('unmatched briefs are ref with path only', async () => {
        await bootRoleResources({
          slugRepo: '.this',
          slugRole: 'any',
          ifPresent: false,
          cwd: scene.tempDir,
        });

        const fullOutput = output.join('\n');

        // verify unmatched brief is ref (path only)
        expect(fullOutput).toContain(
          '<brief.ref path=".agent/repo=.this/role=any/briefs/not-matched.md"/>',
        );
        // verify ref does not have full content nearby
        const refIndex = fullOutput.indexOf(
          '<brief.ref path=".agent/repo=.this/role=any/briefs/not-matched.md"/>',
        );
        const nextLine = fullOutput.slice(refIndex).split('\n')[1];
        expect(nextLine).not.toContain('not matched content');
      });

      then('matched skills are said with full content', async () => {
        await bootRoleResources({
          slugRepo: '.this',
          slugRole: 'any',
          ifPresent: false,
          cwd: scene.tempDir,
        });

        const fullOutput = output.join('\n');

        // verify matched skill has content
        expect(fullOutput).toContain(
          '<skill.say path=".agent/repo=.this/role=any/skills/say-me.sh">',
        );
      });

      then('unmatched skills are ref with path only', async () => {
        await bootRoleResources({
          slugRepo: '.this',
          slugRole: 'any',
          ifPresent: false,
          cwd: scene.tempDir,
        });

        const fullOutput = output.join('\n');

        // verify unmatched skill is ref
        expect(fullOutput).toContain(
          '<skill.ref path=".agent/repo=.this/role=any/skills/ref-me.sh"/>',
        );
      });

      then('stats show say/ref breakdown', async () => {
        await bootRoleResources({
          slugRepo: '.this',
          slugRole: 'any',
          ifPresent: false,
          cwd: scene.tempDir,
        });

        const fullOutput = output.join('\n');

        // verify stats show breakdown
        expect(fullOutput).toContain('├── briefs = 3');
        expect(fullOutput).toContain('│   ├── say = 2');
        expect(fullOutput).toContain('│   └── ref = 1');
        expect(fullOutput).toContain('└── skills = 2');
        expect(fullOutput).toContain('    ├── say = 1');
        expect(fullOutput).toContain('    └── ref = 1');
      });
    });
  });

  given('[case3] role with boot.yml (simple mode) and --usecase', () => {
    const scene = useBeforeAll(async () => {
      const tempDir = genTempDir({ slug: 'bootRoleResources-test-usecase' });
      const roleDir = join(tempDir, '.agent', 'repo=.this', 'role=any');

      // setup temp directory
      mkdirSync(join(roleDir, 'briefs'), { recursive: true });

      // create test files
      writeFileSync(join(roleDir, 'readme.md'), '# readme');
      writeFileSync(join(roleDir, 'briefs', 'brief1.md'), 'brief 1');

      // create boot.yml with simple mode
      writeFileSync(
        join(roleDir, 'boot.yml'),
        `briefs:
  say:
    - briefs/brief1.md
`,
      );

      return { tempDir };
    });

    when('[t0] booted with --usecase', () => {
      then('throws error: usecase requires subject mode', async () => {
        await expect(
          bootRoleResources({
            slugRepo: '.this',
            slugRole: 'any',
            ifPresent: false,
            subjects: ['test'],
            cwd: scene.tempDir,
          }),
        ).rejects.toThrow('--subject requires boot.yml in subject mode');
      });
    });
  });

  given('[case4] role with no boot.yml and --usecase', () => {
    const scene = useBeforeAll(async () => {
      const tempDir = genTempDir({
        slug: 'bootRoleResources-test-no-boot-usecase',
      });
      const roleDir = join(tempDir, '.agent', 'repo=.this', 'role=any');

      // setup temp directory
      mkdirSync(join(roleDir, 'briefs'), { recursive: true });

      // create test files (no boot.yml)
      writeFileSync(join(roleDir, 'readme.md'), '# readme');
      writeFileSync(join(roleDir, 'briefs', 'brief1.md'), 'brief 1');

      return { tempDir };
    });

    when('[t0] booted with --usecase', () => {
      then('throws error: usecase requires subject mode', async () => {
        await expect(
          bootRoleResources({
            slugRepo: '.this',
            slugRole: 'any',
            ifPresent: false,
            subjects: ['test'],
            cwd: scene.tempDir,
          }),
        ).rejects.toThrow('--subject requires boot.yml in subject mode');
      });
    });
  });

  given('[case5] role with boot.yml (simple mode: empty say)', () => {
    const scene = useBeforeAll(async () => {
      const tempDir = genTempDir({ slug: 'bootRoleResources-test-3' });
      const roleDir = join(tempDir, '.agent', 'repo=.this', 'role=any');

      // setup temp directory
      mkdirSync(join(roleDir, 'briefs'), { recursive: true });
      mkdirSync(join(roleDir, 'skills'), { recursive: true });

      // create test files
      writeFileSync(join(roleDir, 'readme.md'), '# readme');
      writeFileSync(join(roleDir, 'briefs', 'brief1.md'), 'brief 1');
      writeFileSync(join(roleDir, 'briefs', 'brief2.md'), 'brief 2');

      // create boot.yml with empty say array
      writeFileSync(
        join(roleDir, 'boot.yml'),
        `briefs:
  say: []
`,
      );

      return { tempDir };
    });

    when('[t0] booted', () => {
      then('all briefs are ref with path only', async () => {
        await bootRoleResources({
          slugRepo: '.this',
          slugRole: 'any',
          ifPresent: false,
          cwd: scene.tempDir,
        });

        const fullOutput = output.join('\n');

        // verify all briefs are ref
        expect(fullOutput).toContain(
          '<brief.ref path=".agent/repo=.this/role=any/briefs/brief1.md"/>',
        );
        expect(fullOutput).toContain(
          '<brief.ref path=".agent/repo=.this/role=any/briefs/brief2.md"/>',
        );
        // verify no say briefs with content
        expect(fullOutput).not.toContain('<brief.say path=');
      });

      then('stats show all briefs as ref', async () => {
        await bootRoleResources({
          slugRepo: '.this',
          slugRole: 'any',
          ifPresent: false,
          cwd: scene.tempDir,
        });

        const fullOutput = output.join('\n');

        // verify stats
        expect(fullOutput).toContain('├── briefs = 2');
        expect(fullOutput).toContain('│   ├── say = 0');
        expect(fullOutput).toContain('│   └── ref = 2');
      });
    });
  });
});
