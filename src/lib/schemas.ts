import { z } from "zod";

export const usageDataSchema = z.object({
  prompt_tokens: z.number().optional(),
  completion_tokens: z.number().optional(),
  total_tokens: z.number().optional(),
  cost: z.number().optional(),
  cost_details: z
    .object({
      upstream_inference_cost: z.number().optional(),
      upstream_inference_input_cost: z.number().optional(),
      upstream_inference_output_cost: z.number().optional(),
    })
    .optional(),
  completion_tokens_details: z
    .object({
      reasoning_tokens: z.number().optional(),
    })
    .optional(),
  prompt_tokens_details: z
    .object({
      cached_tokens: z.number().optional(),
      audio_tokens: z.number().optional(),
    })
    .optional(),
});

export const debateMessageSchema = z.object({
  role: z.enum(["yes", "no"]),
  model: z.string(),
  content: z.string(),
  round: z.number(),
  timestamp: z.string(),
});

export const openingStatementsSchema = z.object({
  yesStatement: debateMessageSchema,
  noStatement: debateMessageSchema,
});

export const debateRoundSchema = z.object({
  round: z.number(),
  yesMessage: debateMessageSchema,
  noMessage: debateMessageSchema,
});

export const conclusionsSchema = z.object({
  yesConclusion: debateMessageSchema,
  noConclusion: debateMessageSchema,
});

export const judgeEvaluationSchema = z.object({
  judgeModel: z.string(),
  evaluation: z.string(),
  winner: z.enum(["yes", "no", "tie"]).optional(),
  scores: z
    .object({
      yes: z.number(),
      no: z.number(),
    })
    .optional(),
  reasoning: z.string(),
});

export const finalResultSchema = z.object({
  winner: z.enum(["yes", "no", "tie"]).optional(),
  aggregateScore: z
    .object({
      yes: z.number(),
      no: z.number(),
    })
    .optional(),
});

export const savedDebateSchema = z.object({
  debateId: z.string(),
  topic: z.string(),
  yesModel: z.string(),
  noModel: z.string(),
  rounds: z.string(),
  judgePrompt: z.string(),
  openingStatements: openingStatementsSchema.optional(),
  debateRounds: z.array(debateRoundSchema),
  conclusions: conclusionsSchema.optional(),
  judgeEvaluations: z.array(judgeEvaluationSchema),
  finalResult: finalResultSchema.nullable(),
  usage: usageDataSchema.optional(),
  timestamp: z.string(),
});

export const debateConfigSchema = z.object({
  debateId: z.string(),
  topic: z.string(),
  yesModel: z.string(),
  noModel: z.string(),
  rounds: z.string(),
  judgePrompt: z.string(),
  timestamp: z.string(),
});
