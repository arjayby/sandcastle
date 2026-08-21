import { api } from "@sandcastle/backend/convex/_generated/api";
import type { Id } from "@sandcastle/backend/convex/_generated/dataModel";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@sandcastle/ui/components/empty";
import { Skeleton } from "@sandcastle/ui/components/skeleton";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";

import BrandCanvas from "@/components/brand-canvas";
import BrandSystemCanvas from "@/components/brand-system-canvas";
import ReviewLinkDialog from "@/components/review-link-dialog";

export const Route = createFileRoute("/_auth/projects/$projectId")({
  component: BrandProjectPage,
});

function BrandProjectPage() {
  const { projectId } = Route.useParams();
  const brandProjectId = projectId as Id<"brandProjects">;
  const retryRegion = useMutation(api.brandProjects.retryRegion);
  const revise = useMutation(api.brandProjects.revise);
  const undo = useMutation(api.brandProjects.undo);
  const redo = useMutation(api.brandProjects.redo);
  const loadBuiltInFallback = useMutation(
    api.brandProjects.loadBuiltInFallback,
  );
  const project = useQuery(api.brandProjects.get, {
    projectId: brandProjectId,
  });

  if (project === undefined) {
    return (
      <BrandCanvas>
        <Skeleton className="mx-auto h-64 w-full max-w-4xl" />
      </BrandCanvas>
    );
  }

  if (project === null) {
    return (
      <BrandCanvas>
        <Empty>
          <EmptyHeader>
            <EmptyTitle>
              <h1>Brand Project not found</h1>
            </EmptyTitle>
            <EmptyDescription>
              This Brand Project does not exist or belongs to another Brand
              Builder.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </BrandCanvas>
    );
  }

  return (
    <BrandSystemCanvas
      projectName={project.name ?? project.companyName}
      description={project.description}
      generation={project}
      onRetryRegion={(region) =>
        retryRegion({ projectId: brandProjectId, region })
      }
      onRevise={(request, region) =>
        revise({
          projectId: brandProjectId,
          request,
          ...(region ? { region } : {}),
        })
      }
      canUndo={project.canUndo}
      canRedo={project.canRedo}
      onUndo={() => undo({ projectId: brandProjectId })}
      onRedo={() => redo({ projectId: brandProjectId })}
      onLoadBuiltInFallback={() =>
        loadBuiltInFallback({ projectId: brandProjectId })
      }
      showProjectNavigation
      toolbarAction={
        <ReviewLinkDialog
          projectId={brandProjectId}
          reviewToken={project.reviewToken}
        />
      }
    />
  );
}
