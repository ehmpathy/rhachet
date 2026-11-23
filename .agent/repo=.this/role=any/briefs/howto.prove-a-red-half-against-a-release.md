# howto.prove-a-red-half-against-a-release

> **a defect fix owes its red half on the release the defect was REPORTED on. run today's
> acceptance test over that release's dist with `rhx test.against.release`.**

```sh
rhx test.against.release --version 1.48.0 \
  --scope blackbox/cli/init.hooks.outside-repo.acceptance.test.ts --name 'case10' --expect red
```

## .why it works

`bin/run` sends every command but `run` and `roles boot|cost` to `bin/run.jit`, which loads
`./dist`. the skill swaps `./dist` for the release's dist, runs jest, and puts `./dist` back on
every exit. today's test, the old build, no checkout of old source.

## .the traps

| trap | what it costs | the guard |
|---|---|---|
| `npm pack rhachet@<v>` inside this repo | it packs the LOCAL tree: the `link:.` self-link wins over the spec, and so does `npm pack <url>` | the skill downloads the registry tarball, then checks the unpacked version |
| the version you assume, not the one reported | a red on the wrong build proves the wrong claim | read the reporter's pin (`rhx git.repo.get lines --in <org/repo> --paths package.json`) |
| a red for the wrong reason | a scene the old build cannot form fails every assertion at once, and reads as a red | read `jest.log`. a red half must fail on the claim, with the scene formed |
| an assertion of absence | "no error prints" passes on a build that hides its errors | pair it with a positive assertion: the exit code, the note, the file |

## .the worked case

#661 (2026-10-26): case1 laid the actor arrow to a 0444 home, and stayed green on 1.48.0, since the
fixture's brain writes `settings.of.repo.json`. the reporter pinned `rhachet-brains-anthropic@0.4.3`,
which writes `settings.json` by name. only a scene with that real adapter (case10) went red, and it
reproduced the report to the line.

⇒ **match the reporter's versions, every package that writes, not only rhachet.**
