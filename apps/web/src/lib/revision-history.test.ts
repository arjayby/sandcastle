import {
  acceptRevision,
  createRevisionHistory,
  redoRevision,
  undoRevision,
} from "@sandcastle/backend/convex/revisionHistoryContract";
import { describe, expect, test } from "vitest";

type CoordinatedState = {
  color: string;
  designTokens: string;
};

describe("Revision history", () => {
  test("undoes and redoes one coordinated Semantic Revision", () => {
    const before = {
      color: "#EDB33F",
      designTokens: "--color-primary: #EDB33F",
    };
    const after = {
      color: "#3F6FED",
      designTokens: "--color-primary: #3F6FED",
    };
    const accepted = acceptRevision(
      createRevisionHistory<CoordinatedState>(),
      before,
      after,
    );

    expect(accepted.revisions).toHaveLength(1);

    const undone = undoRevision(accepted);
    expect(undone?.state).toEqual(before);

    const redone = undone && redoRevision(undone.history);
    expect(redone?.state).toEqual(after);
  });

  test("retains the latest 20 Revisions and clears an invalid redo branch", () => {
    let history = createRevisionHistory<number>();
    for (let value = 1; value <= 21; value += 1) {
      history = acceptRevision(history, value - 1, value);
    }

    expect(history.revisions).toHaveLength(20);
    expect(history.revisions.map((revision) => revision.after)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 2),
    );

    const undone = undoRevision(history);
    expect(undone?.state).toBe(20);
    if (!undone) {
      throw new Error("Expected the latest Revision to be undoable");
    }

    const branched = acceptRevision(undone.history, 20, 200);
    expect(redoRevision(branched)).toBeNull();
    expect(branched.revisions.at(-1)?.after).toBe(200);
  });
});
