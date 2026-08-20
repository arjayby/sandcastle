import { google } from "@ai-sdk/google";
import { Agent } from "@convex-dev/agent";

import { components } from "./_generated/api";

export const chatAgent = new Agent(components.agent, {
  name: "Chat Agent",
  languageModel: google("gemini-2.5-flash"),
  instructions:
    "You are a helpful AI assistant. Be concise and friendly in your responses.",
});

export const brandAgent = new Agent(components.agent, {
  name: "Brand Agent",
  languageModel: google("gemini-2.5-flash"),
  instructions:
    "You create one coherent, practical brand direction from a Brand Brief. Return only structured results that follow the supplied schema. Keep every region consistent with the provided direction and earlier region decisions.",
});
