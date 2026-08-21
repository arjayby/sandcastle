import sandcastleWordmarkInkUrl from "@sandcastle/brand/assets/sandcastle-wordmark-ink.svg";
import sandcastleWordmarkPaperUrl from "@sandcastle/brand/assets/sandcastle-wordmark-paper.svg";
import { Separator } from "@sandcastle/ui/components/separator";
import { Link } from "@tanstack/react-router";
import { Authenticated } from "convex/react";

import { ModeToggle } from "./mode-toggle";

export default function Header() {
  return (
    <header className="sc-app-header">
      <div className="flex min-h-16 flex-row items-center justify-between px-4 md:px-6">
        <nav className="flex items-center gap-6">
          <Link
            aria-label="Sandcastle home"
            className="sc-home-link flex min-h-11 items-center gap-2"
            to="/"
          >
            <img
              alt=""
              className="sc-wordmark-ink"
              src={sandcastleWordmarkInkUrl}
            />
            <img
              alt=""
              className="sc-wordmark-paper"
              src={sandcastleWordmarkPaperUrl}
            />
          </Link>
          <Authenticated>
            <Link className="flex min-h-11 items-center" to="/dashboard">
              Brand Projects
            </Link>
          </Authenticated>
        </nav>
        <div className="flex items-center gap-2">
          <ModeToggle />
        </div>
      </div>
      <Separator />
    </header>
  );
}
