import type { AiAnalyticsProvider } from "../../modules/system-settings/types/system-settings.types";
import { groqAiAnalyticsAdapter } from "./groq-ai-analytics.adapter";
import { openAiAnalyticsAdapter } from "./openai-ai-analytics.adapter";
import type { AiAnalyticsProviderPort } from "./types/ai-analytics-provider.types";

export interface ResolvedAiAnalyticsProviders {
  primarySelection: AiAnalyticsProvider;
  fallbackSelection: AiAnalyticsProvider;
  primaryProvider: AiAnalyticsProviderPort | null;
  fallbackProvider: AiAnalyticsProviderPort | null;
}

export interface AiAnalyticsProviderResolverPort {
  resolve(
    primaryProvider: AiAnalyticsProvider,
    fallbackProvider: AiAnalyticsProvider
  ): ResolvedAiAnalyticsProviders;
}

export class AiAnalyticsProviderResolver implements AiAnalyticsProviderResolverPort {
  constructor(
    private readonly openai: AiAnalyticsProviderPort = openAiAnalyticsAdapter,
    private readonly groq: AiAnalyticsProviderPort = groqAiAnalyticsAdapter
  ) {}

  resolve(
    primaryProvider: AiAnalyticsProvider,
    fallbackProvider: AiAnalyticsProvider
  ): ResolvedAiAnalyticsProviders {
    const primary = primaryProvider === "openai" ? this.openai : this.groq;
    const fallback = fallbackProvider === "openai" ? this.openai : this.groq;

    return {
      primarySelection: primaryProvider,
      fallbackSelection: fallbackProvider,
      primaryProvider: primary.isConfigured() ? primary : null,
      fallbackProvider:
        fallbackProvider !== primaryProvider && fallback.isConfigured() ? fallback : null
    };
  }
}

export const aiAnalyticsProviderResolver = new AiAnalyticsProviderResolver();
