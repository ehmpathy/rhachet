# Changelog

## [1.7.1](https://github.com/ehmpathy/rhachet/compare/v1.7.0...v1.7.1) (2025-09-27)


### Bug Fixes

* **cli:** passthrough peer attempts via env to isolated threads ([2507a31](https://github.com/ehmpathy/rhachet/commit/2507a31ce5f54dca9bc96b80767892632a65c8e8))

## [1.7.0](https://github.com/ehmpathy/rhachet/compare/v1.6.0...v1.7.0) (2025-09-12)


### Features

* **cli:** perform in parallel isolated threads via --attempts ([fcbc01d](https://github.com/ehmpathy/rhachet/commit/fcbc01df3e35ace1848de52f016856c4c5f2d742))

## [1.6.0](https://github.com/ehmpathy/rhachet/compare/v1.5.0...v1.6.0) (2025-09-07)


### Features

* **sdk:** expose getTemplatePathByCallerPath util ([2a79cde](https://github.com/ehmpathy/rhachet/commit/2a79cdef3593ebfeb6d7adf2f316e2abd8024506))

## [1.5.0](https://github.com/ehmpathy/rhachet/compare/v1.4.0...v1.5.0) (2025-09-04)


### Features

* **stream:** emit stitch set events via stitch trail context stream ([1fa47ff](https://github.com/ehmpathy/rhachet/commit/1fa47ff7beab28210ab71c7109c307fc9f206240))

## [1.4.0](https://github.com/ehmpathy/rhachet/compare/v1.3.4...v1.4.0) (2025-07-29)


### Features

* **cli:** genRoleSkill, improved logs, and support optional vars ([f15750e](https://github.com/ehmpathy/rhachet/commit/f15750effdd4a630e1eeea6c4f8e4e9a3a950d5f))


### Bug Fixes

* **cli:** repair optional args for role.skills ([d1cf75d](https://github.com/ehmpathy/rhachet/commit/d1cf75d22dec0ec11803bc91045671d0ee27ea0e))
* **deps:** bump to latest artifact-git version ([765a184](https://github.com/ehmpathy/rhachet/commit/765a18484fddced704ea019a29d95b79f628f7be))

## [1.3.4](https://github.com/ehmpathy/rhachet/compare/v1.3.3...v1.3.4) (2025-07-16)


### Bug Fixes

* **cli:** observability ([b5a5919](https://github.com/ehmpathy/rhachet/commit/b5a59190d6634f89acfca916d4750b4044e48edc))

## [1.3.3](https://github.com/ehmpathy/rhachet/compare/v1.3.2...v1.3.3) (2025-07-16)


### Bug Fixes

* **cli:** update package name for bin ([c68dcae](https://github.com/ehmpathy/rhachet/commit/c68dcaeca5ac342ca6c58607b2b31ef01b829f36))

## [1.3.2](https://github.com/ehmpathy/rhachet/compare/v1.3.1...v1.3.2) (2025-07-14)


### Bug Fixes

* **test:** elim test flake via dep upgrade ([700a3e4](https://github.com/ehmpathy/rhachet/commit/700a3e4b0ff31fb592685ed83c04c6c6fe165604))

## [1.3.1](https://github.com/ehmpathy/rhachet/compare/v1.3.0...v1.3.1) (2025-07-14)


### Bug Fixes

* **pkg:** export template, thread, role procedures ([59a2b4f](https://github.com/ehmpathy/rhachet/commit/59a2b4fa8bf1f95b311016ecb682d708c8bb05c0))

## [1.3.0](https://github.com/ehmpathy/rhachet/compare/v1.2.0...v1.3.0) (2025-07-14)


### Features

* **cli:** liftup rhachet cli ([531d566](https://github.com/ehmpathy/rhachet/commit/531d566cf8b7d7a500436ff0a9c9bc92ec68cba8))

## [1.2.0](https://github.com/ehmpathy/rhachet/compare/v1.1.0...v1.2.0) (2025-07-14)


### Features

* **dobj:** liftup role and template dobjs ([2e850a7](https://github.com/ehmpathy/rhachet/commit/2e850a744ea1d92eefe773472222c3c054583509))


### Bug Fixes

* **deps:** bump to npm audit fix ([87f3b75](https://github.com/ehmpathy/rhachet/commit/87f3b759be39959d8672dbc4bde7da5c0c2a2e6e))
* **deps:** update deps to drop audit concerns ([1fd8781](https://github.com/ehmpathy/rhachet/commit/1fd87811e4771eec9a7290e2a97c8af867336b43))

## [1.1.0](https://github.com/ehmpathy/rhachet/compare/v1.0.0...v1.1.0) (2025-07-05)


### Features

* **choice:** enweaveOneChoice and stitchChoice ([8ee75f1](https://github.com/ehmpathy/rhachet/commit/8ee75f1cd8b131d9128e56f922780ea72285d585))
* **compose:** with asStitcher ([74f965c](https://github.com/ehmpathy/rhachet/commit/74f965c34993db47d75e273318be4b4f7f3760b3))
* **cycle:** enweaveOneCycle and StitchCycle; plus, realworld stitcher testcase ([d286c3c](https://github.com/ehmpathy/rhachet/commit/d286c3c5f9e0d42aa3a3964e587fc57065b51ae0))
* **fanout:** enweave one fanout ([86fccf8](https://github.com/ehmpathy/rhachet/commit/86fccf8e01f2c09dd8481ce0c8c572ed3acab513))
* **fanout:** realworld example with imagine ([5ab6357](https://github.com/ehmpathy/rhachet/commit/5ab635793229fd55dd281593a91b6545450100bf))
* **pkg:** prepare for initial release ([8259885](https://github.com/ehmpathy/rhachet/commit/82598855c9af369ef4c46f91fda4e37615787148))
* **stitcher:** generalize stitcher vs stitchstep; propose stitch fanout ([a7d37ea](https://github.com/ehmpathy/rhachet/commit/a7d37ea7458281ca425bd733792b33e71c110682))
* **trail:** withStitchTrail and enweaveOneStitcher ([3114e72](https://github.com/ehmpathy/rhachet/commit/3114e728872867ba32adb953de5497a1de63002a))

## 1.0.0 (2025-07-02)


### Features

* **enweave:** enable enweave one route ([e0d556c](https://github.com/ehmpathy/rhachet/commit/e0d556c8a67ec315b0239d7907f8144b8bf441a9))
* **init:** initialize based on prior notes ([55b5a9d](https://github.com/ehmpathy/rhachet/commit/55b5a9d77522968397217b78aad86ad36832a605))
* **threads:** support threads index with role uniquekey ([0bbe1b7](https://github.com/ehmpathy/rhachet/commit/0bbe1b7a7661779a273e26dd3307173777adebc9))
* **weave:** thorougly typesafe StitchRoute declarations w/ enweavement ([8237f60](https://github.com/ehmpathy/rhachet/commit/8237f60499f4a2e0ee6bc356b3fd2a5fe9112c9e))
