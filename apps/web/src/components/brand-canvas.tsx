import { cn } from "@sandcastle/ui/lib/utils";

export default function BrandCanvas({
  className,
  ...props
}: React.ComponentProps<"main">) {
  return (
    <main
      aria-label="Brand Canvas"
      className={cn(
        "relative flex min-h-full overflow-auto bg-muted/30 p-6 md:p-12",
        className,
      )}
      {...props}
    />
  );
}
