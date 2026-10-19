import type { Project } from "./projects";

export function createPortfolioCardModel(project: Project) {
  return {
    result: project.impact[0],
    role: project.detail.role[0],
    title: project.context,
  };
}
