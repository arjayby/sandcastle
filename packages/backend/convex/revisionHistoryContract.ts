export const revisionHistoryLimit = 20;

export type Revision<State> = {
  sequence: number;
  before: State;
  after: State;
};

export type RevisionHistory<State> = {
  revisions: Revision<State>[];
  cursor: number;
  nextSequence: number;
};

export function createRevisionHistory<State>(): RevisionHistory<State> {
  return { revisions: [], cursor: 0, nextSequence: 1 };
}

export function acceptRevision<State>(
  history: RevisionHistory<State>,
  before: State,
  after: State,
): RevisionHistory<State> {
  const revision = {
    sequence: history.nextSequence,
    before,
    after,
  };
  const validBranch = history.revisions.filter(
    (candidate) => candidate.sequence <= history.cursor,
  );

  return {
    revisions: [...validBranch, revision].slice(-revisionHistoryLimit),
    cursor: revision.sequence,
    nextSequence: revision.sequence + 1,
  };
}

export function undoRevision<State>(history: RevisionHistory<State>): {
  history: RevisionHistory<State>;
  state: State;
} | null {
  let revision: Revision<State> | undefined;
  for (let index = history.revisions.length - 1; index >= 0; index -= 1) {
    const candidate = history.revisions[index];
    if (candidate && candidate.sequence <= history.cursor) {
      revision = candidate;
      break;
    }
  }
  if (!revision) {
    return null;
  }

  return {
    history: { ...history, cursor: revision.sequence - 1 },
    state: revision.before,
  };
}

export function redoRevision<State>(history: RevisionHistory<State>): {
  history: RevisionHistory<State>;
  state: State;
} | null {
  const revision = history.revisions.find(
    (candidate) => candidate.sequence > history.cursor,
  );
  if (!revision) {
    return null;
  }

  return {
    history: { ...history, cursor: revision.sequence },
    state: revision.after,
  };
}
