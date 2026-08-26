import KnowledgePage from "@/components/user/KnowledgePage";

export const metadata = {
  title: "Recommendations | ProFormaX",
  description: "Browse ProFormaX certification recommendations.",
};

export default function RecommendationsPage() {
  return <KnowledgePage type="recommendations" />;
}
