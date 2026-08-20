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
	await page.getByRole("button", { name: "Need an account? Sign up" }).click();
	await page.getByLabel("Name").fill("Other Owner");
	await page.getByLabel("Email").fill(otherOwnerEmail);
	await page.getByLabel("Password").fill(password);
	await page.getByRole("button", { name: "Sign Up" }).click();

	await expect(
		page.getByRole("heading", { name: "Brand Project not found" }),
	).toBeVisible();
	await expect(page.getByText(description)).not.toBeVisible();
});

test("a Brand Builder can manage multiple Brand Projects", async ({ page }) => {
	const runId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
	const email = `portfolio-${runId}@example.com`;
	const password = "sandcastle-test-password";
	const firstName = `Atlas ${runId}`;
	const firstDescription = "An operations platform for independent studios.";
	const secondName = `Beacon ${runId}`;
	const secondDescription = "A customer research tool for early product teams.";

	await page.goto("/");
	await page.getByLabel("Company name").fill(firstName);
	await page.getByLabel("Description").fill(firstDescription);
	await page.getByRole("button", { name: "Generate" }).click();
	await expect(
		page.getByRole("heading", { name: "Create your account" }),
	).toBeVisible();
	await page.getByLabel("Name").fill("Portfolio Owner");
	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Password").fill(password);
	await page.getByRole("button", { name: "Sign Up" }).click();
	await expect(page).toHaveURL(/\/projects\/(?!new$)[a-z0-9]+$/);

	await page.getByRole("link", { name: "All Brand Projects" }).click();
	await page.getByRole("link", { name: "Create Brand Project" }).click();
	await page.getByLabel("Company name").fill(secondName);
	await page.getByLabel("Description").fill(secondDescription);
	await page.getByRole("button", { name: "Generate" }).click();
	await expect(page).toHaveURL(/\/projects\/(?!new$)[a-z0-9]+$/);

	await page.getByRole("link", { name: "All Brand Projects" }).click();
	await expect(page.getByRole("link", { name: firstName })).toBeVisible();
	await expect(page.getByText(firstDescription)).toBeVisible();
	await expect(page.getByRole("link", { name: secondName })).toBeVisible();
	await expect(page.getByText(secondDescription)).toBeVisible();
	await expect(page.getByText("Brand preview pending")).toHaveCount(2);

	await page.getByRole("link", { name: secondName }).click();
	await expect(page.getByRole("heading", { name: secondName })).toBeVisible();
	await page.getByRole("link", { name: "All Brand Projects" }).click();

	await page
		.getByRole("button", { name: `Brand Project actions for ${firstName}` })
		.click();
	await page.getByRole("menuitem", { name: "Rename" }).click();
	const renamedProject = `${firstName} renamed`;
	await page.getByLabel("Brand Project name").fill(renamedProject);
	await page.getByRole("button", { name: "Save name" }).click();
	await expect(page.getByRole("link", { name: renamedProject })).toBeVisible();
	await page.reload();
	await expect(page.getByRole("link", { name: renamedProject })).toBeVisible();

	await page
		.getByRole("button", {
			name: `Brand Project actions for ${renamedProject}`,
		})
		.click();
	await page.getByRole("menuitem", { name: "Duplicate" }).click();
	const copiedProject = `${renamedProject} copy`;
	await expect(page.getByRole("link", { name: copiedProject })).toBeVisible();
	await expect(page.getByText(firstDescription)).toHaveCount(2);
	await page.getByRole("link", { name: copiedProject }).click();
	await expect(
		page.getByRole("heading", { name: copiedProject }),
	).toBeVisible();
	await expect(page.getByText(firstDescription)).toBeVisible();
	await page.getByRole("link", { name: "All Brand Projects" }).click();

	await page
		.getByRole("button", {
			name: `Brand Project actions for ${copiedProject}`,
		})
		.click();
	await page.getByRole("menuitem", { name: "Rename" }).click();
	await page.getByLabel("Brand Project name").fill("Independent copy");
	await page.getByRole("button", { name: "Save name" }).click();
	await expect(page.getByRole("link", { name: renamedProject })).toBeVisible();
	await expect(
		page.getByRole("link", { name: "Independent copy" }),
	).toBeVisible();

	await page
		.getByRole("button", {
			name: `Brand Project actions for ${secondName}`,
		})
		.click();
	await page.getByRole("menuitem", { name: "Delete" }).click();
	await expect(
		page.getByRole("heading", { name: `Delete ${secondName}?` }),
	).toBeVisible();
	await page.getByRole("button", { name: "Delete Brand Project" }).click();
	await expect(page.getByRole("link", { name: secondName })).toHaveCount(0);
	await expect(page.getByRole("link", { name: renamedProject })).toBeVisible();
	await expect(
		page.getByRole("link", { name: "Independent copy" }),
	).toBeVisible();
});
