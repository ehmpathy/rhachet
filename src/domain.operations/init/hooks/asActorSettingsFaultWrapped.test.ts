import { ConstraintError, MalfunctionError } from 'helpful-errors';
import { given, then, when } from 'test-fns';

import { genSampleErrnoError } from '@src/.test/assets/genSampleErrnoError';

import { asActorSettingsFaultWrapped } from './asActorSettingsFaultWrapped';

const ACTOR = {
  actorExid: 'hash=7dcf1989',
  roles: ['driver', 'mechanic'],
  brainDirRel: '.agent/.actors/actor.via.hash=7dcf1989/brain/.claude',
};

describe('asActorSettingsFaultWrapped', () => {
  ['EACCES', 'EPERM', 'EROFS'].map((code) =>
    given(`[case1] an fs fault of denial, ${code}`, () => {
      when('[t0] it is wrapped', () => {
        const raw = genSampleErrnoError({ code });
        const wrapped = asActorSettingsFaultWrapped({ error: raw, ...ACTOR });
        then('it is a ConstraintError that names the errno', () => {
          expect(wrapped).toBeInstanceOf(ConstraintError);
          // a HelpfulError's message appends its metadata, so the header is a prefix
          expect(wrapped.message).toContain(
            `actor settings could not be written (${code})`,
          );
        });
        then('it carries the actor, roles, path, errno, hint and cause', () => {
          expect((wrapped as ConstraintError).metadata).toMatchObject({
            actorExid: ACTOR.actorExid,
            roles: ACTOR.roles,
            path: ACTOR.brainDirRel,
            errno: code,
            hint: 'restore write access to that dir, then rerun `rhx init --hooks`',
            cause: raw,
          });
        });
      });
    }),
  );

  given('[case2] an fs fault of another errno', () => {
    when('[t0] it is wrapped', () => {
      then('it keeps its own class, never relabelled', () => {
        const raw = genSampleErrnoError({ code: 'EIO' });
        expect(asActorSettingsFaultWrapped({ error: raw, ...ACTOR })).toBe(raw);
      });
    });
  });

  given('[case3] a classed fault', () => {
    when('[t0] it is wrapped', () => {
      then('it keeps its own class', () => {
        const raw = new MalfunctionError('derivation rejected');
        expect(asActorSettingsFaultWrapped({ error: raw, ...ACTOR })).toBe(raw);
      });
    });
  });

  given('[case4] a rejection that is no Error', () => {
    when('[t0] it is wrapped', () => {
      const wrapped = asActorSettingsFaultWrapped({
        error: 'a bare string',
        ...ACTOR,
      });
      then('it is a MalfunctionError with the reason and a hint', () => {
        expect(wrapped).toBeInstanceOf(MalfunctionError);
        expect((wrapped as MalfunctionError).metadata).toMatchObject({
          actorExid: ACTOR.actorExid,
          reason: 'a bare string',
          hint: 'rerun `rhx init --hooks`; if it fails again, report this output as a rhachet bug',
        });
      });
    });
  });
});
