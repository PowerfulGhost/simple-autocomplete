// openaiClient.ts
import OpenAI from 'openai';
import { AutocompleteConfig } from './config';

export class OpenAIService {
    private client: OpenAI;

    constructor(config: AutocompleteConfig) {
        this.client = new OpenAI({
            apiKey: config.apiKey,
            baseURL: config.apiBase || undefined,
            dangerouslyAllowBrowser: false,
            defaultHeaders: { 'Content-Type': 'application/json' },
            timeout: 30_000,
        });
    }

    async complete(prompt: string, config: AutocompleteConfig): Promise<string> {
        const stopSeq = config.multiline ? "\n\n" : "\n";
        const response = await this.client.completions.create({
            model: config.model,
            prompt,
            temperature: 0.3,
            max_tokens: config.maxTokens,
            stop: [stopSeq],
            seed: 1234
        });

        return response.choices[0].text.replaceAll("\r\n", "\n");
    }
}