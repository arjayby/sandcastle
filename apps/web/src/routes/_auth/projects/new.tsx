import { api } from "@sandcastle/backend/convex/_generated/api";
import { Button } from "@sandcastle/ui/components/button";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@sandcastle/ui/components/empty";
import { Spinner } from "@sandcastle/ui/components/spinner";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "convex/react";
import { useEffect, useState } from "react";

import {
	clearBrandBriefDraft,
	loadBrandBriefDraft,
} from "@/lib/brand-brief-draft";

export const Route = createFileRoute("/_auth/projects/new")({
	component: CreateBrandProject,
});

function CreateBrandProject() {
	const navigate = useNavigate();
	const createProject = useMutation(api.brandProjects.create);
	const [draft] = useState(loadBrandBriefDraft);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!draft) {
			return;
		}

		let isCurrent = true;
		createProject({
			draftId: draft.id,
			companyName: draft.companyName,
			description: draft.description,
		})
			.then((projectId) => {
				if (!isCurrent) {
					return;
				}
				clearBrandBriefDraft();
				navigate({ to: "/projects/$projectId", params: { projectId } });
			})
			.catch(() => {
				if (isCurrent) {
					setError(
						"Your Brand Project could not be created. Please try again.",
					);
				}
			});

		return () => {
			isCurrent = false;
		};
	}, [createProject, draft, navigate]);

	if (!draft) {
		return (
			<Empty>
				<EmptyHeader>
					<EmptyTitle>No Brand Brief found</EmptyTitle>
					<EmptyDescription>
						Complete a Brand Brief before creating a Brand Project.
					</EmptyDescription>
				</EmptyHeader>
				<EmptyContent>
					<Button onClick={() => navigate({ to: "/" })}>
						Start a Brand Brief
					</Button>
				</EmptyContent>
			</Empty>
		);
	}

	return (
		<main className="flex items-center justify-center p-6">
			<div className="flex items-center gap-2" role="status">
				{error ? null : <Spinner />}
				<p>{error ?? "Creating your Brand Project..."}</p>
			</div>
		</main>
	);
}
