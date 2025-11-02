import { Command } from 'commander';
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { given, when, then, getError } from 'test-fns';

import { invokeBriefsBoot } from './invokeBriefsBoot';

describe('invokeBriefsBoot (integration)', () => {
  given('a CLI program with invokeBriefsBoot registered', () => {
    const testDir = resolve(__dirname, './.temp/invokeBriefsBoot');
    const originalCwd = process.cwd();

    beforeAll(() => {
      // Create test directory structure
      mkdirSync(testDir, { recursive: true });
      process.chdir(testDir);
    });

    afterAll(() => {
      process.chdir(originalCwd);
    });

    const briefsCommand = new Command('briefs');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    beforeEach(() => {
      logSpy.mockClear();
    });

    invokeBriefsBoot({ command: briefsCommand });

    when('invoked with "boot --role mechanic" after creating briefs', () => {
      beforeAll(() => {
        // Clean up first to ensure fresh state
        const cleanBriefsDir = resolve(testDir, '.briefs');
        if (existsSync(cleanBriefsDir)) {
          rmSync(cleanBriefsDir, { recursive: true, force: true });
        }

        // Setup: Create mock brief files
        const briefsDir = resolve(testDir, '.briefs/mechanic');
        mkdirSync(briefsDir, { recursive: true });

        // Create mock node_modules structure for symlinks
        const mockRoleDir = resolve(
          testDir,
          'node_modules/rhachet-roles-ehmpathy/dist/logic/roles/mechanic/.briefs',
        );
        mkdirSync(mockRoleDir, { recursive: true });
        writeFileSync(
          resolve(mockRoleDir, 'brief1.md'),
          '# Brief 1\nThis is test brief 1',
        );
        writeFileSync(
          resolve(mockRoleDir, 'brief2.md'),
          '# Brief 2\nThis is test brief 2',
        );

        // Create symlinks
        symlinkSync(
          '../../node_modules/rhachet-roles-ehmpathy/dist/logic/roles/mechanic/.briefs/brief1.md',
          resolve(briefsDir, 'brief1.md'),
        );
        symlinkSync(
          '../../node_modules/rhachet-roles-ehmpathy/dist/logic/roles/mechanic/.briefs/brief2.md',
          resolve(briefsDir, 'brief2.md'),
        );
      });

      then('it should print all brief files with stats', async () => {
        // Execute boot command
        await briefsCommand.parseAsync(['boot', '--role', 'mechanic'], {
          from: 'user',
        });

        // Check that stats were printed
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('began:stats'),
        );
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('files = 2'),
        );

        // Check that file contents were printed
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('began:.briefs/mechanic/brief1.md'),
        );
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('This is test brief 1'),
        );
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('began:.briefs/mechanic/brief2.md'),
        );
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('This is test brief 2'),
        );

        // Snapshot the full console output
        const allLogOutput = logSpy.mock.calls
          .map((call) => call[0])
          .join('\n');
        expect(allLogOutput).toMatchSnapshot();
      });
    });

    when('invoked with "boot" without --role', () => {
      then('it should throw an error requiring --role', async () => {
        const error = await getError(() =>
          briefsCommand.parseAsync(['boot'], { from: 'user' }),
        );

        expect(error?.message).toContain('--role is required');
      });
    });

    when('invoked with "boot --role mechanic" before creating briefs', () => {
      beforeAll(() => {
        // Clean up to ensure no briefs directory exists
        const briefsDir = resolve(testDir, '.briefs');
        if (existsSync(briefsDir)) {
          rmSync(briefsDir, { recursive: true, force: true });
        }
      });

      then(
        'it should throw an error about missing briefs directory',
        async () => {
          const error = await getError(() =>
            briefsCommand.parseAsync(['boot', '--role', 'mechanic'], {
              from: 'user',
            }),
          );

          expect(error?.message).toContain('Briefs directory not found');
          expect(error?.message).toContain('briefs link');
        },
      );
    });

    when(
      'invoked with "boot --role mechanic" with empty briefs directory',
      () => {
        beforeAll(() => {
          // Clean up first, then create empty briefs directory
          const cleanBriefsDir = resolve(testDir, '.briefs');
          if (existsSync(cleanBriefsDir)) {
            rmSync(cleanBriefsDir, { recursive: true, force: true });
          }

          // Setup: Create empty briefs directory
          const briefsDir = resolve(testDir, '.briefs/mechanic');
          mkdirSync(briefsDir, { recursive: true });
        });

        then('it should warn about no briefs found', async () => {
          await briefsCommand.parseAsync(['boot', '--role', 'mechanic'], {
            from: 'user',
          });

          expect(logSpy).toHaveBeenCalledWith(
            expect.stringContaining('No briefs found'),
          );
        });
      },
    );
  });
});
