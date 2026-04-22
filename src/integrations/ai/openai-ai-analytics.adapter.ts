import {
  OpenAiCompatibleAiAnalyticsAdapter,
  openAiCompatibleDefaults
} from "./openai-compatible-ai-analytics.adapter";

export class OpenAiAnalyticsAdapter extends OpenAiCompatibleAiAnalyticsAdapter {
  constructor() {
    super(openAiCompatibleDefaults.openai);
  }
}

export const openAiAnalyticsAdapter = new OpenAiAnalyticsAdapter();
