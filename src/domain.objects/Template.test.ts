import { given, then, when } from 'test-fns';
import type { Empty } from 'type-fns';

import { Template } from './Template';

describe('Template', () => {
  const mockUri = 'templates/hello.md';

  given('a Template that uses input variables to render', () => {
    const template = new Template<{ name: string }>({
      ref: { uri: mockUri },
      use: async ({ name }) => `Hello, ${name}!`,
    });

    when('calling use with a variable object', () => {
      then('it returns the correctly hydrated string', async () => {
        const result = await template.use({ name: 'Casey' });
        expect(result).toBe('Hello, Casey!');
      });
    });
  });

  given('a Template with empty variable usage', () => {
    const template = new Template<Empty>({
      ref: { uri: mockUri },
      use: async () => '',
    });

    when('calling use with an empty object', () => {
      then('it returns an empty string', async () => {
        const result = await template.use({});
        expect(result).toBe('');
      });
    });
  });

  it('should error if required variable is missing', async () => {
    const template = new Template<{ name: string }>({
      ref: { uri: mockUri },
      use: async ({ name }) => `Hi ${name}`,
    });

    // @ts-expect-error - missing required field `name`
    await template.use({});
  });

  it('should error if variable shape is incompatible', () => {
    const template = new Template<{ age: number }>({
      ref: { uri: mockUri },
      // @ts-expect-error - attempting to access a nonexistent property on age
      use: async ({ age }) => `Age: ${age.name}`,
    });
    expect(template);
  });
});
