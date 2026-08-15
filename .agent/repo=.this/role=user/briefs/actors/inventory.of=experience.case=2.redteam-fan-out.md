# experience: a redteam fan-out 🐈

part of the [experience inventory](./inventory.of=experience._.md).

bake a base clone, task it on spawn, then fork it — with a role delta — into specialists that inherit
its findings:

```bash
# bake a guardian clone as the redteamer, tasked on spawn
rhx clone @guardian --as @:redteamer --say 'itemize the dependencies that form the attack surface'

# …time passes; @:redteamer has itemized the surface…

# fork the redteamer — seeded with its findings — into two researchers, +researcher, distinct tasks
rhx clone @:redteamer +researcher --as @:redteamer-research-common   --say 'research common vulnerabilities with these dependencies'
rhx clone @:redteamer +researcher --as @:redteamer-research-surprise --say 'research surprise vulnerabilities with these dependencies'

# fork one more, +spelunker, that watches the researchers for new surfaces
rhx clone @:redteamer +spelunker --say 'explore vulnerabilities with these dependencies. periodically check on the outputs of the redteam research for new surfaces to explore'
```

what makes it notable — three moves compose:

- **`--say <m>`** dispatches the first task on spawn — no separate `say` step
- **`@:redteamer +researcher`** forks the redteamer *with* a role delta: each fork inherits the
  attack-surface findings AND gains the `researcher` role
- the spelunker's task reads its peers' output (via `get`) and steers the fan-out itself — clones
  observe clones, no human in the loop
