/**
 * "Cerrar sesión" (MT-07). A plain form posting to the signOut Server Action: it works without
 * JavaScript and needs no client code.
 */
import { focusOutlineClass } from "@/components/forms/field-styles";
import { Button } from "@/components/ui/button";

import { signOut } from "../actions";

export function SignOutButton({ label }: { label: string }) {
  return (
    <form action={signOut}>
      <Button
        type="submit"
        variant="outline"
        className={`min-h-11 px-4 text-base ${focusOutlineClass}`}
      >
        {label}
      </Button>
    </form>
  );
}
