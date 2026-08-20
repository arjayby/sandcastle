import { Skeleton } from "@sandcastle/ui/components/skeleton";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { useState } from "react";

import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";

export const Route = createFileRoute("/_auth")({
	component: AuthLayout,
});

function AuthLayout() {
	const [showSignIn, setShowSignIn] = useState(false);

	return (
		<>
			<Authenticated>
				<Outlet />
			</Authenticated>
			<Unauthenticated>
				{showSignIn ? (
					<SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
				) : (
					<SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
				)}
			</Unauthenticated>
			<AuthLoading>
				<main className="p-6 md:p-12">
					<Skeleton className="mx-auto h-64 w-full max-w-md" />
				</main>
			</AuthLoading>
		</>
	);
}
