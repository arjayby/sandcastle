import { api } from "@sandcastle/backend/convex/_generated/api";
import type { Id } from "@sandcastle/backend/convex/_generated/dataModel";
import sandcastleSymbolUrl from "@sandcastle/brand/assets/sandcastle-symbol.svg";
import { Separator } from "@sandcastle/ui/components/separator";
import { Link, useRouterState } from "@tanstack/react-router";
import { Authenticated, useQuery } from "convex/react";
import { FolderKanbanIcon } from "lucide-react";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

function CurrentBrandProject() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const routeProjectId = pathname.match(/^\/projects\/([^/]+)$/)?.[1];
  const projectId = (routeProjectId === "new" ? undefined : routeProjectId) as
    | Id<"brandProjects">
    | undefined;
  const project = useQuery(
    api.brandProjects.get,
    projectId ? { projectId } : "skip",
  );

  if (!project) {
    return null;
  }

  return (
    <div className="flex min-w-0 items-center gap-3 border-l pl-3 md:pl-4">
      <span className="hidden text-muted-foreground text-xs lg:inline">
        Brand Project
      </span>
      <span className="max-w-14 truncate font-medium text-xs sm:max-w-40 sm:text-sm lg:max-w-52">
        {project.name ?? project.companyName}
      </span>
    </div>
  );
}

export default function Header() {
  return (
    <header className="sc-app-header">
      <div className="flex min-h-14 flex-row items-center justify-between gap-3 px-3 md:px-5">
        <nav className="flex min-w-0 items-center gap-3 md:gap-5">
          <Link
            aria-label="Sandcastle home"
            className="sc-home-link flex size-11 shrink-0 items-center justify-center"
            to="/new"
          >
            <img alt="" className="size-8" src={sandcastleSymbolUrl} />
          </Link>
          <Authenticated>
            <Link
              aria-label="Brand Projects"
              className="flex min-h-11 min-w-11 shrink-0 items-center justify-center text-sm"
              to="/dashboard"
            >
              <FolderKanbanIcon className="size-5 sm:hidden" />
              <span className="hidden sm:inline">Brand Projects</span>
            </Link>
            <CurrentBrandProject />
          </Authenticated>
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <Authenticated>
            <UserMenu />
          </Authenticated>
          <ModeToggle />
        </div>
      </div>
      <Separator />
    </header>
  );
}
