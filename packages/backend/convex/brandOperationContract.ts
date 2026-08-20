export type BrandProjectOperationKind = "generation" | "revision";

export type BrandProjectOperation = {
  id: string;
  kind: BrandProjectOperationKind;
};

export function claimBrandProjectOperation(
  activeOperation: BrandProjectOperation | null,
  requestedKind: BrandProjectOperationKind,
  operationId: string,
): BrandProjectOperation {
  if (activeOperation) {
    throw new Error(
      `Another generation or revision operation is already active (${activeOperation.kind})`,
    );
  }
  return { id: operationId, kind: requestedKind };
}
