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

export default function SignUpForm({
	onSwitchToSignIn,
}: {
	onSwitchToSignIn: () => void;
}) {
	const [isSubmitting, setIsSubmitting] = useState(false);

	return (
		<Card className="mx-auto mt-10 w-full max-w-md">
			<CardHeader>
				<CardTitle>
					<h1>Create your account</h1>
				</CardTitle>
				<CardDescription>
					Your Brand Brief is ready and will be saved after sign up.
				</CardDescription>
			</CardHeader>
			<form
				onSubmit={async (event) => {
					event.preventDefault();
					const formData = new FormData(event.currentTarget);
					setIsSubmitting(true);
					try {
						await authClient.signUp.email(
							{
								name: String(formData.get("name")),
								email: String(formData.get("email")),
								password: String(formData.get("password")),
							},
							{
								onSuccess: () => {
									toast.success("Sign up successful");
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
							<FieldLabel htmlFor="sign-up-name">Name</FieldLabel>
							<Input
								id="sign-up-name"
								name="name"
								autoComplete="name"
								minLength={2}
								required
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="sign-up-email">Email</FieldLabel>
							<Input
								id="sign-up-email"
								name="email"
								type="email"
								autoComplete="email"
								required
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="sign-up-password">Password</FieldLabel>
							<Input
								id="sign-up-password"
								name="password"
								type="password"
								autoComplete="new-password"
								minLength={8}
								required
							/>
						</Field>
					</FieldGroup>
				</CardContent>
				<CardFooter className="mt-4 flex flex-col gap-2">
					<Button type="submit" className="w-full" disabled={isSubmitting}>
						{isSubmitting ? <Spinner data-icon="inline-start" /> : null}
						Sign Up
					</Button>
					<Button type="button" variant="link" onClick={onSwitchToSignIn}>
						Already have an account? Sign in
					</Button>
				</CardFooter>
			</form>
		</Card>
	);
}
