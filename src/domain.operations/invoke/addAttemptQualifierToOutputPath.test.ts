import { given, then, when } from 'test-fns';

import { addAttemptQualifierToOutputPath } from './addAttemptQualifierToOutputPath';

describe('addAttemptQualifierToOutputPath', () => {
  describe('with replacement variable', () => {
    given('a path containing {{attempt}} once', () => {
      const input = { path: 'dist/out.{{attempt}}.json', attempt: 3 };

      when('qualifying the path', () => {
        const result = addAttemptQualifierToOutputPath(input);

        then('it replaces the placeholder with i{attempt}', () => {
          expect(result).toBe('dist/out.i3.json');
        });
      });
    });

    given('a path containing {{attempt}} multiple times', () => {
      const input = { path: 'a.{{attempt}}.b.{{attempt}}.c', attempt: 9 };

      when('qualifying the path', () => {
        const result = addAttemptQualifierToOutputPath(input);

        then('it replaces each occurrence', () => {
          expect(result).toBe('a.i9.b.i9.c');
        });
      });
    });

    given('a path with {{attempt}} and dotted directories', () => {
      const input = { path: 'build.v2/out.{{attempt}}.log', attempt: 11 };

      when('qualifying the path', () => {
        const result = addAttemptQualifierToOutputPath(input);

        then(
          'it replaces the placeholder in the filename and preserves directories',
          () => {
            expect(result).toBe('build.v2/out.i11.log');
          },
        );
      });
    });
  });

  describe('wout replacement variable', () => {
    describe('with extension', () => {
      given('a simple file with one extension', () => {
        const input = { path: 'out.json', attempt: 2 };

        when('qualifying the path', () => {
          const result = addAttemptQualifierToOutputPath(input);

          then('it inserts .i{attempt} before the final extension', () => {
            expect(result).toBe('out.i2.json');
          });
        });
      });

      given('a multi-dot basename but a single final extension', () => {
        const input = { path: 'foo.bar.baz.json', attempt: 7 };

        when('qualifying the path', () => {
          const result = addAttemptQualifierToOutputPath(input);

          then('it inserts only before the final extension', () => {
            expect(result).toBe('foo.bar.baz.i7.json');
          });
        });
      });

      given('a hidden file with an extension (e.g., .env.local)', () => {
        const input = { path: '.env.local', attempt: 4 };

        when('qualifying the path', () => {
          const result = addAttemptQualifierToOutputPath(input);

          then(
            'it preserves the leading dot and inserts before the final extension',
            () => {
              expect(result).toBe('.env.i4.local'); // if folks dont want this outcome, they can use {{attempt}} replacement var instead
            },
          );
        });
      });

      given('a dotted directory with a simple filename', () => {
        const input = { path: 'build.v1/output.json', attempt: 5 };

        when('qualifying the path', () => {
          const result = addAttemptQualifierToOutputPath(input);

          then(
            'it preserves directory dots and inserts before the final extension',
            () => {
              expect(result).toBe('build.v1/output.i5.json');
            },
          );
        });
      });

      given('attempt number zero (edge numeric case)', () => {
        const input = { path: 'file.txt', attempt: 0 };

        when('qualifying the path', () => {
          const result = addAttemptQualifierToOutputPath(input);

          then('it renders i0 in the qualified path', () => {
            expect(result).toBe('file.i0.txt');
          });
        });
      });
    });

    /**
     * a compound suffix like `.tar.gz` is NOT treated as one extension today
     *
     * .what = the operation's rule is "insert before the FINAL extension", and
     * `path.parse` reads `output.tar.gz` as name `output.tar` + ext `.gz`. so the
     * qualifier lands between `.tar` and `.gz`. a caller who needs exact placement has
     * `{{attempt}}`, which the branch above honors verbatim.
     *
     * .todo = should compound suffixes ever be supported? the question is open, and
     * these cases do not settle it — they pin what the code does now. the cost of a
     * "yes" is an allowlist with no natural end (`.tar.gz`, `.tar.bz2`, `.tar.xz`,
     * `.d.ts`, …); the cost of a "no" is the `{{attempt}}` detour. whoever answers it
     * should change these expectations along with the rule.
     *
     * .note = these cases previously sat behind `describe.skip` and asserted the
     * OPPOSITE — `output.i5.tar.gz` — an aspiration the code never implemented. a
     * skipped aspiration clamps no boundary at all, and reads to the next maintainer as
     * coverage that exists. they now assert what the operation actually does, so the
     * boundary is pinned: were the parse rule to change, these go red rather than silent
     */
    describe('compound extension', () => {
      given('a nested path with .tar.gz', () => {
        const input = { path: 'build/artifacts/output.tar.gz', attempt: 5 };

        when('the path is qualified', () => {
          const result = addAttemptQualifierToOutputPath(input);

          then(
            'it inserts before the final extension, so .tar stays in the name',
            () => {
              expect(result).toBe('build/artifacts/output.tar.i5.gz');
            },
          );
        });
      });

      given('multiple dotted directories and a multi-dot filename', () => {
        const input = {
          path: 'releases/2025.09.09/artifact.v2.tar.gz',
          attempt: 8,
        };

        when('the path is qualified', () => {
          const result = addAttemptQualifierToOutputPath(input);

          then(
            'it qualifies before the final extension and keeps directory dots intact',
            () => {
              expect(result).toBe('releases/2025.09.09/artifact.v2.tar.i8.gz');
            },
          );
        });
      });

      given('a caller who needs exact placement', () => {
        const input = {
          path: 'build/artifacts/output.{{attempt}}.tar.gz',
          attempt: 5,
        };

        when('the path is qualified', () => {
          const result = addAttemptQualifierToOutputPath(input);

          then('the {{attempt}} token gives them full control', () => {
            expect(result).toBe('build/artifacts/output.i5.tar.gz');
          });
        });
      });
    });

    describe('no extension', () => {
      given('a regular file with no extension (e.g., README)', () => {
        const input = { path: 'README', attempt: 1 };

        when('qualifying the path', () => {
          const result = addAttemptQualifierToOutputPath(input);

          then('it suffixes i{attempt}. after the basename', () => {
            expect(result).toBe('README.i1');
          });
        });
      });

      given('a dotfile with no extension (e.g., .env)', () => {
        const input = { path: '.env', attempt: 7 };

        when('qualifying the path', () => {
          const result = addAttemptQualifierToOutputPath(input);

          then(
            'it suffixes i{attempt} after the basename while keeping the dotfile root',
            () => {
              expect(result).toBe('.env.i7');
            },
          );
        });
      });
    });
  });
});
