import type { Project } from "./projects";

export function createPortfolioCardModel(project: Project) {
  const isCurrent = project.period.includes("현재");

  return {
    decision: project.approach[0],
    isCurrent,
    periodLabel: isCurrent
      ? project.period.replace(" - 현재", " ~")
      : project.period,
    result: project.summary,
    role: project.detail.role[0],
    stack: project.stack.slice(0, 4),
    statusLabel: isCurrent ? "NOW" : project.year,
    title: project.context,
  };
}
