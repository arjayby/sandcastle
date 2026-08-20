import { api } from "@sandcastle/backend/convex/_generated/api";
import type { Id } from "@sandcastle/backend/convex/_generated/dataModel";
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
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@sandcastle/ui/components/empty";
import { Skeleton } from "@sandcastle/ui/components/skeleton";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";

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
			<main className="p-6 md:p-12">
				<Skeleton className="mx-auto h-64 w-full max-w-4xl" />
			</main>
		);
	}

	if (project === null) {
		return (
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
		);
	}

	return (
		<main className="p-6 md:p-12">
			<div className="mx-auto flex max-w-4xl flex-col gap-4">
				<div className="flex items-center justify-between gap-4">
					<Button variant="outline" render={<Link to="/dashboard" />}>
						All Brand Projects
					</Button>
					<Button variant="ghost" onClick={() => authClient.signOut()}>
						Sign out
					</Button>
				</div>
				<Card>
					<CardHeader>
						<CardTitle>
							<h1>{project.companyName}</h1>
						</CardTitle>
						<CardDescription>Brand Brief</CardDescription>
					</CardHeader>
					<CardContent>
						<p>{project.description}</p>
					</CardContent>
				</Card>
			</div>
		</main>
	);
}
