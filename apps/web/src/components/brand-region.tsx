import { Button } from "@sandcastle/ui/components/button";
import { Spinner } from "@sandcastle/ui/components/spinner";
import { cn } from "@sandcastle/ui/lib/utils";
import { FocusIcon, RotateCcwIcon } from "lucide-react";
import type { CSSProperties, MouseEvent } from "react";

import type { BrandRegion } from "@/lib/brand-system";

const generationStateLabels: Record<BrandRegion["state"], string> = {
  unfinished: "Unfinished",
  generating: "Generating",
  ready: "Ready",
  revising: "Revising",
  failed: "Failed",
};

function RegionLabel({ region }: { region: BrandRegion }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col gap-1">
        <p className="font-semibold text-[11px] text-[var(--brand-muted)] uppercase tracking-[0.18em]">
          Brand Region
        </p>
        <h2 className="font-semibold text-[var(--brand-ink)] text-lg">
          {region.name}
        </h2>
      </div>
      <span className="rounded-full bg-[var(--brand-aloe)]/40 px-2.5 py-1 font-medium text-[10px] text-[var(--brand-ink)] uppercase tracking-wide">
        {generationStateLabels[region.state]}
      </span>
    </div>
  );
}

function LogoRegion({
  region,
}: {
  region: Extract<BrandRegion, { id: "logo" }>;
}) {
  const variants = [
    ["Primary lockup", region.content.primaryLockupSvg],
    ["Wordmark", region.content.wordmarkSvg],
    ["Symbol", region.content.symbolSvg],
  ] as const;

  return (
    <div className="flex h-full flex-col bg-[var(--brand-paper)] p-8">
      <RegionLabel region={region} />
      <div className="my-5 grid flex-1 grid-cols-3 gap-4">
        {variants.map(([label, svg]) => (
          <figure
            className="flex min-w-0 flex-col justify-center gap-3"
            key={label}
          >
            <img
              src={`data:image/svg+xml,${encodeURIComponent(svg)}`}
              alt={`${region.content.wordmark} ${label.toLowerCase()}`}
              className="h-24 w-full object-contain"
            />
            <figcaption className="text-center text-[var(--brand-muted)] text-xs">
              {label}
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="border-[var(--brand-ink)]/15 border-t pt-4 text-center text-[var(--brand-muted)] text-xs tracking-[0.08em]">
        {region.content.tagline}
      </p>
    </div>
  );
}

function ColorRegion({
  region,
}: {
  region: Extract<BrandRegion, { id: "color" }>;
}) {
  return (
    <div className="flex h-full flex-col bg-[var(--brand-surface)] p-7">
      <RegionLabel region={region} />
      <div className="mt-6 flex flex-1 gap-2">
        {region.content.palette.map((color, index) => (
          <div
            key={color.name}
            className="flex min-w-0 flex-1 flex-col justify-end p-2"
            style={{
              backgroundColor: color.value,
              color:
                index === 0 || index === 3 ? "#ffffff" : "var(--brand-ink)",
            }}
          >
            <strong className="text-[10px]">{color.name}</strong>
            <span className="text-[9px] opacity-80">{color.value}</span>
            <span className="text-[9px] opacity-80">{color.contrast}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[var(--brand-muted)] text-xs">{region.summary}</p>
    </div>
  );
}

function TypographyRegion({
  region,
}: {
  region: Extract<BrandRegion, { id: "typography" }>;
}) {
  return (
    <div className="flex h-full flex-col bg-[var(--brand-paper)] p-7">
      <RegionLabel region={region} />
      <div className="mt-6 grid flex-1 grid-cols-[1fr_auto] gap-6">
        <div className="flex flex-col justify-center">
          <p className="brand-display max-w-80 text-7xl text-[var(--brand-ink)] leading-[0.82] tracking-[-0.06em]">
            {region.content.sampleHeadline}
          </p>
        </div>
        <div className="flex flex-col justify-end gap-2 border-[var(--brand-ink)]/15 border-l pl-5 text-[var(--brand-muted)] text-xs">
          <strong className="text-[var(--brand-ink)]">
            {region.content.display}
          </strong>
          <span>Display</span>
          <span>{region.content.displayWeights.join(", ")}</span>
          <strong className="mt-3 text-[var(--brand-ink)]">
            {region.content.body}
          </strong>
          <span>Text</span>
          <span>{region.content.bodyWeights.join(", ")}</span>
        </div>
      </div>
    </div>
  );
}

function PendingRegion({ region }: { region: BrandRegion }) {
  return (
    <div className="flex h-full flex-col bg-[var(--brand-surface)] p-7">
      <RegionLabel region={region} />
      <div className="m-auto flex max-w-64 flex-col items-center gap-3 text-center">
        {region.state === "generating" ? <Spinner className="size-5" /> : null}
        <p className="font-medium text-[var(--brand-ink)] text-sm">
          {region.state === "generating"
            ? `The Brand Agent is creating ${region.name}.`
            : region.state === "failed"
              ? `${region.name} could not be generated.`
              : `${region.name} will follow the regions before it.`}
        </p>
      </div>
    </div>
  );
}

function VoiceRegion({
  region,
}: {
  region: Extract<BrandRegion, { id: "voice-and-tone" }>;
}) {
  return (
    <div className="flex h-full flex-col bg-[var(--brand-ink)] p-7 text-[var(--brand-paper)]">
      <div className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.18em]">
        <span>Voice and Tone</span>
        <span className="rounded-full bg-white/10 px-2.5 py-1">
          {generationStateLabels[region.state]}
        </span>
      </div>
      <p className="brand-display mt-12 text-5xl leading-[0.96] tracking-[-0.04em]">
        “{region.content.promise}”
      </p>
      <div className="mt-auto flex flex-col gap-3 border-white/15 border-t pt-5">
        {region.content.principles.map((principle, index) => (
          <div className="flex items-center gap-4" key={principle}>
            <span className="text-[var(--brand-saffron)] text-xs">
              0{index + 1}
            </span>
            <span className="text-sm">{principle}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PhotographyRegion({
  region,
}: {
  region: Extract<BrandRegion, { id: "photography" }>;
}) {
  const roleLabels = {
    hero: "Hero",
    product: "Product or service",
    people: "People and culture",
    texture: "Texture or abstract",
  } as const;

  return (
    <div className="flex h-full flex-col bg-[var(--brand-surface)] p-7">
      <RegionLabel region={region} />
      <div className="mt-5 grid flex-1 grid-cols-2 gap-3">
        {region.content.photographs.map((photograph) => (
          <div
            key={photograph.role}
            className="relative flex overflow-hidden bg-[var(--brand-paper)] p-4"
            style={
              photograph.colors
                ? {
                    background: `linear-gradient(135deg, ${photograph.colors[0]} 0%, ${photograph.colors[1]} 48%, ${photograph.colors[2]} 100%)`,
                  }
                : undefined
            }
          >
            {photograph.url ? (
              <img
                src={photograph.url}
                alt={photograph.alt}
                className="absolute inset-0 size-full object-cover"
              />
            ) : photograph.colors ? (
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_22%,rgba(255,255,255,0.55),transparent_35%)]" />
            ) : (
              <div className="m-auto flex flex-col items-center gap-2 text-center text-[var(--brand-muted)] text-xs">
                {photograph.state === "generating" ? (
                  <Spinner className="size-5" />
                ) : null}
                <span>
                  {photograph.state === "failed"
                    ? "Generation failed"
                    : photograph.state === "generating"
                      ? "Generating photograph"
                      : "Waiting for direction"}
                </span>
              </div>
            )}
            <span className="absolute bottom-3 left-3 rounded-full bg-[var(--brand-paper)]/90 px-2.5 py-1 font-medium text-[10px] text-[var(--brand-ink)]">
              {roleLabels[photograph.role]}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[var(--brand-muted)] text-xs">
        {region.content.direction}
      </p>
    </div>
  );
}

function MotionRegion({
  region,
}: {
  region: Extract<BrandRegion, { id: "motion" }>;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--brand-aloe)]/45 p-7">
      <RegionLabel region={region} />
      <div
        role="img"
        aria-label={`${region.content.principle} live motion expression`}
        className="relative my-5 flex flex-1 items-center justify-center overflow-hidden rounded-[50%] bg-[var(--brand-ink)]"
      >
        <div className="brand-motion-orbit size-32 rounded-[42%_58%_55%_45%] bg-[var(--brand-saffron)]" />
        <div className="absolute size-5 rounded-full bg-[var(--brand-clay)]" />
      </div>
      <div className="grid grid-cols-2 gap-4 text-[var(--brand-muted)] text-xs">
        <p>
          <span className="block font-semibold text-[var(--brand-ink)]">
            Duration
          </span>
          {region.content.duration}
        </p>
        <p>
          <span className="block font-semibold text-[var(--brand-ink)]">
            Easing
          </span>
          {region.content.easing}
        </p>
      </div>
    </div>
  );
}

function InterfaceRegion({
  region,
}: {
  region: Extract<BrandRegion, { id: "interface-foundation" }>;
}) {
  return (
    <div className="grid h-full grid-cols-[0.68fr_1.32fr] bg-[var(--brand-paper)]">
      <div className="flex flex-col gap-[var(--brand-spacing-medium)] bg-[var(--brand-saffron)] p-[var(--brand-spacing-large)] text-[var(--brand-ink)]">
        <nav
          aria-label={`${region.content.example.brandName} example navigation`}
          className="flex items-center justify-between gap-3 text-[10px] uppercase tracking-[0.14em]"
        >
          <strong>{region.content.example.brandName}</strong>
          <span className="flex gap-3">
            {region.content.example.navigation.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </span>
        </nav>
        <div className="my-auto flex flex-col gap-[var(--brand-spacing-medium)]">
          <p className="brand-display text-5xl leading-none">
            {region.content.example.headline}
          </p>
          <p className="max-w-80 text-xs leading-relaxed">
            {region.content.example.body}
          </p>
          <div className="flex gap-[var(--brand-spacing-small)]">
            <button
              type="button"
              className="brand-interface-control rounded-[var(--brand-radius-control)] bg-[var(--brand-ink)] px-4 py-2 font-semibold text-[var(--brand-paper)] text-xs"
            >
              {region.content.example.callToAction}
            </button>
            <button
              type="button"
              className="brand-interface-control rounded-[var(--brand-radius-control)] border border-[var(--brand-ink)]/30 px-4 py-2 font-semibold text-xs"
            >
              {region.content.example.secondaryAction}
            </button>
          </div>
        </div>
      </div>
      <div className="flex flex-col p-7">
        <RegionLabel region={region} />
        <div className="mt-auto grid grid-cols-2 gap-3">
          <article
            aria-label={region.content.example.cardTitle}
            className="brand-interface-control rounded-[var(--brand-radius-card)] border border-[var(--brand-ink)]/15 bg-white p-4 shadow-[var(--brand-shadow-card)]"
          >
            <p className="brand-display text-2xl text-[var(--brand-ink)]">
              {region.content.example.cardTitle}
            </p>
            <p className="mt-2 text-[var(--brand-muted)] text-xs">
              {region.content.example.cardDescription}
            </p>
          </article>
          <div className="flex flex-col gap-2">
            <label
              htmlFor="brand-example-email"
              className="font-medium text-[10px] text-[var(--brand-ink)]"
            >
              {region.content.example.inputLabel}
            </label>
            <input
              id="brand-example-email"
              aria-label={region.content.example.inputLabel}
              placeholder={region.content.example.inputPlaceholder}
              readOnly
              className="brand-interface-control rounded-[var(--brand-radius-control)] border border-[var(--brand-ink)]/25 bg-white px-3 py-2 font-normal text-[var(--brand-ink)] text-xs placeholder:text-[var(--brand-muted)]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function DesignTokensRegion({
  region,
}: {
  region: Extract<BrandRegion, { id: "design-tokens" }>;
}) {
  return (
    <div className="grid h-full grid-cols-[0.64fr_1.36fr] bg-[var(--brand-ink)] p-7 text-[var(--brand-paper)]">
      <div className="flex flex-col justify-between border-white/15 border-r pr-5">
        <div>
          <p className="text-[10px] text-[var(--brand-aloe)] uppercase tracking-[0.18em]">
            Brand Region
          </p>
          <h2 className="mt-1 font-semibold text-lg">{region.name}</h2>
        </div>
        <p className="text-[var(--brand-paper)]/75 text-xs">
          CSS · JSON · Ready for production
        </p>
      </div>
      <div className="grid min-w-0 grid-cols-2 gap-4 overflow-hidden pl-5">
        <section aria-label="CSS design tokens" className="overflow-hidden">
          <pre className="font-mono text-[9px] text-[var(--brand-aloe)] leading-4">
            <code>{region.content.css}</code>
          </pre>
        </section>
        <section
          aria-label="JSON design tokens"
          className="overflow-hidden border-white/15 border-l pl-4"
        >
          <pre className="font-mono text-[9px] text-[var(--brand-aloe)] leading-4">
            <code>{region.content.json}</code>
          </pre>
        </section>
      </div>
    </div>
  );
}

function BrandRegionContent({ region }: { region: BrandRegion }) {
  if (region.id === "photography" && region.content.photographs.length > 0) {
    return <PhotographyRegion region={region} />;
  }

  if (region.state !== "ready") {
    return <PendingRegion region={region} />;
  }

  switch (region.id) {
    case "logo":
      return <LogoRegion region={region} />;
    case "color":
      return <ColorRegion region={region} />;
    case "typography":
      return <TypographyRegion region={region} />;
    case "voice-and-tone":
      return <VoiceRegion region={region} />;
    case "photography":
      return <PhotographyRegion region={region} />;
    case "motion":
      return <MotionRegion region={region} />;
    case "interface-foundation":
      return <InterfaceRegion region={region} />;
    case "design-tokens":
      return <DesignTokensRegion region={region} />;
  }
}

export default function BrandRegionCard({
  region,
  isSelected,
  onSelect,
  onRetry,
}: {
  region: BrandRegion;
  isSelected: boolean;
  onSelect: (event: MouseEvent<HTMLElement>) => void;
  onRetry: () => void;
}) {
  const style: CSSProperties = {
    left: region.frame.x,
    top: region.frame.y,
    width: region.frame.width,
    height: region.frame.height,
  };

  return (
    <section
      aria-label={`${region.name} Brand Region`}
      data-canvas-region={region.id}
      className={cn(
        "group/region absolute overflow-hidden border-0 p-0 text-left shadow-[0_18px_50px_rgba(65,54,39,0.11)] outline-none transition-[box-shadow]",
        isSelected &&
          "shadow-[0_26px_70px_rgba(23,35,31,0.2)] ring-4 ring-[var(--brand-ink)]",
      )}
      style={style}
    >
      <Button
        variant="outline"
        size="icon-sm"
        aria-label={`Inspect ${region.name} Brand Region`}
        aria-pressed={isSelected}
        className="absolute top-2 right-2 z-10 opacity-0 focus:opacity-100 group-hover/region:opacity-100"
        onClick={onSelect}
      >
        <FocusIcon />
      </Button>
      {region.state === "failed" ? (
        <Button
          size="sm"
          className="absolute right-3 bottom-3 z-10"
          onClick={onRetry}
        >
          <RotateCcwIcon data-icon="inline-start" />
          Retry {region.name}
        </Button>
      ) : null}
      <BrandRegionContent region={region} />
    </section>
  );
}
