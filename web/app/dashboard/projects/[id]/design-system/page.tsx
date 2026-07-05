import type { Metadata } from "next";

import { DsDetail } from "@/components/design-system/ds-detail";
import { getDsProjectById } from "@/lib/design-systems";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const project = getDsProjectById(id);
  return {
    title: project ? `${project.name} · Design System` : "Design System",
  };
}

/**
 * Per-project design-system surface. Seed projects are resolved server-side and
 * passed to the client shell; runtime-extracted projects live only in the
 * browser store, so for unknown ids we still render the shell and let it resolve
 * (or show a graceful "not on this device" state) rather than 404-ing.
 */
export default async function ProjectDesignSystemPage({ params }: PageProps) {
  const { id } = await params;
  const seedProject = getDsProjectById(id);

  return <DsDetail projectId={id} seedProject={seedProject} />;
}
