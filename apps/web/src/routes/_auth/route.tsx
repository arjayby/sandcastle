import { Skeleton } from "@sandcastle/ui/components/skeleton";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { useState } from "react";

import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";
import { loadBrandBriefDraft } from "@/lib/brand-brief-draft";

interface AuthSearch {
  mode?: "sign-in";
}

export const Route = createFileRoute("/_auth")({
  validateSearch: (search): AuthSearch =>
    search.mode === "sign-in" ? { mode: "sign-in" } : {},
  component: AuthLayout,
});

function AuthLayout() {
  const { mode } = Route.useSearch();
  const [showSignIn, setShowSignIn] = useState(mode === "sign-in");
  const [hasBrandBrief] = useState(() => loadBrandBriefDraft() !== null);

  return (
    <>
      <Authenticated>
        <Outlet />
      </Authenticated>
      <Unauthenticated>
        {showSignIn ? (
          <SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
        ) : (
          <SignUpForm
            hasBrandBrief={hasBrandBrief}
            onSwitchToSignIn={() => setShowSignIn(true)}
          />
        )}
      </Unauthenticated>
      <AuthLoading>
        <main className="p-6 md:p-12">
          <Skeleton className="mx-auto h-64 w-full max-w-md" />
        </main>
      </AuthLoading>
    </>
  );
}
