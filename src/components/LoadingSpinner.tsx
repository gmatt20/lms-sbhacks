export function LoadingSpinner({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center p-6">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary"></div>
      <p className="mt-4 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
