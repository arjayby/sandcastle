import { Button, buttonVariants } from "@sandcastle/ui/components/button";
import { Separator } from "@sandcastle/ui/components/separator";
import { cn } from "@sandcastle/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import {
  FocusIcon,
  LogOutIcon,
  MinusIcon,
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

import BrandRegionCard from "@/components/brand-region";
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

function RegionDetails({ region }: { region: BrandRegion }) {
  switch (region.id) {
    case "logo":
      return (
        <p className="mt-4 text-muted-foreground text-xs">
          Primary lockup · Wordmark · Symbol
        </p>
      );
    case "color":
      return (
        <ul className="mt-4 flex flex-col gap-2 text-xs">
          {region.content.palette.map((color) => (
            <li key={color.name} className="grid grid-cols-[1fr_auto] gap-3">
              <span>
                <strong>{color.name}</strong> · {color.role}
                <span className="block text-muted-foreground">
                  {color.usage}
                </span>
              </span>
              <span className="font-mono uppercase">{color.contrast}</span>
            </li>
          ))}
        </ul>
      );
    case "typography":
      return (
        <div className="mt-4 flex flex-col gap-3 text-xs">
          <p>
            <strong>{region.content.display}</strong> · weights{" "}
            {region.content.displayWeights.join(", ")} · fallbacks{" "}
            {region.content.displayFallbacks.join(", ")}
          </p>
          <p>
            <strong>{region.content.body}</strong> · weights{" "}
            {region.content.bodyWeights.join(", ")} · fallbacks{" "}
            {region.content.bodyFallbacks.join(", ")}
          </p>
          <ul className="flex flex-col gap-1 text-muted-foreground">
            {region.content.scale.map((step) => (
              <li key={step.name}>
                {step.name}: {step.size}/{step.lineHeight}, {step.weight}
              </li>
            ))}
          </ul>
        </div>
      );
    case "voice-and-tone":
      return (
        <div className="mt-4 flex flex-col gap-2 text-xs">
          <p>
            <strong>Prefer:</strong> {region.content.preferredWords.join(", ")}
          </p>
          <p>
            <strong>Avoid:</strong> {region.content.avoidedWords.join(", ")}
          </p>
          <p className="text-muted-foreground line-through">
            {region.content.beforeAfter.before}
          </p>
          <p>{region.content.beforeAfter.after}</p>
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
  onSignOut,
}: {
  projectName: string;
  description: string;
  generation: ProgressiveGenerationData;
  onSignOut: () => void;
}) {
  const brandSystem = useMemo(
    () => createProgressiveBrandSystem(projectName, generation),
    [generation, projectName],
  );
  const directionName = getValidatedDirectionName(generation.directionJson);
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
  if (!(typographyRegion && motionRegion)) {
    throw new Error("Brand System typography and motion regions are required");
  }
  const brandThemeStyle = {
    "--brand-ink": brandSystem.theme.ink,
    "--brand-saffron": brandSystem.theme.saffron,
    "--brand-aloe": brandSystem.theme.aloe,
    "--brand-clay": brandSystem.theme.clay,
    "--brand-paper": brandSystem.theme.paper,
    "--brand-surface": brandSystem.theme.surface,
    "--brand-muted": brandSystem.theme.muted,
    "--brand-font-display": `"${typographyRegion.content.display}", Georgia, serif`,
    "--brand-motion-duration": motionRegion.content.duration,
    "--brand-motion-easing": motionRegion.content.easing,
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
    event: React.MouseEvent<HTMLButtonElement>,
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
        <Link
          to="/dashboard"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          All Brand Projects
        </Link>
        <Separator orientation="vertical" className="hidden h-7 md:block" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-medium text-sm">
            {projectName} Brand System
          </h1>
          <p className="hidden truncate text-muted-foreground text-xs md:block">
            {directionName ? `${directionName} · ${description}` : description}
          </p>
        </div>
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
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Sign out"
          onClick={onSignOut}
        >
          <LogOutIcon />
        </Button>
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
            <RegionDetails region={selectedRegion} />
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
