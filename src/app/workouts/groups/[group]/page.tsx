import { notFound } from "next/navigation";
import { GROUP_SLUGS, TRAINING_GROUPS, parseGroupParam } from "@/lib/muscles";
import MuscleGroupExercises from "./MuscleGroupExercises";

export function generateStaticParams() {
  return TRAINING_GROUPS.map((key) => ({ group: GROUP_SLUGS[key] }));
}

export default async function MuscleGroupPage({
  params,
}: {
  params: Promise<{ group: string }>;
}) {
  const { group } = await params;
  const key = parseGroupParam(group);
  if (!key) notFound();
  return <MuscleGroupExercises groupKey={key} />;
}
