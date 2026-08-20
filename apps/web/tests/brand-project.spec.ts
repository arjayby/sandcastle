import { expect, test } from "@playwright/test";

const DESCRIPTION_GUIDANCE =
	"Tell us what your company does, who it serves, and what makes it different. You can also include the feeling you want, preferred colors, visual references, competitors, and anything the brand should avoid.";

test("a Brand Builder can create, authenticate, reopen, and persist an owned Brand Project", async ({
	page,
}) => {
	const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
	const ownerEmail = `owner-${runId}@example.com`;
	const otherOwnerEmail = `other-${runId}@example.com`;
	const password = "sandcastle-test-password";
	const companyName = `Northstar ${runId}`;
	const description = "A planning tool for independent product teams.";

	await page.goto("/");

	await expect(page.getByRole("main", { name: "Brand Canvas" })).toBeVisible();
	await expect(page.getByLabel("Company name")).toBeVisible();
	await expect(page.getByLabel("Description")).toHaveAttribute(
		"placeholder",
		DESCRIPTION_GUIDANCE,
	);

	await page.getByLabel("Company name").fill(companyName);
	await page.getByLabel("Description").fill(description);
	await page.getByRole("button", { name: "Generate" }).click();

	await expect(
		page.getByRole("heading", { name: "Create your account" }),
	).toBeVisible();
	await expect(
		page.getByText(
			"Your Brand Brief is ready and will be saved after sign up.",
		),
	).toBeVisible();
	await page.getByLabel("Name").fill("First Owner");
	await page.getByLabel("Email").fill(ownerEmail);
	await page.getByLabel("Password").fill(password);
	await page.getByRole("button", { name: "Sign Up" }).click();

	await expect(page).toHaveURL(/\/projects\/(?!new$)[a-z0-9]+$/);
	const projectUrl = page.url();
	await expect(page.getByRole("main", { name: "Brand Canvas" })).toBeVisible();
	await expect(page.getByRole("heading", { name: companyName })).toBeVisible();
	await expect(page.getByText(description)).toBeVisible();

	await page.reload();
	await expect(page.getByRole("heading", { name: companyName })).toBeVisible();
	await expect(page.getByText(description)).toBeVisible();

	await page.getByRole("button", { name: "Sign out" }).click();
	await page.goto("/dashboard");
	await expect(
		page.getByRole("heading", { name: "Create your account" }),
	).toBeVisible();
	await expect(
		page.getByText("Create an account to continue to your Brand Projects."),
	).toBeVisible();
	await page
		.getByRole("button", { name: "Already have an account? Sign in" })
		.click();
	await page.getByLabel("Email").fill(ownerEmail);
	await page.getByLabel("Password").fill(password);
	await page.getByRole("button", { name: "Sign In" }).click();

	await expect(page).toHaveURL(/\/dashboard$/);
	await expect(page.getByRole("link", { name: companyName })).toHaveCount(1);
	await page.getByRole("link", { name: companyName }).click();
	await expect(page).toHaveURL(projectUrl);
	await expect(page.getByText(description)).toBeVisible();

	await page.getByRole("button", { name: "Sign out" }).click();
	await page.getByLabel("Name").fill("Other Owner");
	await page.getByLabel("Email").fill(otherOwnerEmail);
	await page.getByLabel("Password").fill(password);
	await page.getByRole("button", { name: "Sign Up" }).click();

	await page.goto(projectUrl);
	await expect(
		page.getByRole("heading", { name: "Brand Project not found" }),
	).toBeVisible();
	await expect(page.getByText(description)).not.toBeVisible();
});
