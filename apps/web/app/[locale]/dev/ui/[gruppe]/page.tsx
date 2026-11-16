import { notFound } from "next/navigation";
import { UI_GROUP_TITLES, isUiGroup } from "@/features/dev-ui/groups";
import { loadSection } from "@/features/dev-ui/section-loader";

export const metadata = { title: "Designsystem", robots: { index: false } };

export default async function DevUiGroupPage({ params }: PageProps<"/[locale]/dev/ui/[gruppe]">) {
  const { gruppe } = await params;
  if (!isUiGroup(gruppe)) notFound();
  const Section = await loadSection(gruppe);
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-h1">{UI_GROUP_TITLES[gruppe]}</h1>
      <Section />
    </div>
  );
}
