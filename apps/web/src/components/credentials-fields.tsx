import { Field, FieldGroup, FieldLabel } from "@sandcastle/ui/components/field";
import { Input } from "@sandcastle/ui/components/input";

interface CredentialsFieldsProps {
  idPrefix: string;
  passwordAutoComplete: "current-password" | "new-password";
}

export default function CredentialsFields({
  idPrefix,
  passwordAutoComplete,
}: CredentialsFieldsProps) {
  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-email`}>Email</FieldLabel>
        <Input
          id={`${idPrefix}-email`}
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-password`}>Password</FieldLabel>
        <Input
          id={`${idPrefix}-password`}
          name="password"
          type="password"
          autoComplete={passwordAutoComplete}
          minLength={8}
          required
        />
      </Field>
    </FieldGroup>
  );
}
