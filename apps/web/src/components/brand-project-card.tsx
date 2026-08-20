import { api } from "@sandcastle/backend/convex/_generated/api";
import type { Doc } from "@sandcastle/backend/convex/_generated/dataModel";
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
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@sandcastle/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@sandcastle/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@sandcastle/ui/components/dropdown-menu";
import { Field, FieldGroup, FieldLabel } from "@sandcastle/ui/components/field";
import { Input } from "@sandcastle/ui/components/input";
import { Spinner } from "@sandcastle/ui/components/spinner";
import { Link } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { CopyIcon, EllipsisIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const updatedAtFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

export default function BrandProjectCard({
  project,
}: {
  project: Doc<"brandProjects">;
}) {
  const renameProject = useMutation(api.brandProjects.rename);
  const duplicateProject = useMutation(api.brandProjects.duplicate);
  const deleteProject = useMutation(api.brandProjects.remove);
  const projectName = project.name ?? project.companyName;
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function handleRename(formData: FormData) {
    setIsSaving(true);
    try {
      await renameProject({
        projectId: project._id,
        name: String(formData.get("name")),
      });
      setIsRenameOpen(false);
      toast.success("Brand Project renamed");
    } catch {
      toast.error("The Brand Project could not be renamed. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDuplicate() {
    try {
      await duplicateProject({ projectId: project._id });
      toast.success("Brand Project duplicated");
    } catch {
      toast.error(
        "The Brand Project could not be duplicated. Please try again.",
      );
    }
  }

  async function handleDelete() {
    setIsSaving(true);
    try {
      await deleteProject({ projectId: project._id });
      setIsDeleteOpen(false);
      toast.success("Brand Project deleted");
    } catch {
      toast.error("The Brand Project could not be deleted. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <Card>
        <div className="mx-4 flex min-h-28 items-end bg-muted p-4">
          <p className="text-muted-foreground">Brand preview pending</p>
        </div>
        <CardHeader>
          <CardTitle>
            <Link
              to="/projects/$projectId"
              params={{ projectId: project._id }}
              className="underline-offset-4 hover:underline"
            >
              {projectName}
            </Link>
          </CardTitle>
          <CardDescription>
            Updated {updatedAtFormatter.format(project.updatedAt)}
          </CardDescription>
          <CardAction>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Brand Project actions for ${projectName}`}
                  />
                }
              >
                <EllipsisIcon />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => setIsRenameOpen(true)}>
                    <PencilIcon />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDuplicate}>
                    <CopyIcon />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setIsDeleteOpen(true)}
                  >
                    <Trash2Icon />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardAction>
        </CardHeader>
        <CardContent>
          <p className="line-clamp-3">{project.description}</p>
        </CardContent>
      </Card>

      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename {projectName}</DialogTitle>
            <DialogDescription>
              Choose a name that makes this Brand Project easy to identify.
            </DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              handleRename(new FormData(event.currentTarget));
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={`project-name-${project._id}`}>
                  Brand Project name
                </FieldLabel>
                <Input
                  id={`project-name-${project._id}`}
                  name="name"
                  defaultValue={projectName}
                  required
                />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Spinner data-icon="inline-start" /> : null}
                Save name
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {projectName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes only this Brand Project. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isSaving}
              onClick={handleDelete}
            >
              {isSaving ? <Spinner data-icon="inline-start" /> : null}
              Delete Brand Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
