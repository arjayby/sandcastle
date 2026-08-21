export const colors = {
  ink: "#20201E",
  paper: "#F7F3E8",
  sand: "#D9CEB8",
  amber: "#F4C95D",
  surface: "#FFFDF8",
  muted: "#6B675E",
} as const;

export const typeRoles = {
  display: {
    family: "Instrument Serif",
    fallback: 'Georgia, "Times New Roman", serif',
  },
  interface: {
    family: "Inter",
    fallback:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  technical: {
    family: "Geist Mono",
    fallback:
      '"SFMono-Regular", Consolas, "Liberation Mono", ui-monospace, monospace',
  },
} as const;

export const spacing = {
  unit: "8px",
  control: "8px",
  cluster: "16px",
  panel: "24px",
  section: "48px",
  page: "64px",
} as const;

export const corners = {
  control: "8px",
  panel: "12px",
  round: "999px",
} as const;

export const motion = {
  fast: {
    durationMs: 160,
    easing: "cubic-bezier(0.2, 0, 0, 1)",
  },
  normal: {
    durationMs: 220,
    easing: "cubic-bezier(0.2, 0, 0, 1)",
  },
} as const;

export const productShell = {
  light: {
    background: colors.paper,
    surface: colors.surface,
    foreground: colors.ink,
    mutedForeground: colors.muted,
    border: colors.sand,
    action: colors.amber,
    actionForeground: colors.ink,
  },
  dark: {
    background: colors.ink,
    surface: "#2B2B28",
    foreground: colors.paper,
    mutedForeground: "#C2BBAE",
    border: "#56534C",
    action: colors.amber,
    actionForeground: colors.ink,
  },
} as const;

export const tokenNames = [
  "--sc-color-ink",
  "--sc-color-paper",
  "--sc-color-sand",
  "--sc-color-amber",
  "--sc-color-surface",
  "--sc-color-muted",
  "--sc-font-display",
  "--sc-font-interface",
  "--sc-font-technical",
  "--sc-space-unit",
  "--sc-space-1",
  "--sc-space-2",
  "--sc-space-3",
  "--sc-space-6",
  "--sc-space-8",
  "--sc-corner-control",
  "--sc-corner-panel",
  "--sc-corner-round",
  "--sc-motion-fast",
  "--sc-motion-normal",
  "--sc-motion-ease",
  "--sc-shell-background",
  "--sc-shell-surface",
  "--sc-shell-foreground",
  "--sc-shell-muted-foreground",
  "--sc-shell-border",
  "--sc-shell-action",
  "--sc-shell-action-foreground",
] as const;

function channelLuminance(channel: number) {
  const normalized = channel / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hexColor: string) {
  const channels = hexColor
    .slice(1)
    .match(/.{2}/g)
    ?.map((channel) => Number.parseInt(channel, 16));
  if (channels?.length !== 3) {
    throw new Error(`Expected a six digit hex color, received ${hexColor}`);
  }
  const [redChannel, greenChannel, blueChannel] = channels;
  if (
    redChannel === undefined ||
    greenChannel === undefined ||
    blueChannel === undefined
  ) {
    throw new Error(`Expected a six digit hex color, received ${hexColor}`);
  }
  const red = channelLuminance(redChannel);
  const green = channelLuminance(greenChannel);
  const blue = channelLuminance(blueChannel);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function getContrastRatio(foreground: string, background: string) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);

  return (
    (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
    (Math.min(foregroundLuminance, backgroundLuminance) + 0.05)
  );
}
