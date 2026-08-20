import { Separator } from "@sandcastle/ui/components/separator";
import { Link } from "@tanstack/react-router";
import { Authenticated } from "convex/react";

import { ModeToggle } from "./mode-toggle";

export default function Header() {
	return (
		<div>
			<div className="flex flex-row items-center justify-between px-2 py-1">
				<nav className="flex gap-4 text-lg">
					<Link to="/">Sandcastle</Link>
					<Authenticated>
						<Link to="/dashboard">Brand Projects</Link>
					</Authenticated>
				</nav>
				<div className="flex items-center gap-2">
					<ModeToggle />
				</div>
			</div>
			<Separator />
		</div>
	);
}
