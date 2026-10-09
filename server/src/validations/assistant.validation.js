import { z } from "zod";

export const assistantChatSchema = z.object({
  language: z.string().trim().min(2).max(60),
  tone: z.enum(["simple", "standard", "senior"]),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string().trim().min(1).max(2000),
    })
  ).min(1).max(12),
});
