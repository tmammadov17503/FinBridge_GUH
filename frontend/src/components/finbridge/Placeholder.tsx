export function Placeholder({ label }: { label: string }) {
  return (
    <div className="grid min-h-12 place-items-center rounded-xl border-2 border-dashed border-border p-2 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}
