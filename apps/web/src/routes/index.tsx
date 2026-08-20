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

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

const DESCRIPTION_GUIDANCE =
  "Tell us what your company does, who it serves, and what makes it different. You can also include the feeling you want, preferred colors, visual references, competitors, and anything the brand should avoid.";

function HomeComponent() {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");

  return (
    <BrandCanvas>
      <Card className="m-auto w-full max-w-2xl">
        <CardHeader>
          <CardTitle>
            <h1>Start with your Brand Brief</h1>
          </CardTitle>
          <CardDescription>
            Describe the company now. You will only need to sign in when you are
            ready to generate.
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
    </BrandCanvas>
  );
}
