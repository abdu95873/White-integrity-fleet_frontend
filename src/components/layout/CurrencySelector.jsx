import { Label } from "@/components/ui/label";

/** Excel uploads are always in Romanian Lei — display is fixed to RON. */
export function CurrencySelector() {
  return (
    <div className="space-y-2 px-3">
      <Label className="text-xs text-muted-foreground">Currency</Label>
      <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted/40 px-3 text-sm font-medium">
        RON (Lei)
      </div>
    </div>
  );
}
