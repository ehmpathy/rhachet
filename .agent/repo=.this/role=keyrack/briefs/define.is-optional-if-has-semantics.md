# define.is-optional-if-has-semantics

## .what

keyrack.yml supports `is-optional-if-has` syntax for conditional requirements.

```yaml
env.all:
  - key: AWS_PROFILE
    is-optional-if-has: AWS_ACCESS_KEY_ID
```

## .semantic

`is-optional-if-has: AWS_ACCESS_KEY_ID` means:
- "AWS_PROFILE is not required if AWS_ACCESS_KEY_ID is set"
- strict mode passes if either key is present

it does NOT mean:
- keyrack will provide/grant AWS_ACCESS_KEY_ID
- both keys are available from keyrack

## .key distinction

| concern | what it means |
|---------|---------------|
| requirement validation | "is the strict mode requirement satisfied?" |
| grant resolution | "which key can keyrack provide?" |

`is-optional-if-has` affects **requirement validation only**.

## .example

```yaml
env.all:
  # requirement: AWS_PROFILE is optional if AWS_ACCESS_KEY_ID is set
  - key: AWS_PROFILE
    is-optional-if-has: AWS_ACCESS_KEY_ID

  # to make AWS_ACCESS_KEY_ID grantable by keyrack, declare it:
  - AWS_ACCESS_KEY_ID
```

in this config:
- strict mode passes if either AWS_PROFILE or AWS_ACCESS_KEY_ID is set
- keyrack can grant both AWS_PROFILE and AWS_ACCESS_KEY_ID (both declared)

without the second line:
- strict mode still passes if AWS_ACCESS_KEY_ID is set
- but keyrack cannot grant AWS_ACCESS_KEY_ID (not declared for grant)

## .usecase

CI with OIDC sets `AWS_ACCESS_KEY_ID` via environment, not via keyrack. the `is-optional-if-has` syntax allows strict mode to pass even though keyrack doesn't manage that key.
