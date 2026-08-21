import { api } from "@sandcastle/backend/convex/_generated/api";
import { Button } from "@sandcastle/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@sandcastle/ui/components/dropdown-menu";
import { useQuery } from "convex/react";
import { UserRoundIcon } from "lucide-react";

import { authClient } from "@/lib/auth-client";

export default function UserMenu() {
  const user = useQuery(api.auth.getCurrentUser);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label="Account controls"
            className="sc-account-control"
            size="sm"
            variant="outline"
          />
        }
      >
        <UserRoundIcon />
        <span className="hidden lg:inline">{user?.name ?? "Account"}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-card">
        <DropdownMenuGroup>
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>{user?.email}</DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={() => authClient.signOut()}
          >
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
