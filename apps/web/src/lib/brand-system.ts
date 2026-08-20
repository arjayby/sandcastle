import { z } from "zod";

const hexColorSchema = z.string().regex(/^#[0-9A-F]{6}$/);
const googleFontStylesheetSchema = z
	.url()
	.refine(
		(url) => new URL(url).hostname === "fonts.googleapis.com",
		"Typography stylesheets must use Google Fonts",
	);

const frameSchema = z.object({
	x: z.number().nonnegative(),
	y: z.number().nonnegative(),
	width: z.number().positive(),
	height: z.number().positive(),
});

const sharedRegionShape = {
	state: z.enum(["unfinished", "generating", "ready", "revising", "failed"]),
	frame: frameSchema,
	summary: z.string().min(1),
	rules: z.array(z.string().min(1)).min(1),
};

const logoRegionSchema = z.object({
	...sharedRegionShape,
	id: z.literal("logo"),
	name: z.literal("Logo"),
	content: z.object({
		wordmark: z.string().min(1),
		monogram: z.string().min(1),
		tagline: z.string().min(1),
		variants: z.array(z.string().min(1)).min(3),
	}),
});

const colorRegionSchema = z.object({
	...sharedRegionShape,
	id: z.literal("color"),
	name: z.literal("Color"),
	content: z.object({
		palette: z
			.array(
				z.object({
					name: z.string().min(1),
					value: hexColorSchema,
					role: z.string().min(1),
				}),
			)
			.min(4),
	}),
});

const typographyRegionSchema = z.object({
	...sharedRegionShape,
	id: z.literal("typography"),
	name: z.literal("Typography"),
	content: z.object({
		display: z.string().min(1),
		body: z.string().min(1),
		fallbacks: z.string().min(1),
		scale: z.array(z.string().min(1)).min(3),
		sampleHeadline: z.string().min(1),
		stylesheetUrl: googleFontStylesheetSchema,
	}),
});

const voiceRegionSchema = z.object({
	...sharedRegionShape,
	id: z.literal("voice-and-tone"),
	name: z.literal("Voice and Tone"),
	content: z.object({
		promise: z.string().min(1),
		principles: z.array(z.string().min(1)).length(3),
		preferredWords: z.array(z.string().min(1)).min(3),
		avoidedWords: z.array(z.string().min(1)).min(3),
		headline: z.string().min(1),
		body: z.string().min(1),
		callToAction: z.string().min(1),
	}),
});

const photographyRegionSchema = z.object({
	...sharedRegionShape,
	id: z.literal("photography"),
	name: z.literal("Photography"),
	content: z.object({
		direction: z.string().min(1),
		photographs: z
			.array(
				z.object({
					role: z.enum(["Hero", "Product", "People", "Texture"]),
					alt: z.string().min(1),
					colors: z.tuple([hexColorSchema, hexColorSchema, hexColorSchema]),
				}),
			)
			.length(4),
	}),
});

const motionRegionSchema = z.object({
	...sharedRegionShape,
	id: z.literal("motion"),
	name: z.literal("Motion"),
	content: z.object({
		principle: z.string().min(1),
		duration: z.string().min(1),
		easing: z.string().min(1),
	}),
});

const interfaceRegionSchema = z.object({
	...sharedRegionShape,
	id: z.literal("interface-foundation"),
	name: z.literal("Interface Foundation"),
	content: z.object({
		principle: z.string().min(1),
		components: z.array(z.string().min(1)).min(5),
		example: z.object({
			brandName: z.string().min(1),
			headline: z.string().min(1),
			callToAction: z.string().min(1),
			cardTitle: z.string().min(1),
			cardDescription: z.string().min(1),
			inputPlaceholder: z.string().min(1),
			actionLabel: z.string().min(1),
		}),
	}),
});

const designTokensRegionSchema = z.object({
	...sharedRegionShape,
	id: z.literal("design-tokens"),
	name: z.literal("Design Tokens"),
	content: z.object({
		css: z.string().min(1),
		json: z.record(z.string(), z.string()),
	}),
});

export const brandSystemSchema = z.object({
	contractVersion: z.literal(1),
	name: z.string().min(1),
	direction: z.object({
		name: z.string().min(1),
		concept: z.string().min(1),
		attributes: z.array(z.string().min(1)).length(3),
	}),
	theme: z.object({
		ink: hexColorSchema,
		saffron: hexColorSchema,
		aloe: hexColorSchema,
		clay: hexColorSchema,
		paper: hexColorSchema,
		surface: hexColorSchema,
		muted: hexColorSchema,
	}),
	board: z.object({
		width: z.number().positive(),
		height: z.number().positive(),
		background: z.literal("warm-paper"),
	}),
	regions: z.tuple([
		logoRegionSchema,
		colorRegionSchema,
		typographyRegionSchema,
		voiceRegionSchema,
		photographyRegionSchema,
		motionRegionSchema,
		interfaceRegionSchema,
		designTokensRegionSchema,
	]),
});

export type BrandSystem = z.infer<typeof brandSystemSchema>;
export type BrandRegion = BrandSystem["regions"][number];

const fallbackTheme = {
	ink: "#17231F",
	saffron: "#EDB33F",
	aloe: "#B7CEB7",
	clay: "#D57658",
	paper: "#F4EFE5",
	surface: "#FBF8F1",
	muted: "#536059",
} as const;

const fallbackTypography = {
	display: "Newsreader",
	body: "Inter",
	stylesheetUrl:
		"https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,600&display=swap",
} as const;

const fallbackMotion = {
	duration: "320ms",
	easing: "cubic-bezier(0.22, 1, 0.36, 1)",
} as const;

const fallbackCardRadius = "12px";

export function createFallbackBrandSystem(projectName: string): BrandSystem {
	return brandSystemSchema.parse({
		contractVersion: 1,
		name: projectName,
		direction: {
			name: "Quiet momentum",
			concept:
				"A grounded identity that makes complex work feel calm, human, and possible.",
			attributes: ["Warm", "Assured", "Clear"],
		},
		board: {
			width: 1760,
			height: 1430,
			background: "warm-paper",
		},
		theme: fallbackTheme,
		regions: [
			{
				id: "logo",
				name: "Logo",
				state: "ready",
				frame: { x: 60, y: 60, width: 620, height: 420 },
				summary: "A rising mark built from one continuous gesture.",
				rules: [
					"Use the primary lockup whenever horizontal space allows.",
					"Keep one monogram width of clear space around every mark.",
					"Never stretch, outline, or add effects to the mark.",
				],
				content: {
					wordmark: "MORROW",
					monogram: "M",
					tagline: "Make room for meaningful work.",
					variants: ["Primary lockup", "Wordmark", "Monogram"],
				},
			},
			{
				id: "color",
				name: "Color",
				state: "ready",
				frame: { x: 720, y: 60, width: 420, height: 420 },
				summary: "Sunlit warmth balanced by a deep botanical ink.",
				rules: [
					"Saffron leads every primary action.",
					"Ink carries text and anchors large fields.",
					"Use Aloe and Clay as supporting moments, never competing accents.",
				],
				content: {
					palette: [
						{ name: "Ink", value: fallbackTheme.ink, role: "Foundation" },
						{
							name: "Saffron",
							value: fallbackTheme.saffron,
							role: "Primary",
						},
						{ name: "Aloe", value: fallbackTheme.aloe, role: "Support" },
						{ name: "Clay", value: fallbackTheme.clay, role: "Accent" },
						{ name: "Paper", value: fallbackTheme.paper, role: "Surface" },
					],
				},
			},
			{
				id: "typography",
				name: "Typography",
				state: "ready",
				frame: { x: 1180, y: 60, width: 520, height: 420 },
				summary:
					"Expressive editorial headlines with practical, open body copy.",
				rules: [
					"Use Newsreader for moments of invitation and point of view.",
					"Use Inter for navigation, data, and extended reading.",
					"Keep display lines short and let sentence case feel conversational.",
				],
				content: {
					display: fallbackTypography.display,
					body: fallbackTypography.body,
					fallbacks: "Georgia, serif · Arial, sans-serif",
					scale: ["Display 72/68", "Heading 36/40", "Body 18/28"],
					sampleHeadline: "A clearer way forward.",
					stylesheetUrl: fallbackTypography.stylesheetUrl,
				},
			},
			{
				id: "voice-and-tone",
				name: "Voice and Tone",
				state: "ready",
				frame: { x: 60, y: 520, width: 440, height: 480 },
				summary:
					"Steady guidance with enough optimism to create forward motion.",
				rules: [
					"Lead with the useful truth, then offer the next step.",
					"Sound composed, never clinical or overly polished.",
					"Prefer specific, active language over inflated claims.",
				],
				content: {
					promise: "Make ambitious work feel lighter.",
					principles: [
						"Clear, not cold",
						"Optimistic, not loud",
						"Expert, not superior",
					],
					preferredWords: ["Shape", "Together", "Forward", "Useful"],
					avoidedWords: ["Revolutionary", "Effortless", "Disrupt", "Magic"],
					headline: "A clearer way forward.",
					body: "Bring the moving parts together and make space for the work that matters.",
					callToAction: "Find your next step",
				},
			},
			{
				id: "photography",
				name: "Photography",
				state: "ready",
				frame: { x: 540, y: 520, width: 700, height: 480 },
				summary: "Observed moments where human craft meets warm natural light.",
				rules: [
					"Favor quiet, candid moments over staged collaboration.",
					"Let natural shadow and warm highlights carry the composition.",
					"Include tactile materials and signs of work in progress.",
				],
				content: {
					direction: "Documentary warmth, tactile detail, patient composition.",
					photographs: [
						{
							role: "Hero",
							alt: "Sunlight crossing a quiet studio table",
							colors: ["#25352F", "#6F886F", "#E4BD70"],
						},
						{
							role: "Product",
							alt: "A crafted object in use",
							colors: ["#D0B49A", "#F1D89B", "#9C5B43"],
						},
						{
							role: "People",
							alt: "Two collaborators reviewing physical notes",
							colors: ["#402F2A", "#BC8066", "#E9D4AE"],
						},
						{
							role: "Texture",
							alt: "Layered paper and soft botanical shadow",
							colors: ["#E7D9BD", "#A7BDA7", "#31443D"],
						},
					],
				},
			},
			{
				id: "motion",
				name: "Motion",
				state: "ready",
				frame: { x: 1280, y: 520, width: 420, height: 480 },
				summary: "Measured motion that settles gently and confirms progress.",
				rules: [
					"Movement begins decisively and arrives softly.",
					"Use one coordinated motion instead of several competing effects.",
					"Reduced motion replaces travel with a quiet opacity change.",
				],
				content: {
					principle: "Lift, travel, settle",
					duration: fallbackMotion.duration,
					easing: fallbackMotion.easing,
				},
			},
			{
				id: "interface-foundation",
				name: "Interface Foundation",
				state: "ready",
				frame: { x: 60, y: 1040, width: 940, height: 330 },
				summary: "Calm, editorial surfaces with direct product controls.",
				rules: [
					"Reserve Saffron for the clearest next action.",
					"Use generous spacing and thin Ink rules to establish hierarchy.",
					"Corners stay modest so the system feels crafted, not playful.",
				],
				content: {
					principle: "Editorial calm, product clarity",
					components: [
						"Buttons",
						"Inputs",
						"Cards",
						"Navigation",
						"Website example",
					],
					example: {
						brandName: "Morrow",
						headline: "Build what matters.",
						callToAction: "Find your next step",
						cardTitle: "Project rhythm",
						cardDescription: "A calm weekly overview.",
						inputPlaceholder: "Search projects",
						actionLabel: "Create project",
					},
				},
			},
			{
				id: "design-tokens",
				name: "Design Tokens",
				state: "ready",
				frame: { x: 1040, y: 1040, width: 660, height: 330 },
				summary: "Production values that keep every application coherent.",
				rules: [
					"Tokens are the source of truth for every interface value.",
					"Use the spacing scale before introducing a new measurement.",
					"Motion values always inherit the reduced motion policy.",
				],
				content: {
					css: `:root {\n  --color-ink: ${fallbackTheme.ink};\n  --color-saffron: ${fallbackTheme.saffron};\n  --font-display: ${fallbackTypography.display};\n  --radius-card: ${fallbackCardRadius};\n  --motion-standard: ${fallbackMotion.duration};\n}`,
					json: {
						"color.ink": fallbackTheme.ink,
						"color.saffron": fallbackTheme.saffron,
						"font.display": fallbackTypography.display,
						"radius.card": fallbackCardRadius,
						"motion.standard": fallbackMotion.duration,
					},
				},
			},
		],
	});
}
