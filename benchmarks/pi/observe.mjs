import { appendFileSync } from 'node:fs';
import { join } from 'node:path';

// Loaded last in both arms. Observation only: no return value, tools, or mutations.
export default function observe(pi) {
  pi.on('before_provider_request', ({ payload }, ctx) => {
    const record = {
      runtime: {
        node: process.version,
        provider: ctx.model?.provider,
        model: ctx.model?.id,
        reasoning: pi.getThinkingLevel(),
        contextWindow: ctx.model?.contextWindow,
        maxTokens: ctx.model?.maxTokens,
        compaction: ctx.getCompactionSettings?.() ?? null,
        tools: pi.getActiveTools().toSorted(),
      },
      // Responses payload fields only; never headers, auth, environment, or model config.
      request: {
        model: payload.model,
        instructions: payload.instructions ?? null,
        systemMessages: Array.isArray(payload.input)
          ? payload.input.filter(item => ['system', 'developer'].includes(item.role)) : [],
        reasoning: payload.reasoning ?? null,
        maxOutputTokens: payload.max_output_tokens ?? null,
        serviceTier: payload.service_tier ?? null,
        temperature: payload.temperature ?? null,
        text: payload.text ?? null,
        tools: payload.tools?.map(tool => tool.name) ?? [],
      },
    };
    appendFileSync(join(process.env.PONYTAIL_EVAL_ARTIFACT_DIR, 'requests.jsonl'), `${JSON.stringify(record)}\n`);
  });
}
