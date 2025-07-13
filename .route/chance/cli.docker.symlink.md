desire: cli to provision docker instance and symlink to nearest git root


cli will provision docker environment to run within
- why docker? to isolate your data, to enable principle of least privilege
  - docker instances have only the data you explicitly provision
  - this provides portability and also prevents leakage
- why docker? enables reusable environments for orgs
  - e.g., for tuned tactics that depend on server-local resources
  - e.g., for credentials or proprietaries
  - e.g., for consistency between environments; env.server=docker > env.server=(cicd | local | docker | aws:lambda | ...)
- why docker? enables execution against remote docker instances (e.g,. commands against shared servers)
  - e.g., https://medium.com/@ni8hin/title-remotely-connecting-to-a-docker-daemon-on-aws-ec2-instances-b7e2cd4302bd

&&

will guide on how to connect vscode to look at the shared artifact directory against that directory
- symlink to .rhachet directory within closest git root called from



=(gpt)===>


🐳 Why This CLI Uses Docker
This CLI provisions and runs commands inside a Docker environment by default. Here's why:

🔐 1. Isolation & Security by Default
Docker enables the principle of least privilege:

Containers only access data and volumes you explicitly provide.

Prevents accidental leakage of sensitive local files.

Promotes secure-by-default execution with no assumptions about the host system.

Ensures portability — run the same commands identically across machines.

♻️ 2. Reusable, Organization-Specific Environments
Docker containers allow you to encode project- or org-specific needs, such as:

Tuned runtimes: with custom compilers, GPU drivers, etc.

Credentials or proprietary tooling: securely mounted or baked in.

Environment consistency: enforce env.server = docker across dev, CI, and production targets.

This keeps behavior consistent, regardless of which env.server you run in

```sh
local | docker | ci | aws:lambda | ...etc
```


🌍 3. Remote Execution Support
The CLI supports targeting remote Docker hosts for shared compute or job runners.

Enables teams to run jobs against shared EC2 or on-prem Docker servers.

Docker’s remote API makes this seamless.

Example: Connecting to a remote Docker daemon on AWS EC2

