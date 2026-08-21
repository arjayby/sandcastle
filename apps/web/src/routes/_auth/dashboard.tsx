import { api } from "@sandcastle/backend/convex/_generated/api";
import { Button, buttonVariants } from "@sandcastle/ui/components/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@sandcastle/ui/components/empty";
import { Skeleton } from "@sandcastle/ui/components/skeleton";
import { createFileRoute, Link } from "@tanstack/react-router";
import { usePaginatedQuery } from "convex/react";

import BrandProjectCard from "@/components/brand-project-card";

export const Route = createFileRoute("/_auth/dashboard")({
  component: DashboardContent,
  errorComponent: DashboardError,
});

function DashboardContent() {
  const {
    results: projects,
    status,
    loadMore,
  } = usePaginatedQuery(api.brandProjects.list, {}, { initialNumItems: 24 });
  const isLoadingProjects = status === "LoadingFirstPage";

  return (
    <main className="overflow-auto p-6 md:p-12">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-medium text-2xl">Brand Projects</h1>
            <p className="text-muted-foreground">
              Reopen a Brand Project or begin another brief.
            </p>
          </div>
          <Link to="/new" className={buttonVariants()}>
            Create Brand Project
          </Link>
        </div>

        {isLoadingProjects ? (
          <div className="grid gap-4 md:grid-cols-2" role="status">
            <span className="sr-only">Loading Brand Projects</span>
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        ) : projects.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No Brand Projects yet</EmptyTitle>
              <EmptyDescription>
                Start with a short Brand Brief.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>Use Create Brand Project to begin.</EmptyContent>
          </Empty>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((project) => (
              <BrandProjectCard key={project._id} project={project} />
            ))}
          </div>
        )}

        {status === "CanLoadMore" || status === "LoadingMore" ? (
          <Button
            className="self-center"
            variant="outline"
            disabled={status === "LoadingMore"}
            onClick={() => loadMore(24)}
          >
            {status === "LoadingMore" ? "Loading more..." : "Load more"}
          </Button>
        ) : null}
      </div>
    </main>
  );
}

function DashboardError() {
  return (
    <main className="p-6 md:p-12">
      <Empty className="mx-auto max-w-xl">
        <EmptyHeader>
          <EmptyTitle>Brand Projects could not be loaded</EmptyTitle>
          <EmptyDescription>
            Check your connection, then try loading your Brand Projects again.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={() => window.location.reload()}>Try again</Button>
        </EmptyContent>
      </Empty>
    </main>
  );
}
