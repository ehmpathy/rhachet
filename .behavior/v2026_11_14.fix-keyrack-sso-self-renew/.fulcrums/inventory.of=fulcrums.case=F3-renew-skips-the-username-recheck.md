# F3 · the renew does not re-check `awsSsoUsername`

- **the fork:** (a) the renew trusts the profile's live token, no user check · (b) the grant carries the expected username and the renew compares the sts identity against it
- **taken:** (a). the daemon does not hold `meta.awsSsoUsername` (it lives in the encrypted host manifest), and a silent renew runs no login, so the portal token's user cannot change under it. only a browser login, which a human drives, can switch users.
- **rework:** clean — (b) adds one field to what the daemon holds and one comparison.
- **confidence:** 80%. a human could run `aws sso login` by hand as a different user on the same domain between renews; (a) would then renew as that user.
- **where:** `1.vision.yield.md` · open questions, edgecases.
- **verdict:** awaited from the council.
