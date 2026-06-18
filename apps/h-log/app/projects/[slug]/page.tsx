import { redirect } from "next/navigation";

type ProjectsRedirectPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ProjectsRedirectPage({ params }: ProjectsRedirectPageProps) {
  const { slug } = await params;

  redirect(`/portfolio/${slug}`);
}
