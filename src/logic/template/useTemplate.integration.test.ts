import { genArtifactGitFile } from 'rhachet-artifact-git';

import { genThread } from '../thread/genThread';
import { genTemplate } from './genTemplate';

test('hydrates a real template using thread-derived variables', async () => {
  const ref = { uri: __dirname + '/.temp/useTemplate.example1.md' };

  await genArtifactGitFile(ref).set({
    content: 'Hello $.rhachet{name} — today is $.rhachet{meta.day}',
  });

  const threads = {
    person: genThread({
      role: 'person',
      name: 'Casey',
      meta: { day: 'Monday' },
    }),
  };

  const template = genTemplate({
    ref,
    getVariables: (input: { threads: typeof threads }) => ({
      name: input.threads.person.context.name,
      meta: input.threads.person.context.meta,
    }),
  });

  const result = await template.use({ threads });

  expect(result).toBe('Hello Casey — today is Monday');
});
