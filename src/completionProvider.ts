// completionProvider.ts
import * as vscode from 'vscode';
import { loadConfig, AutocompleteConfig } from './config';
import { OpenAIService } from './openaiClient';
import { buildPrompt } from './promptBuilder';
import { rawString } from './utils';
import { outputChannel } from './extension';
import { CompletionCacheManager } from './cacheManager'; // 新增导入

export class SimpleInlineCompletionItemProvider implements vscode.InlineCompletionItemProvider {
    private debounceTimeout: NodeJS.Timeout | null = null;
    private config: AutocompleteConfig;
    private openaiService: OpenAIService;
    private cacheManager = new CompletionCacheManager(); // 初始化缓存管理器

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
        const rangeAbove = new vscode.Range(new vscode.Position(0, 0), position);
        let textAboveCursor = document.getText(rangeAbove);
        
        // 1. 优先尝试从缓存获取
        const cachedLine = this.cacheManager.getLineIfMatch(textAboveCursor);
        if (cachedLine !== null) {
            outputChannel.appendLine(`Cache hit: ${rawString(cachedLine)}`);
            return [{ insertText: cachedLine }];
        }

        // 2. 构建 prompt
        const prompt = buildPrompt(document, position, this.config);
        outputChannel.appendLine(`prompt: ${rawString(prompt)}`);

        try {
            // 3. 始终使用 \n\n 作为 stop token
            const fullCompletion = await this.openaiService.completeWithMultilineStop(prompt, this.config);
            outputChannel.appendLine(`full response: ${rawString(fullCompletion)}`);

            // 4. 处理响应
            if (this.config.multiline) {
                // 多行模式：直接返回全部
                return [{ insertText: fullCompletion }];
            } else {
                // 单行模式：分割行
                const lines = fullCompletion.split('\n');
                const firstLine = lines[0];
                
                // 5. 缓存剩余内容（如果有）
                if (lines.length > 1) {
                    this.cacheManager.store(textAboveCursor, fullCompletion);
                    outputChannel.appendLine(`Cached remaining content: ${rawString(lines.slice(1).join('\n'))}`);
                }
                
                return [{ insertText: firstLine }];
            }
        } catch (err: any) {
            this.cacheManager.clear(); // 出错时清除缓存
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