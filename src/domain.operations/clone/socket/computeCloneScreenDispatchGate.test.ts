import type {
  CloneScreenLive,
  CloneScreenUnfed,
} from '../screen/genCloneScreenFeed';
import { computeCloneScreenDispatchGate } from './computeCloneScreenDispatchGate';

/**
 * .what = a live screen from a set of rendered rows, at a fixed geometry
 * .why = the gate reads the pre-check, which reads only `lines`; the geometry fields ride along so
 *   the fixture is a real CloneScreenLive, never a partial cast
 */
const asScreen = (lines: string[]): CloneScreenLive => ({
  live: true,
  lines,
  // every row BRIGHT — the strictest fixture: box content counts as human work, so a gate that
  // refuses must do so on the text itself, never because a dim ghost blanked the band
  linesBright: lines,
  cursorX: 0,
  cursorY: 0,
  cols: 120,
  rows: 40,
});

const RULE = '─'.repeat(120);

// a `❯` box row fenced by two full-width rules, holds only the placeholder — a clean idle box
const IDLE_LINES = [
  '● prior turn output',
  RULE,
  '❯ Try "write a test for <filepath>"',
  RULE,
];

// the box holds a foreign token nobody dispatched — a dirty input region
const DIRTY_LINES = [RULE, '❯ DIRTY-mu03aque', RULE];

// a `❯`-led option menu with a confirm footer — the modal signature
const MODAL_LINES = [
  '❯ 1. Yes',
  '  2. No',
  'Do you want to proceed?',
  RULE,
  '❯',
  RULE,
];

describe('computeCloneScreenDispatchGate', () => {
  describe('a LIVE screen — the dispatch pre-check decides', () => {
    test('a clean idle box proceeds', () => {
      const gate = computeCloneScreenDispatchGate({
        screen: asScreen(IDLE_LINES),
        message: 'a message',
        force: false,
      });
      expect(gate).toEqual({ proceed: true });
    });

    test('a dirty input region withholds with input-region-dirty', () => {
      const gate = computeCloneScreenDispatchGate({
        screen: asScreen(DIRTY_LINES),
        message: 'a message',
        force: false,
      });
      expect(gate).toEqual({ proceed: false, reason: 'input-region-dirty' });
    });

    test('a dirty input region under --force proceeds (force overrides a dirty region)', () => {
      const gate = computeCloneScreenDispatchGate({
        screen: asScreen(DIRTY_LINES),
        message: 'a message',
        force: true,
      });
      expect(gate).toEqual({ proceed: true });
    });

    test('a modal withholds with modal-holds-focus', () => {
      const gate = computeCloneScreenDispatchGate({
        screen: asScreen(MODAL_LINES),
        message: 'a message',
        force: false,
      });
      expect(gate).toEqual({ proceed: false, reason: 'modal-holds-focus' });
    });

    test('a modal under --force still withholds (force overrides a dirty region, never a modal)', () => {
      const gate = computeCloneScreenDispatchGate({
        screen: asScreen(MODAL_LINES),
        message: 'a message',
        force: true,
      });
      expect(gate).toEqual({ proceed: false, reason: 'modal-holds-focus' });
    });
  });

  describe('a FAULTED feed — withheld, never pasted over', () => {
    test('feed-faulted withholds with feed-faulted', () => {
      const screen: CloneScreenUnfed = { live: false, reason: 'feed-faulted' };
      const gate = computeCloneScreenDispatchGate({
        screen,
        message: 'a message',
        force: false,
      });
      expect(gate).toEqual({ proceed: false, reason: 'feed-faulted' });
    });
  });

  // a CONTRACT assertion of a declared degrade, not an xfail. `feed-not-live` names a feed that has
  // not attached yet — the state a brand-new clone is in before its first output arrives. V13 and
  // case=4 both require that clone to RECEIVE its first `say`, so the gate proceeds by design: there
  // is no readable input region to pre-check, and to withhold here would make an enroll's first
  // dispatch fail. whether that trade-off should hold is fulcrum F17 (wisher-scoped, under F07) —
  // a DECISION on record, never an open hole. an xfail label here mis-reported the decision as a
  // defect, which is the read this block corrects.
  describe('a feed-not-live screen proceeds ungated — the declared degrade (V13, case=4; F17)', () => {
    test('a not-yet-attached feed proceeds, so an enroll can receive its first say', () => {
      const screen: CloneScreenUnfed = { live: false, reason: 'feed-not-live' };
      const gate = computeCloneScreenDispatchGate({
        screen,
        message: 'a message',
        force: false,
      });
      expect(gate).toEqual({ proceed: true });
    });

    test('--force is not what unlocks it — the unforced read already proceeds', () => {
      const screen: CloneScreenUnfed = { live: false, reason: 'feed-not-live' };
      const gate = computeCloneScreenDispatchGate({
        screen,
        message: 'a message',
        force: true,
      });
      expect(gate).toEqual({ proceed: true });
    });
  });
});
