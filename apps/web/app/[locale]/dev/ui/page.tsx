export const metadata = { title: "Designsystem", robots: { index: false } };

export default function DevUiIndexPage() {
  return (
    <div className="flex max-w-reading flex-col gap-4">
      <h1 className="text-h1">Designsystem</h1>
      <p className="text-body">Jede Gruppe zeigt ihre Komponenten in allen Zuständen. Wähle oben eine Gruppe.</p>
    </div>
  );
}
