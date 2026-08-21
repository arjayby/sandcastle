import { Button } from "@sandcastle/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@sandcastle/ui/components/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@sandcastle/ui/components/field";
import { Input } from "@sandcastle/ui/components/input";
import { Textarea } from "@sandcastle/ui/components/textarea";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import BrandCanvas from "@/components/brand-canvas";
import { saveBrandBriefDraft } from "@/lib/brand-brief-draft";

export const Route = createFileRoute("/new")({
  component: NewBrandBrief,
});

const DESCRIPTION_GUIDANCE =
  "Tell us what your company does, who it serves, and what makes it different. You can also include the feeling you want, preferred colors, visual references, competitors, and anything the brand should avoid.";

function NewBrandBrief() {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");

  return (
    <BrandCanvas className="sc-entry-surface items-center">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
        <section className="sc-entry-intro flex flex-col gap-6">
          <p className="sc-entry-kicker">Expert brand creation</p>
          <h1 className="sc-entry-heading">Create a complete Brand System.</h1>
          <p className="sc-entry-copy">
            Give the Brand Agent clear direction. It creates one coherent system
            for your logo, color, typography, voice, motion, and interface.
          </p>
          <p className="sc-entry-process" data-sc-motion>
            Brief. Build. Refine. Ship.
          </p>
        </section>
        <Card className="sc-entry-card w-full">
          <CardHeader>
            <CardTitle>
              <h2>Start with your Brand Brief</h2>
            </CardTitle>
            <CardDescription>
              Describe the company now. You will only need to sign in when you
              are ready to generate.
            </CardDescription>
          </CardHeader>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              saveBrandBriefDraft(companyName, description);
              navigate({ to: "/projects/new" });
            }}
          >
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="company-name">Company name</FieldLabel>
                  <Input
                    id="company-name"
                    name="companyName"
                    autoComplete="organization"
                    required
                    value={companyName}
                    onChange={(event) => setCompanyName(event.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="description">Description</FieldLabel>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder={DESCRIPTION_GUIDANCE}
                    required
                    rows={7}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                  <FieldDescription>
                    Company name and description are the only required details.
                    The Brand Agent infers anything you leave out.
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </CardContent>
            <CardFooter className="mt-4 justify-end">
              <Button type="submit">Generate</Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </BrandCanvas>
  );
}
