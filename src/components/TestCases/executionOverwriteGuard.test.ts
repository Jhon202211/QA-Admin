import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isPoorerExecution,
  pickRichestExecution,
  scoreExecutionRichness,
} from './executionOverwriteGuard.ts';

describe('scoreExecutionRichness', () => {
  it('counts evaluated steps, results, notes and evidences', () => {
    const filled = {
      steps: [
        {
          status: 'failed',
          actualResult: 'Fallo de importación',
          evidenceGroups: [{ evidences: [{ path: 'a.png' }, { path: 'b.png' }] }],
        },
        { status: 'not_executed', actualResult: '' },
      ],
      notes: 'Notas generales',
    };

    const empty = {
      steps: [
        { status: 'not_executed', actualResult: '', evidences: [] },
        { status: 'not_executed', actualResult: '', evidences: [] },
      ],
      notes: '',
    };

    assert.ok(scoreExecutionRichness(filled) > scoreExecutionRichness(empty));
    assert.equal(scoreExecutionRichness(empty), 0);
  });
});

describe('isPoorerExecution', () => {
  it('detects a poorer incoming snapshot', () => {
    const persisted = {
      steps: [{ status: 'passed', actualResult: 'ok', evidences: [{ path: 'e.png' }] }],
      notes: 'lleno',
    };
    const incoming = {
      steps: [{ status: 'not_executed', actualResult: '', evidences: [] }],
      notes: '',
    };

    assert.equal(isPoorerExecution(incoming, persisted), true);
    assert.equal(isPoorerExecution(persisted, incoming), false);
  });

  it('allows a tie so a same-richness edit can persist', () => {
    const snapshot = {
      steps: [{ status: 'failed', actualResult: 'mismo', evidences: [] }],
      notes: 'nota',
    };

    assert.equal(isPoorerExecution(snapshot, snapshot), false);
  });

  it('treats empty evidence arrays as poorer than filled ones', () => {
    const withEvidence = {
      steps: [{ status: 'failed', actualResult: 'x', evidences: [{ path: 'a.png' }] }],
    };
    const emptyEvidence = {
      steps: [{ status: 'failed', actualResult: 'x', evidences: [] }],
    };

    assert.equal(isPoorerExecution(emptyEvidence, withEvidence), true);
  });
});

describe('pickRichestExecution', () => {
  it('picks the richest candidate and keeps the first on a tie', () => {
    const persisted = { notes: 'abc', steps: [{ status: 'passed', actualResult: 'ok' }] };
    const localPoor = { notes: '', steps: [{ status: 'not_executed', actualResult: '' }] };
    const remoteSame = { notes: 'abc', steps: [{ status: 'passed', actualResult: 'ok' }] };

    assert.deepEqual(pickRichestExecution([persisted, localPoor, remoteSame]), persisted);
    assert.deepEqual(pickRichestExecution([localPoor, persisted]), persisted);
  });
});
