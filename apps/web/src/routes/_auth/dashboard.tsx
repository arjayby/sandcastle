import { api } from "@sandcastle/backend/convex/_generated/api";
import type { Doc } from "@sandcastle/backend/convex/_generated/dataModel";
import { Button } from "@sandcastle/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@sandcastle/ui/components/card";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@sandcastle/ui/components/empty";
import { Skeleton } from "@sandcastle/ui/components/skeleton";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";

import UserMenu from "@/components/user-menu";

export const Route = createFileRoute("/_auth/dashboard")({
	component: DashboardContent,
});

function DashboardContent() {
	const projects = useQuery(api.brandProjects.list);

	return (
		<main className="p-6 md:p-12">
			<div className="mx-auto flex max-w-5xl flex-col gap-6">
				<div className="flex items-center justify-between gap-4">
					<div>
						<h1 className="font-medium text-2xl">Brand Projects</h1>
						<p className="text-muted-foreground">
							Reopen a Brand Project or begin another brief.
						</p>
					</div>
					<UserMenu />
				</div>

				{projects === undefined ? (
					<div className="grid gap-4 md:grid-cols-2">
						<Skeleton className="h-36" />
						<Skeleton className="h-36" />
					</div>
				) : projects.length === 0 ? (
					<Empty>
						<EmptyHeader>
							<EmptyTitle>No Brand Projects yet</EmptyTitle>
							<EmptyDescription>
								Start with a short Brand Brief.
							</EmptyDescription>
						</EmptyHeader>
						<EmptyContent>
							<Button nativeButton={false} render={<Link to="/" />}>
								Create a Brand Project
							</Button>
						</EmptyContent>
					</Empty>
				) : (
					<div className="grid gap-4 md:grid-cols-2">
						{projects.map((project: Doc<"brandProjects">) => (
							<Card key={project._id}>
								<CardHeader>
									<CardTitle>
										<Link
											to="/projects/$projectId"
											params={{ projectId: project._id }}
											className="underline-offset-4 hover:underline"
										>
											{project.companyName}
										</Link>
									</CardTitle>
									<CardDescription>
										Updated {new Date(project.updatedAt).toLocaleDateString()}
									</CardDescription>
								</CardHeader>
								<CardContent>
									<p>{project.description}</p>
								</CardContent>
							</Card>
						))}
					</div>
				)}
			</div>
		</main>
	);
}
