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

import BrandCanvas from "@/components/brand-canvas";
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
		<BrandCanvas>
			<div className="m-auto flex w-full max-w-4xl flex-col gap-4">
				<div className="flex items-center justify-between gap-4">
					<Button
						variant="outline"
						nativeButton={false}
						render={<Link to="/dashboard" />}
					>
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
		</BrandCanvas>
	);
}
