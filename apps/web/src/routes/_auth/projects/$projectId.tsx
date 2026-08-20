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
import { useQuery } from "convex/react";

import BrandCanvas from "@/components/brand-canvas";
import BrandSystemCanvas from "@/components/brand-system-canvas";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_auth/projects/$projectId")({
  component: BrandProjectPage,
});

function BrandProjectPage() {
  const { projectId } = Route.useParams();
  const project = useQuery(api.brandProjects.get, {
    projectId: projectId as Id<"brandProjects">,
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
      generation={{
        generationStage: project.generationStage,
        generationError: project.generationError,
        directionJson: project.directionJson,
        logoJson: project.logoJson,
        colorJson: project.colorJson,
        typographyJson: project.typographyJson,
        voiceJson: project.voiceJson,
      }}
      onSignOut={() => authClient.signOut()}
    />
  );
}
