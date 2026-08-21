const COMMON_TEXT_CONTRAST_THRESHOLD = 4.5;

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
  const [red, green, blue] = channels.map(channelLuminance);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

export function getCommonTextContrast(background: string, foreground: string) {
  const backgroundLuminance = relativeLuminance(background);
  const foregroundLuminance = relativeLuminance(foreground);
  const ratio =
    (Math.max(backgroundLuminance, foregroundLuminance) + 0.05) /
    (Math.min(backgroundLuminance, foregroundLuminance) + 0.05);

  return {
    ratio,
    passes: ratio >= COMMON_TEXT_CONTRAST_THRESHOLD,
  };
}

export function getPaletteForeground(index: number, brandInk: string) {
  return index === 0 || index === 3 ? "#FFFFFF" : brandInk;
}
