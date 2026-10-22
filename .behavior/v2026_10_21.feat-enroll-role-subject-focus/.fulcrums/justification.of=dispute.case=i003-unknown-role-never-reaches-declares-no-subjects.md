# justification: an unknown focused role never reaches "declares no subjects"

- dispute of = r006 arch-hazards-maintenance, i003, nitpick.1
- claim of the reviewer = an unloadable or unknown focused role is reported as "declares no
  subjects", the wrong cause with the wrong fix

## .why it does not hold

the roles a focus names are loaded by `getRolesFromManifests` before any focus check runs. that
load fails fast on a slug no manifest answers, and its refusal names the role, so a typo'd or
unknown role is refused for the true cause, upstream of the focus check.

the one path that reaches "declares no subjects" is a role that loaded and declares no subject
section in its boot.yml. there, the message names the true cause, and its fix — focus a subject
the role declares, or enroll it whole — is the right one.

## .what would overturn it

a load path that hands the focus check a role with no manifest behind it. none exists in this
change; if one is added, the check must name the load failure, not the subject.
