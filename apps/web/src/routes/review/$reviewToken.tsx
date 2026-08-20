import { api } from "@sandcastle/backend/convex/_generated/api";
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

export const Route = createFileRoute("/review/$reviewToken")({
  component: ReviewPage,
});

function ReviewPage() {
  const { reviewToken } = Route.useParams();
  const project = useQuery(api.brandProjects.getForReview, { reviewToken });

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
              <h1>Review Link unavailable</h1>
            </EmptyTitle>
            <EmptyDescription>
              This Review Link is invalid or has been revoked.
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
        builtInFallback: project.builtInFallback,
        directionJson: project.directionJson,
        logoJson: project.logoJson,
        colorJson: project.colorJson,
        typographyJson: project.typographyJson,
        voiceJson: project.voiceJson,
        photographyDirectionJson: project.photographyDirectionJson,
        photographs: project.photographs,
        motionJson: project.motionJson,
        interfaceJson: project.interfaceJson,
        designTokensJson: project.designTokensJson,
      }}
    />
  );
}
