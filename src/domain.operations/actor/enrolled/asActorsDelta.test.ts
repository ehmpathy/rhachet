import { ActorOndisk } from '@src/domain.objects/ActorOndisk';

import { asActorsDeclared } from './asActorsDeclared';
import { asActorsDelta } from './asActorsDelta';
import { asActorsExceptRepoActor } from './asActorsExceptRepoActor';

const genActor = (exid: string) =>
  new ActorOndisk({
    repoPath: '/repo',
    exid,
    brain: 'claude',
    roles: ['mechanic'],
  });

const ACTORS = [
  genActor('repo=ambient'),
  genActor('hash=abc123'),
  genActor('slug=builder'),
  genActor('slug=builder._.delta=f00d'),
];
const EXID_REPO_ACTOR = 'repo=ambient';

const asExids = (actors: ActorOndisk[]) => actors.map((actor) => actor.exid);

describe('asActorsDelta', () => {
  test('keeps the hash actors alone — never the repo actor, never a declared one', () => {
    expect(
      asExids(
        asActorsDelta({ actors: ACTORS, exidRepoActor: EXID_REPO_ACTOR }),
      ),
    ).toEqual(['hash=abc123']);
  });
});

describe('asActorsDeclared', () => {
  test('keeps every slug and derived actor', () => {
    expect(asExids(asActorsDeclared({ actors: ACTORS }))).toEqual([
      'slug=builder',
      'slug=builder._.delta=f00d',
    ]);
  });
});

describe('asActorsExceptRepoActor', () => {
  test('drops the repo actor, keeps the rest', () => {
    expect(
      asExids(
        asActorsExceptRepoActor({
          actors: ACTORS,
          exidRepoActor: EXID_REPO_ACTOR,
        }),
      ),
    ).toEqual(['hash=abc123', 'slug=builder', 'slug=builder._.delta=f00d']);
  });

  test('under a manifest the repo actor is a slug actor, and it too is dropped', () => {
    expect(
      asExids(
        asActorsExceptRepoActor({
          actors: ACTORS,
          exidRepoActor: 'slug=builder',
        }),
      ),
    ).toEqual(['repo=ambient', 'hash=abc123', 'slug=builder._.delta=f00d']);
  });
});
