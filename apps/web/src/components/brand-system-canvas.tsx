import { Button, buttonVariants } from "@sandcastle/ui/components/button";
import { Separator } from "@sandcastle/ui/components/separator";
import { Spinner } from "@sandcastle/ui/components/spinner";
import { cn } from "@sandcastle/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import {
  CopyIcon,
  DownloadIcon,
  FocusIcon,
  LogOutIcon,
  type LucideIcon,
  MinusIcon,
  PackageOpenIcon,
  ScanIcon,
  XIcon,
  ZoomInIcon,
} from "lucide-react";
import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import BrandRegionCard from "@/components/brand-region";
import {
  copyBrandArtifact,
  downloadBrandPhotograph,
  downloadLogo,
} from "@/lib/brand-artifact-actions";
import {
  type BrandRegion,
  createProgressiveBrandSystem,
  getValidatedDirectionName,
  type ProgressiveGenerationData,
} from "@/lib/brand-system";

const CANVAS_PADDING = 48;
const MIN_SCALE = 0.25;
const MIN_FIT_SCALE = 0.05;
const MAX_SCALE = 1.8;

type ViewTransform = {
  x: number;
  y: number;
  scale: number;
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
};

function clampScale(scale: number) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

function ArtifactActionButton({
  label,
  successMessage,
  errorMessage,
  icon: Icon,
  onAction,
  disabled = false,
  children,
}: {
  label: string;
  successMessage: string;
  errorMessage: string;
  icon: LucideIcon;
  onAction: () => void | Promise<void>;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const [isPending, setIsPending] = useState(false);

  async function handleAction() {
    setIsPending(true);
    try {
      await onAction();
      toast.success(successMessage);
    } catch {
      toast.error(errorMessage);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      aria-label={label}
      disabled={disabled || isPending}
      onClick={handleAction}
    >
      {isPending ? (
        <Spinner data-icon="inline-start" />
      ) : (
        <Icon data-icon="inline-start" />
      )}
      {children}
    </Button>
  );
}

function CopyArtifactButton({
  label,
  value,
  successMessage,
  children = "Copy",
}: {
  label: string;
  value: string;
  successMessage?: string;
  children?: React.ReactNode;
}) {
  return (
    <ArtifactActionButton
      label={label}
      successMessage={successMessage ?? `${label.replace(/^Copy /, "")} copied`}
      errorMessage={`Could not copy ${label.replace(/^Copy /, "").toLowerCase()}`}
      icon={CopyIcon}
      onAction={() => copyBrandArtifact(value)}
    >
      {children}
    </ArtifactActionButton>
  );
}

function CopyArtifactList({
  artifacts,
}: {
  artifacts: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="mt-4 flex flex-col gap-2 text-xs">
      {artifacts.map((artifact) => (
        <div
          key={artifact.label}
          className="grid grid-cols-[1fr_auto] items-center gap-2"
        >
          <p>
            <strong>{artifact.label}:</strong> {artifact.value}
          </p>
          <CopyArtifactButton
            label={`Copy ${artifact.label.toLowerCase()}`}
            value={artifact.value}
          />
        </div>
      ))}
    </div>
  );
}

function RegionDetails({
  region,
  projectName,
}: {
  region: BrandRegion;
  projectName: string;
}) {
  switch (region.id) {
    case "logo": {
      const variants = [
        ["Primary lockup", region.content.primaryLockupSvg],
        ["Wordmark", region.content.wordmarkSvg],
        ["Symbol", region.content.symbolSvg],
      ] as const;
      return (
        <div className="mt-4 flex flex-col gap-2">
          {variants.map(([name, svg]) => (
            <ArtifactActionButton
              key={name}
              label={`Download ${name} logo`}
              successMessage={`${name} logo downloaded`}
              errorMessage={`Could not download ${name.toLowerCase()} logo`}
              icon={DownloadIcon}
              onAction={() => downloadLogo(projectName, name, svg)}
            >
              Download {name}
            </ArtifactActionButton>
          ))}
          <CopyArtifactButton
            label="Copy logo tagline"
            value={region.content.tagline}
          >
            Copy tagline
          </CopyArtifactButton>
        </div>
      );
    }
    case "color":
      return (
        <ul className="mt-4 flex flex-col gap-2 text-xs">
          {region.content.palette.map((color) => (
            <li key={color.name} className="grid grid-cols-[1fr_auto] gap-3">
              <span>
                <strong>{color.name}</strong> · {color.role}
                <span className="block text-muted-foreground">
                  {color.usage} · {color.contrast}
                </span>
              </span>
              <CopyArtifactButton
                label={`Copy ${color.name} color value`}
                value={color.value}
              >
                <span className="font-mono uppercase">{color.value}</span>
              </CopyArtifactButton>
            </li>
          ))}
        </ul>
      );
    case "typography":
      return (
        <div className="mt-4 flex flex-col gap-3 text-xs">
          {[
            {
              label: "Display",
              family: region.content.display,
              weights: region.content.displayWeights,
              fallbacks: region.content.displayFallbacks,
            },
            {
              label: "Text",
              family: region.content.body,
              weights: region.content.bodyWeights,
              fallbacks: region.content.bodyFallbacks,
            },
          ].map((typographyStyle) => (
            <div
              key={typographyStyle.label}
              className="grid grid-cols-[1fr_auto] items-center gap-2"
            >
              <p>
                <strong>{typographyStyle.family}</strong> ·{" "}
                {typographyStyle.label.toLowerCase()} · weights{" "}
                {typographyStyle.weights.join(", ")} · fallbacks{" "}
                {typographyStyle.fallbacks.join(", ")}
              </p>
              <CopyArtifactButton
                label={`Copy ${typographyStyle.family} type value`}
                value={`${typographyStyle.family} · ${typographyStyle.label.toLowerCase()} · weights ${typographyStyle.weights.join(", ")} · fallbacks ${typographyStyle.fallbacks.join(", ")}`}
              />
            </div>
          ))}
          <CopyArtifactButton
            label="Copy sample headline"
            value={region.content.sampleHeadline}
          >
            Copy sample headline
          </CopyArtifactButton>
          <ul className="flex flex-col gap-1 text-muted-foreground">
            {region.content.scale.map((step) => (
              <li
                key={step.name}
                className="flex items-center justify-between gap-2"
              >
                <span>
                  {step.name}: {step.size}/{step.lineHeight}, {step.weight}
                </span>
                <CopyArtifactButton
                  label={`Copy ${step.name} type scale value`}
                  value={`font-size: ${step.size}; line-height: ${step.lineHeight}; font-weight: ${step.weight};`}
                />
              </li>
            ))}
          </ul>
        </div>
      );
    case "voice-and-tone":
      return (
        <CopyArtifactList
          artifacts={[
            { label: "Voice promise", value: region.content.promise },
            {
              label: "Prefer",
              value: region.content.preferredWords.join(", "),
            },
            {
              label: "Avoid",
              value: region.content.avoidedWords.join(", "),
            },
            { label: "Before", value: region.content.beforeAfter.before },
            { label: "After", value: region.content.beforeAfter.after },
            ...region.content.principles.map((value, index) => ({
              label: `Principle ${index + 1}`,
              value,
            })),
          ]}
        />
      );
    case "photography": {
      const roleLabels = {
        hero: "Hero",
        product: "Product or service",
        people: "People and culture",
        texture: "Texture or abstract",
      } as const;
      return (
        <div className="mt-4 flex flex-col gap-2">
          <CopyArtifactButton
            label="Copy photography direction"
            value={region.content.direction}
          >
            Copy photography direction
          </CopyArtifactButton>
          {region.content.photographs.map((photograph) => {
            const roleLabel = roleLabels[photograph.role];
            const isDownloadable =
              photograph.state === "ready" &&
              Boolean(photograph.url || photograph.colors);
            return (
              <ArtifactActionButton
                key={photograph.role}
                label={`Download ${roleLabel} photograph`}
                successMessage={`${roleLabel} photograph downloaded`}
                errorMessage={`Could not download ${roleLabel.toLowerCase()} photograph`}
                icon={DownloadIcon}
                disabled={!isDownloadable}
                onAction={() =>
                  downloadBrandPhotograph({
                    projectName,
                    role: photograph.role,
                    url: photograph.url,
                    colors: photograph.colors,
                  })
                }
              >
                {isDownloadable
                  ? `Download ${roleLabel}`
                  : `${roleLabel} is not ready`}
              </ArtifactActionButton>
            );
          })}
        </div>
      );
    }
    case "motion":
      return (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <CopyArtifactButton
            label="Copy motion duration value"
            value={region.content.duration}
          >
            {region.content.duration}
          </CopyArtifactButton>
          <CopyArtifactButton
            label="Copy motion easing value"
            value={region.content.easing}
          >
            {region.content.easing}
          </CopyArtifactButton>
        </div>
      );
    case "interface-foundation": {
      const example = region.content.example;
      const textArtifacts = [
        { label: "Brand name", value: example.brandName },
        ...example.navigation.map((value, index) => ({
          label: `Navigation ${index + 1}`,
          value,
        })),
        { label: "Interface headline", value: example.headline },
        { label: "Interface body", value: example.body },
        { label: "Primary action", value: example.callToAction },
        { label: "Secondary action", value: example.secondaryAction },
        { label: "Card title", value: example.cardTitle },
        { label: "Card description", value: example.cardDescription },
        { label: "Input label", value: example.inputLabel },
        { label: "Input placeholder", value: example.inputPlaceholder },
      ];
      return <CopyArtifactList artifacts={textArtifacts} />;
    }
    case "design-tokens":
      return (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <CopyArtifactButton
            label="Copy All CSS"
            value={region.content.css}
            successMessage="CSS design tokens copied"
          >
            Copy All CSS
          </CopyArtifactButton>
          <CopyArtifactButton
            label="Copy All JSON"
            value={region.content.json}
            successMessage="JSON design tokens copied"
          >
            Copy All JSON
          </CopyArtifactButton>
        </div>
      );
    default:
      return null;
  }
}

export default function BrandSystemCanvas({
  projectName,
  description,
  generation,
  onRetryRegion,
  onLoadBuiltInFallback,
  onSignOut,
  toolbarAction,
}: {
  projectName: string;
  description: string;
  generation: ProgressiveGenerationData;
  onRetryRegion?: (region: BrandRegion["id"]) => Promise<unknown>;
  onLoadBuiltInFallback?: () => Promise<unknown>;
  onSignOut?: () => void;
  toolbarAction?: React.ReactNode;
}) {
  const brandSystem = useMemo(
    () => createProgressiveBrandSystem(projectName, generation),
    [generation, projectName],
  );
  const directionName = getValidatedDirectionName(generation.directionJson);
  const completeProviderFailure =
    !!generation.generationError &&
    !generation.logoJson &&
    !generation.builtInFallback;
  const viewportRef = useRef<HTMLDivElement>(null);
  const inspectorRef = useRef<HTMLElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const didPanRef = useRef(false);
  const [isPanning, setIsPanning] = useState(false);
  const [selectedRegionId, setSelectedRegionId] = useState<
    BrandRegion["id"] | null
  >(null);
  const [transform, setTransform] = useState<ViewTransform>({
    x: 0,
    y: 0,
    scale: 0.5,
  });

  const selectedRegion = brandSystem.regions.find(
    (region) => region.id === selectedRegionId,
  );
  const typographyRegion = brandSystem.regions.find(
    (region) => region.id === "typography",
  );
  const motionRegion = brandSystem.regions.find(
    (region) => region.id === "motion",
  );
  const designTokensRegion = brandSystem.regions.find(
    (region) => region.id === "design-tokens",
  );
  if (!(typographyRegion && motionRegion && designTokensRegion)) {
    throw new Error(
      "Brand System typography, motion, and design token regions are required",
    );
  }
  const brandThemeStyle = {
    "--brand-ink": brandSystem.theme.ink,
    "--brand-saffron": brandSystem.theme.saffron,
    "--brand-aloe": brandSystem.theme.aloe,
    "--brand-clay": brandSystem.theme.clay,
    "--brand-paper": brandSystem.theme.paper,
    "--brand-surface": brandSystem.theme.surface,
    "--brand-muted": brandSystem.theme.muted,
    "--brand-font-display": `"${typographyRegion.content.display}", ${typographyRegion.content.displayFallbacks.join(", ")}`,
    "--brand-font-body": `"${typographyRegion.content.body}", ${typographyRegion.content.bodyFallbacks.join(", ")}`,
    "--brand-motion-duration": motionRegion.content.duration,
    "--brand-motion-easing": motionRegion.content.easing,
    "--brand-spacing-small": designTokensRegion.content.spacing.small,
    "--brand-spacing-medium": designTokensRegion.content.spacing.medium,
    "--brand-spacing-large": designTokensRegion.content.spacing.large,
    "--brand-radius-control": designTokensRegion.content.radius.control,
    "--brand-radius-card": designTokensRegion.content.radius.card,
    "--brand-shadow-card": designTokensRegion.content.shadows.card,
    fontFamily: "var(--brand-font-body)",
  } as CSSProperties;

  const fitBrandSystem = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const { width, height } = viewport.getBoundingClientRect();
    const scale = Math.max(
      MIN_FIT_SCALE,
      Math.min(
        (width - CANVAS_PADDING * 2) / brandSystem.board.width,
        (height - CANVAS_PADDING * 2) / brandSystem.board.height,
        1,
      ),
    );

    setTransform({
      x: (width - brandSystem.board.width * scale) / 2,
      y: (height - brandSystem.board.height * scale) / 2,
      scale,
    });
  }, [brandSystem.board.height, brandSystem.board.width]);

  useLayoutEffect(() => {
    fitBrandSystem();
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const resizeObserver = new ResizeObserver(fitBrandSystem);
    resizeObserver.observe(viewport);
    return () => resizeObserver.disconnect();
  }, [fitBrandSystem]);

  const zoomAt = useCallback(
    (clientX: number, clientY: number, factor: number) => {
      const viewport = viewportRef.current;
      if (!viewport) {
        return;
      }

      const bounds = viewport.getBoundingClientRect();
      const anchorX = clientX - bounds.left;
      const anchorY = clientY - bounds.top;

      setTransform((current) => {
        const scale = clampScale(current.scale * factor);
        const worldX = (anchorX - current.x) / current.scale;
        const worldY = (anchorY - current.y) / current.scale;

        return {
          x: anchorX - worldX * scale,
          y: anchorY - worldY * scale,
          scale,
        };
      });
    },
    [],
  );

  function zoomFromCenter(factor: number) {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const bounds = viewport.getBoundingClientRect();
    zoomAt(
      bounds.left + bounds.width / 2,
      bounds.top + bounds.height / 2,
      factor,
    );
  }

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    if (event.ctrlKey || event.metaKey) {
      zoomAt(event.clientX, event.clientY, Math.exp(-event.deltaY * 0.002));
      return;
    }

    setTransform((current) => ({
      ...current,
      x: current.x - event.deltaX,
      y: current.y - event.deltaY,
    }));
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) {
      return;
    }

    didPanRef.current = false;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: transform.x,
      originY: transform.y,
    };
    setIsPanning(true);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (Math.abs(deltaX) + Math.abs(deltaY) > 4) {
      if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.setPointerCapture(event.pointerId);
      }
      didPanRef.current = true;
    }
    setTransform((current) => ({
      ...current,
      x: drag.originX + deltaX,
      y: drag.originY + deltaY,
    }));
  }

  function finishPointerGesture(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) {
      return;
    }
    dragRef.current = null;
    setIsPanning(false);
  }

  function selectRegion(
    region: BrandRegion,
    event: React.MouseEvent<HTMLElement>,
  ) {
    if (didPanRef.current) {
      didPanRef.current = false;
      return;
    }
    event.stopPropagation();
    setSelectedRegionId(region.id);
  }

  function focusRegion(region: BrandRegion) {
    const viewport = viewportRef.current;
    if (!viewport) {
      return;
    }

    const viewportBounds = viewport.getBoundingClientRect();
    const inspectorBounds = inspectorRef.current?.getBoundingClientRect();
    const isBottomInspector =
      inspectorBounds && inspectorBounds.width > viewportBounds.width * 0.7;
    const width =
      inspectorBounds && !isBottomInspector
        ? inspectorBounds.left - viewportBounds.left - 24
        : viewportBounds.width;
    const height =
      inspectorBounds && isBottomInspector
        ? inspectorBounds.top - viewportBounds.top - 24
        : viewportBounds.height;
    const scale = clampScale(
      Math.min(
        (width - 160) / region.frame.width,
        (height - 160) / region.frame.height,
        1.25,
      ),
    );
    setTransform({
      x: width / 2 - (region.frame.x + region.frame.width / 2) * scale,
      y: height / 2 - (region.frame.y + region.frame.height / 2) * scale,
      scale,
    });
  }

  return (
    <main
      className="grid h-full min-h-0 grid-rows-[auto_1fr]"
      aria-label="Brand Canvas"
      style={brandThemeStyle}
    >
      <link rel="stylesheet" href={typographyRegion.content.stylesheetUrl} />
      <header className="flex min-h-16 items-center gap-3 border-b bg-background px-3 py-2 md:px-4">
        {onSignOut ? (
          <>
            <Link
              to="/dashboard"
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              All Brand Projects
            </Link>
            <Separator orientation="vertical" className="hidden h-7 md:block" />
          </>
        ) : null}
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-medium text-sm">
            {projectName} Brand System
          </h1>
          <p className="hidden truncate text-muted-foreground text-xs md:block">
            {directionName ? `${directionName} · ${description}` : description}
          </p>
        </div>
        {completeProviderFailure && onLoadBuiltInFallback ? (
          <Button size="sm" onClick={() => void onLoadBuiltInFallback()}>
            <PackageOpenIcon data-icon="inline-start" />
            Use built in fallback
          </Button>
        ) : null}
        {toolbarAction}
        <div className="flex items-center gap-1 rounded-md border bg-background p-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Zoom out"
            onClick={() => zoomFromCenter(0.8)}
          >
            <MinusIcon />
          </Button>
          <output
            aria-label="Canvas zoom"
            className="w-11 text-center font-mono text-muted-foreground text-xs tabular-nums"
          >
            {Math.round(transform.scale * 100)}%
          </output>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Zoom in"
            onClick={() => zoomFromCenter(1.25)}
          >
            <ZoomInIcon />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Fit Brand System"
            onClick={fitBrandSystem}
          >
            <ScanIcon data-icon="inline-start" />
            <span className="hidden sm:inline">Fit</span>
          </Button>
        </div>
        {onSignOut ? (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Sign out"
            onClick={onSignOut}
          >
            <LogOutIcon />
          </Button>
        ) : null}
      </header>

      <div
        ref={viewportRef}
        role="application"
        aria-label="Brand Canvas viewport"
        aria-describedby="canvas-instructions"
        // biome-ignore lint/a11y/noNoninteractiveTabindex: The spatial viewport needs keyboard pan and zoom controls.
        tabIndex={0}
        className={cn(
          "brand-paper relative min-h-0 touch-none overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
          isPanning ? "cursor-grabbing" : "cursor-grab",
        )}
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointerGesture}
        onPointerCancel={finishPointerGesture}
        onClick={(event) => {
          if (event.target !== event.currentTarget) {
            return;
          }
          if (didPanRef.current) {
            didPanRef.current = false;
            return;
          }
          setSelectedRegionId(null);
        }}
        onKeyDown={(event) => {
          const panDistance = event.shiftKey ? 100 : 40;
          if (event.key === "+" || event.key === "=") {
            event.preventDefault();
            zoomFromCenter(1.25);
          } else if (event.key === "-") {
            event.preventDefault();
            zoomFromCenter(0.8);
          } else if (event.key === "0") {
            event.preventDefault();
            fitBrandSystem();
          } else if (event.key === "Escape") {
            setSelectedRegionId(null);
          } else if (
            ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
              event.key,
            )
          ) {
            event.preventDefault();
            setTransform((current) => ({
              ...current,
              x:
                current.x +
                (event.key === "ArrowLeft"
                  ? panDistance
                  : event.key === "ArrowRight"
                    ? -panDistance
                    : 0),
              y:
                current.y +
                (event.key === "ArrowUp"
                  ? panDistance
                  : event.key === "ArrowDown"
                    ? -panDistance
                    : 0),
            }));
          }
        }}
      >
        <p id="canvas-instructions" className="sr-only">
          Drag or scroll to pan. Hold Control while scrolling to zoom around the
          pointer. Use the Fit control to show the complete Brand System.
        </p>
        <section
          aria-label="Brand System board"
          className="absolute origin-top-left"
          style={{
            width: brandSystem.board.width,
            height: brandSystem.board.height,
            transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
          }}
        >
          {brandSystem.regions.map((region) => (
            <BrandRegionCard
              key={region.id}
              region={region}
              isSelected={region.id === selectedRegionId}
              onSelect={(event) => selectRegion(region, event)}
              onRetry={
                onRetryRegion ? () => void onRetryRegion(region.id) : undefined
              }
            />
          ))}
        </section>

        {selectedRegion ? (
          <aside
            ref={inspectorRef}
            aria-label="Brand Region inspector"
            className="absolute right-3 bottom-3 left-3 max-h-[42%] overflow-auto border bg-background p-5 shadow-xl md:top-3 md:bottom-3 md:left-auto md:max-h-none md:w-80"
            onPointerDown={(event) => event.stopPropagation()}
            onWheel={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <p className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                  Current rules
                </p>
                <h2 className="font-semibold text-lg">{selectedRegion.name}</h2>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Close inspector"
                onClick={() => setSelectedRegionId(null)}
              >
                <XIcon />
              </Button>
            </div>
            <p className="mt-3 text-muted-foreground text-sm">
              {selectedRegion.summary}
            </p>
            <RegionDetails region={selectedRegion} projectName={projectName} />
            <Separator className="my-5" />
            <ul className="flex list-disc flex-col gap-3 pl-4 text-sm leading-relaxed">
              {selectedRegion.rules.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
            <Button
              className="mt-6 w-full"
              variant="outline"
              onClick={() => focusRegion(selectedRegion)}
            >
              <FocusIcon data-icon="inline-start" />
              Focus {selectedRegion.name}
            </Button>
          </aside>
        ) : null}
      </div>
    </main>
  );
}
