// completionProvider.ts
import * as vscode from 'vscode';
import { loadConfig, AutocompleteConfig } from './config';
import { OpenAIService } from './openaiClient';
import { buildPrompt } from './promptBuilder';
import { rawString } from './utils'
import { outputChannel } from './extension';

export class SimpleInlineCompletionItemProvider implements vscode.InlineCompletionItemProvider {
    private debounceTimeout: NodeJS.Timeout | null = null;
    private config: AutocompleteConfig;
    private openaiService: OpenAIService;

    constructor() {
        this.config = loadConfig();
        this.openaiService = new OpenAIService(this.config);
    }

    provideInlineCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position
    ): Promise<vscode.InlineCompletionList> {
        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
        }

        return new Promise((resolve) => {
            this.debounceTimeout = setTimeout(async () => {
                const items = await this.fetchCompletionItems(document, position);
                resolve({ items });
            }, this.config.debounceTimeMs);
        });
    }

    private async fetchCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position
    ): Promise<vscode.InlineCompletionItem[]> {
        const prompt = buildPrompt(document, position, this.config);
        outputChannel.appendLine(`prompt: ${rawString(prompt)}`);

        try {
            const completion = await this.openaiService.complete(prompt, this.config);
            outputChannel.appendLine(`response: ${rawString(completion)}`);
            return [{ insertText: completion }];
        } catch (err: any) {
            this.handleError(err);
            return [];
        }
    }

    private handleError(err: any): void {
        outputChannel.appendLine('Error while calling OpenAI API:');
        outputChannel.appendLine(err.message || JSON.stringify(err));

        if (err.status === 401) {
            vscode.window.showErrorMessage('Invalid OpenAI API key. Please check your configuration.');
        } else if (err.status === 404 && this.config.apiBase) {
            vscode.window.showErrorMessage(`API endpoint not found: ${this.config.apiBase}`);
        } else if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
            vscode.window.showErrorMessage(`Connection error to API endpoint.`);
        }
    }
}