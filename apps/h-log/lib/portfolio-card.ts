import type { Project } from "./projects";

export function createPortfolioCardModel(project: Project) {
  const isCurrent = project.period.includes("현재");

  return {
    description: project.context,
    isCurrent,
    metrics: project.metrics.map((metric) => ({
      caption: metric.description ?? metric.label,
      label: metric.label,
      value: metric.value,
    })),
    periodLabel: isCurrent
      ? project.period.replace(" - 현재", " ~")
      : project.period,
    stack: project.stack.slice(0, 4),
    statusLabel: isCurrent ? "NOW" : project.year,
  };
}
