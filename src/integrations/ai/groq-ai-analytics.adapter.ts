import {
  OpenAiCompatibleAiAnalyticsAdapter,
  openAiCompatibleDefaults
} from "./openai-compatible-ai-analytics.adapter";

export class GroqAiAnalyticsAdapter extends OpenAiCompatibleAiAnalyticsAdapter {
  constructor() {
    super(openAiCompatibleDefaults.groq);
  }
}

export const groqAiAnalyticsAdapter = new GroqAiAnalyticsAdapter();
