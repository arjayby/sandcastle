import sandcastleSymbolUrl from "@sandcastle/brand/assets/sandcastle-symbol.svg";
import geistMonoUrl from "@sandcastle/brand/fonts/geist-mono-latin-wght-normal.woff2?url";
import instrumentSerifUrl from "@sandcastle/brand/fonts/instrument-serif-latin-400-normal.woff2?url";
import interUrl from "@sandcastle/brand/fonts/inter-latin-wght-normal.woff2?url";
import { Toaster } from "@sandcastle/ui/components/sonner";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import Header from "@/components/header";
import { ThemeProvider } from "@/components/theme-provider";

import "../index.css";

export type RouterAppContext = Record<string, never>;

export const Route = createRootRouteWithContext<RouterAppContext>()({
  component: RootComponent,
  head: () => ({
    meta: [
      {
        title: "Sandcastle | Create a complete Brand System",
      },
      {
        name: "description",
        content:
          "Direct an expert Brand Agent and create a coherent Brand System that is ready to ship.",
      },
    ],
    links: [
      {
        rel: "icon",
        href: sandcastleSymbolUrl,
        type: "image/svg+xml",
      },
      ...[instrumentSerifUrl, interUrl, geistMonoUrl].map((href) => ({
        rel: "preload",
        href,
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous" as const,
      })),
    ],
  }),
});

function RootComponent() {
  return (
    <>
      <HeadContent />
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        disableTransitionOnChange
        storageKey="vite-ui-theme"
      >
        <div className="sc-shell grid h-svh grid-rows-[auto_1fr]">
          <Header />
          <Outlet />
        </div>
        <Toaster richColors />
      </ThemeProvider>
      <TanStackRouterDevtools position="bottom-left" />
    </>
  );
}
