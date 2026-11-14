import { getError, given, then, when } from 'test-fns';

import { BrainCliEnrollmentSpec } from '@src/domain.objects/BrainCliEnrollmentSpec';
import type { RoleLinkRef } from '@src/domain.objects/RoleLinkRef';
import type { ActorExpanded } from '@src/domain.operations/actor/manifest/getActorExpanded';

import { asActorFormEnrollment } from './asActorFormEnrollment';
import { parseBrainCliEnrollmentSpec } from './parseBrainCliEnrollmentSpec';

const EXPANDED_SCHOLAR: ActorExpanded = {
  slug: 'scholar',
  brain: 'anthropic/claude/code',
  roles: ['bhrain/librarian', 'ehmpathy/architect'],
  rolesVia: {},
  warnings: [],
};

const REFS_LINKED: RoleLinkRef[] = [
  { repo: 'bhrain', role: 'librarian' },
  { repo: 'ehmpathy', role: 'architect' },
  { repo: 'ehmpathy', role: 'mechanic' },
];

const SPEC_NONE = new BrainCliEnrollmentSpec({
  mode: 'incremental',
  deltas: [],
});

describe('asActorFormEnrollment', () => {
  given('[case1] `@scholar` with no override', () => {
    when('[t0] the enrollment is derived', () => {
      const result = asActorFormEnrollment({
        expanded: EXPANDED_SCHOLAR,
        brainFlag: null,
        spec: SPEC_NONE,
        refsLinked: REFS_LINKED,
      });

      then('it lands in the slug actor `slug=scholar`', () => {
        expect(result.exid).toEqual('slug=scholar');
      });
      then("it boots the actor's own brain and roles", () => {
        expect(result.brain).toEqual('anthropic/claude/code');
        expect(result.roles).toEqual(['librarian', 'architect']);
        expect(result.rolesDelta).toBeNull();
      });
    });
  });

  given('[case2] `@scholar +mechanic`', () => {
    when('[t0] the enrollment is derived', () => {
      const result = asActorFormEnrollment({
        expanded: EXPANDED_SCHOLAR,
        brainFlag: null,
        spec: parseBrainCliEnrollmentSpec({ tokens: ['+mechanic'] }),
        refsLinked: REFS_LINKED,
      });

      then('it lands in a derived actor over `@scholar`', () => {
        expect(result.exid).toMatch(/^slug=scholar\._\.delta=[0-9a-f]{8}$/);
      });
      then('it adds the role on top of the actor roles', () => {
        expect(result.roles).toEqual(['librarian', 'architect', 'mechanic']);
        expect(result.rolesDelta).toEqual(['+mechanic']);
      });
    });
  });

  given('[case2b] `@scholar -architect`, a role subtraction', () => {
    when('[t0] the enrollment is derived', () => {
      const result = asActorFormEnrollment({
        expanded: EXPANDED_SCHOLAR,
        brainFlag: null,
        spec: parseBrainCliEnrollmentSpec({ tokens: ['-architect'] }),
        refsLinked: REFS_LINKED,
      });

      then('it lands in a derived actor over `@scholar`', () => {
        expect(result.exid).toMatch(/^slug=scholar\._\.delta=[0-9a-f]{8}$/);
      });
      then('it removes the role from the actor roles', () => {
        expect(result.roles).toEqual(['librarian']);
        expect(result.rolesDelta).toEqual(['-architect']);
      });
      then('its delta hash differs from an addition over the same base', () => {
        const added = asActorFormEnrollment({
          expanded: EXPANDED_SCHOLAR,
          brainFlag: null,
          spec: parseBrainCliEnrollmentSpec({ tokens: ['+mechanic'] }),
          refsLinked: REFS_LINKED,
        });
        expect(result.exid).not.toEqual(added.exid);
      });
    });
  });

  given('[case3] `@scholar --brain <brain>`, a brain flag', () => {
    when('[t0] the flag names another slug for the same cli (`claude`)', () => {
      const result = asActorFormEnrollment({
        expanded: EXPANDED_SCHOLAR,
        brainFlag: 'claude',
        spec: SPEC_NONE,
        refsLinked: REFS_LINKED,
      });

      then('it is no override — the slug actor, never a delta twin', () => {
        expect(result.exid).toEqual('slug=scholar');
        expect(result.brain).toEqual('claude');
      });
    });

    when('[tx] the flag names an unsupported brain', () => {
      then('it is refused before any exid is minted', async () => {
        const error = await getError(async () =>
          asActorFormEnrollment({
            expanded: EXPANDED_SCHOLAR,
            brainFlag: 'codex',
            spec: SPEC_NONE,
            refsLinked: REFS_LINKED,
          }),
        );
        expect(error).toBeInstanceOf(Error);
      });
    });

    when('[t1] the override names the actor own brain', () => {
      then('it is no override — the slug actor', () => {
        const result = asActorFormEnrollment({
          expanded: EXPANDED_SCHOLAR,
          brainFlag: 'anthropic/claude/code',
          spec: SPEC_NONE,
          refsLinked: REFS_LINKED,
        });
        expect(result.exid).toEqual('slug=scholar');
      });
    });
  });

  given('[case4] `@scholar` with a plain role list', () => {
    when('[t0] the enrollment is derived', () => {
      then('it is refused, and names the inline form (S6)', async () => {
        const error = await getError(async () =>
          asActorFormEnrollment({
            expanded: EXPANDED_SCHOLAR,
            brainFlag: null,
            spec: parseBrainCliEnrollmentSpec({ tokens: ['mechanic'] }),
            refsLinked: REFS_LINKED,
          }),
        );
        expect(error.message).toContain(
          'a plain role list beside @scholar would replace the actor wholesale',
        );
        expect(error.message).toContain('rhx enroll <brain> --roles <roles>');
      });
    });
  });

  given('[case5] `@scholar` whose declared role is not linked', () => {
    when('[t0] the enrollment is derived', () => {
      then('it is refused, and names `rhx init`', async () => {
        const error = await getError(async () =>
          asActorFormEnrollment({
            expanded: EXPANDED_SCHOLAR,
            brainFlag: null,
            spec: SPEC_NONE,
            refsLinked: REFS_LINKED.slice(1),
          }),
        );
        expect(error.message).toContain(
          "@scholar declares role 'bhrain/librarian', which is not linked",
        );
        expect(error.message).toContain('rhx init');
      });
    });
  });
});
