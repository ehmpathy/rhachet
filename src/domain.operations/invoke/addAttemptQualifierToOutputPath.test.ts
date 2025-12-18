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

    // explicitly not supported today
    // todo: should we ever support this? folks can simply use template var replacement if needed. otherwise, seems like an infinite list of extensions to allowlist
    describe.skip('double extension', () => {
      given('a nested path with .tar.gz', () => {
        const input = { path: 'build/artifacts/output.tar.gz', attempt: 5 };

        when('qualifying the path', () => {
          const result = addAttemptQualifierToOutputPath(input);

          then('it inserts before the last extension only', () => {
            expect(result).toBe('build/artifacts/output.i5.tar.gz');
          });
        });
      });

      given('multiple dotted directories and a multi-dot filename', () => {
        const input = {
          path: 'releases/2025.09.09/artifact.v2.tar.gz',
          attempt: 8,
        };

        when('qualifying the path', () => {
          const result = addAttemptQualifierToOutputPath(input);

          then(
            'it qualifies before the final extension and keeps directory dots intact',
            () => {
              expect(result).toBe('releases/2025.09.09/artifact.v2.i8.tar.gz');
            },
          );
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
