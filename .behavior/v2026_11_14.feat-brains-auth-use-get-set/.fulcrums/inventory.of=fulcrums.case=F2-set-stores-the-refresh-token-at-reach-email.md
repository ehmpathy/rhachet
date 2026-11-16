# F2 — set stores the oauth refresh token at keyrack reach = email

## .the fork

- A. store the refresh token (`sk-ant-ort01`) from an isolated browser login, filed at reach = email
- B. store a `claude setup-token` long-lived token

## .taken

A. dev-env-setup measured that the usage endpoint rejects a setup-token since ~2026-02, and the
keyrack reach axis was built for one key per claude account (`KeyrackKeyReach.ts:23`).

## .rework

clean.

## .confidence — 85%

the cost of A is rotation on every read (case=9); that hazard is known and designed for. the key is
email alone, which is unsafe if one email spans two orgs (yield a7); `set` refuses an org clash
rather than overwrite, so a wrong guess fails loud, never silent.

## .where

`1.vision.yield.md` → contract · case=1, case=9
