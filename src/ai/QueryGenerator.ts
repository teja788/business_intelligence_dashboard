/**
 * "Ask your data" seam (§10) — designed-for-but-deferred. v1 does NOT implement
 * this; it only defines the boundary so the feature is additive later. The
 * command palette already shows a disabled "Ask a question…" entry pointing here.
 *
 * The provider is pluggable and configured via env vars so OpenAI / Anthropic /
 * a local model can be swapped without touching callers. When building this for
 * real, default to the latest Claude models (e.g. claude-opus-4-8).
 */
import type { Field, QuerySpec } from '@/model/types';

export interface QueryGenContext {
  datasetId: string;
  fields: Field[];
}

/** The generator returns either a structured spec or raw SQL. */
export type QueryGenResult =
  | { kind: 'spec'; spec: QuerySpec; explanation?: string }
  | { kind: 'sql'; sql: string; explanation?: string };

export interface QueryGenerator {
  /** Whether a provider is configured and ready. */
  isAvailable(): boolean;
  /** Turn a natural-language question into a query against the schema. */
  generate(question: string, ctx: QueryGenContext): Promise<QueryGenResult>;
}

export type LLMProvider = 'anthropic' | 'openai' | 'local' | 'none';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  /** Base URL for 'local'/self-hosted providers. */
  baseUrl?: string;
}

/** Read provider config from env (Vite exposes VITE_*). */
export function readLLMConfig(): LLMConfig {
  const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
  const provider = (env.VITE_LLM_PROVIDER as LLMProvider) || 'none';
  const defaultModel =
    provider === 'anthropic'
      ? 'claude-opus-4-8'
      : provider === 'openai'
        ? 'gpt-4o'
        : '';
  return {
    provider,
    model: env.VITE_LLM_MODEL || defaultModel,
    baseUrl: env.VITE_LLM_BASE_URL,
  };
}

/** Default no-op generator used until a provider is wired in. */
export class NullQueryGenerator implements QueryGenerator {
  isAvailable(): boolean {
    return false;
  }
  async generate(): Promise<QueryGenResult> {
    throw new Error(
      'Ask-your-data is not configured. Set VITE_LLM_PROVIDER and implement a QueryGenerator (M6).',
    );
  }
}

let instance: QueryGenerator = new NullQueryGenerator();

/** Swap in a real generator at startup once a provider implementation exists. */
export function registerQueryGenerator(generator: QueryGenerator): void {
  instance = generator;
}
export function getQueryGenerator(): QueryGenerator {
  return instance;
}
