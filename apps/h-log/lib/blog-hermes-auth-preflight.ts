export function assertHermesOpenAiCodexAuthenticated(output: string): void {
  if (!/^openai-codex:\s+logged in\b/imu.test(output)) {
    throw new Error("Hermes OpenAI Codex OAuth is not authenticated");
  }
}
