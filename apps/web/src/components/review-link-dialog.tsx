import { api } from "@sandcastle/backend/convex/_generated/api";
import type { Id } from "@sandcastle/backend/convex/_generated/dataModel";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@sandcastle/ui/components/alert-dialog";
import { Button } from "@sandcastle/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@sandcastle/ui/components/dialog";
import { Field, FieldGroup, FieldLabel } from "@sandcastle/ui/components/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@sandcastle/ui/components/input-group";
import { Spinner } from "@sandcastle/ui/components/spinner";
import { useMutation } from "convex/react";
import { CopyIcon, LinkIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { copyBrandArtifact } from "@/lib/brand-artifact-actions";

export default function ReviewLinkDialog({
  projectId,
  reviewToken,
}: {
  projectId: Id<"brandProjects">;
  reviewToken?: string;
}) {
  const createReviewLink = useMutation(api.brandProjects.createReviewLink);
  const revokeReviewLink = useMutation(api.brandProjects.revokeReviewLink);
  const [isOpen, setIsOpen] = useState(false);
  const [isRevokeOpen, setIsRevokeOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const reviewUrl = reviewToken
    ? `${window.location.origin}/review/${reviewToken}`
    : null;

  async function handleCreate() {
    setIsPending(true);
    try {
      await createReviewLink({ projectId });
      toast.success("Review Link created");
    } catch {
      toast.error("The Review Link could not be created. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  async function handleCopy() {
    if (!reviewUrl) {
      return;
    }
    try {
      await copyBrandArtifact(reviewUrl);
      toast.success("Review Link copied");
    } catch {
      toast.error("The Review Link could not be copied. Please try again.");
    }
  }

  async function handleRevoke() {
    setIsPending(true);
    try {
      await revokeReviewLink({ projectId });
      setIsRevokeOpen(false);
      setIsOpen(false);
      toast.success("Review Link revoked");
    } catch {
      toast.error("The Review Link could not be revoked. Please try again.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
        <LinkIcon data-icon="inline-start" />
        Share Review Link
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewUrl ? "Review Link" : "Create a Review Link"}
            </DialogTitle>
            <DialogDescription>
              Anyone with this private link can explore and download Brand
              Artifacts without changing the Brand Project.
            </DialogDescription>
          </DialogHeader>

          {reviewUrl ? (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="review-link">Review Link</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="review-link"
                    value={reviewUrl}
                    readOnly
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      aria-label="Copy Review Link"
                      onClick={() => void handleCopy()}
                    >
                      <CopyIcon data-icon="inline-start" />
                      Copy
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
            </FieldGroup>
          ) : null}

          <DialogFooter>
            {reviewUrl ? (
              <Button
                variant="destructive"
                disabled={isPending}
                onClick={() => setIsRevokeOpen(true)}
              >
                Revoke Review Link
              </Button>
            ) : (
              <Button disabled={isPending} onClick={() => void handleCreate()}>
                {isPending ? <Spinner data-icon="inline-start" /> : null}
                Create Review Link
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isRevokeOpen} onOpenChange={setIsRevokeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this Review Link?</AlertDialogTitle>
            <AlertDialogDescription>
              Anyone using this link will immediately lose access to the Brand
              Project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isPending}
              onClick={() => void handleRevoke()}
            >
              {isPending ? <Spinner data-icon="inline-start" /> : null}
              Confirm revocation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
