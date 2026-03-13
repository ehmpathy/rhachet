# brain input: role

## .what

the role persona for the brain. provides context and behavioral guidance.

## .shape

```ts
role: {
  briefs?: Artifact<typeof GitFile>[];
}
```

## .briefs

briefs are git file artifacts that shape the brain's behavior and context.

```ts
import { genArtifactGitFile } from 'rhachet-artifact-git';

const brief = genArtifactGitFile({ uri: '.agent/repo=.this/role=mechanic/briefs/practices/code.prod/rule.md' });

const result = await context.brain.repl.ask({
  role: { briefs: [brief] },
  prompt: 'review this code',
});
```

## .why

- shapes brain behavior with domain-specific guidance
- provides context from project briefs and rules
- enables role-based personas (mechanic, architect, etc)

## .see also

- [roles.<use>](../../../../readme.md) — role enrollment
- [howto.use.brain.prompt](./howto.use.brain.prompt.md) — the prompt input
