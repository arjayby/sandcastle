import { Button } from "@sandcastle/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@sandcastle/ui/components/card";
import { Field, FieldGroup, FieldLabel } from "@sandcastle/ui/components/field";
import { Input } from "@sandcastle/ui/components/input";
import { Spinner } from "@sandcastle/ui/components/spinner";
import { useState } from "react";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";

export default function SignInForm({
	onSwitchToSignUp,
}: {
	onSwitchToSignUp: () => void;
}) {
	const [isSubmitting, setIsSubmitting] = useState(false);

	return (
		<Card className="mx-auto mt-10 w-full max-w-md">
			<CardHeader>
				<CardTitle>
					<h1>Welcome back</h1>
				</CardTitle>
				<CardDescription>
					Sign in to continue to your Brand Projects.
				</CardDescription>
			</CardHeader>
			<form
				onSubmit={async (event) => {
					event.preventDefault();
					const formData = new FormData(event.currentTarget);
					setIsSubmitting(true);
					try {
						await authClient.signIn.email(
							{
								email: String(formData.get("email")),
								password: String(formData.get("password")),
							},
							{
								onSuccess: () => {
									toast.success("Sign in successful");
								},
								onError: (error) => {
									toast.error(error.error.message || error.error.statusText);
								},
							},
						);
					} finally {
						setIsSubmitting(false);
					}
				}}
			>
				<CardContent>
					<FieldGroup>
						<Field>
							<FieldLabel htmlFor="sign-in-email">Email</FieldLabel>
							<Input
								id="sign-in-email"
								name="email"
								type="email"
								autoComplete="email"
								required
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="sign-in-password">Password</FieldLabel>
							<Input
								id="sign-in-password"
								name="password"
								type="password"
								autoComplete="current-password"
								minLength={8}
								required
							/>
						</Field>
					</FieldGroup>
				</CardContent>
				<CardFooter className="mt-4 flex flex-col gap-2">
					<Button type="submit" className="w-full" disabled={isSubmitting}>
						{isSubmitting ? <Spinner data-icon="inline-start" /> : null}
						Sign In
					</Button>
					<Button type="button" variant="link" onClick={onSwitchToSignUp}>
						Need an account? Sign up
					</Button>
				</CardFooter>
			</form>
		</Card>
	);
}
