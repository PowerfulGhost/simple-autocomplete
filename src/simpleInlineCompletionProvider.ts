import * as vscode from 'vscode';
import OpenAI from 'openai';  // 使用 OpenAI SDK

function rawString(str: string): string {
    return JSON.stringify(str).slice(1, -1);
}

const outputChannel = vscode.window.createOutputChannel('Simple Autocomplete');

export class SimpleInlineCompletionItemProvider implements vscode.InlineCompletionItemProvider {
    private debounceTimeout: NodeJS.Timeout | null = null;
    private debounceTimeInMilliseconds = vscode.workspace.getConfiguration("simple-autocomplete").get("debounceTimeMs") as number;
    private openai: OpenAI;  // 使用 OpenAI 实例
    private apiBase = vscode.workspace.getConfiguration("simple-autocomplete").get("apiBase") as string;
    private apiKey = vscode.workspace.getConfiguration("simple-autocomplete").get("apiKey") as string;
    private model = vscode.workspace.getConfiguration("simple-autocomplete").get("model") as string;
    private maxLinesAbove = vscode.workspace.getConfiguration("simple-autocomplete").get("maxLinesAbove") as number;
    private maxLinesBelow = vscode.workspace.getConfiguration("simple-autocomplete").get("maxLinesBelow") as number;
    private promptTemplate = vscode.workspace.getConfiguration("simple-autocomplete").get("promptTemplate") as string;
    private maxTokens = vscode.workspace.getConfiguration("simple-autocomplete").get("maxTokens") as number;
    private multiline = vscode.workspace.getConfiguration("simple-autocomplete").get("multiline") as boolean;

    constructor() {
        // 初始化 OpenAI 客户端
        // fix me
        this.openai = new OpenAI({
            apiKey: this.apiKey,
            baseURL: this.apiBase || undefined, // 如果为空则使用默认 OpenAI 地址
            dangerouslyAllowBrowser: false, // 明确设置环境（Node.js）
            defaultHeaders: { 'Content-Type': 'application/json' },
            timeout: 30_000,
        });
    }

    provideInlineCompletionItems(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.InlineCompletionList> {
        if (this.debounceTimeout) {
            clearTimeout(this.debounceTimeout);
        }

        return new Promise((resolve) => {
            this.debounceTimeout = setTimeout(async () => {
                const completionItems = await this.fetchCompletionItems(document, position);
                resolve({ items: completionItems });
            }, this.debounceTimeInMilliseconds);
        });
    }

    private async fetchCompletionItems(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.InlineCompletionItem[]> {
        let textAboveCursor = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
        let textBelowCursor = document.getText(new vscode.Range(position, new vscode.Position(document.lineCount, document.lineAt(document.lineCount - 1).range.end.character)));

        const maxLinesAbove = this.maxLinesAbove;
        const maxLinesBelow = this.maxLinesBelow;
        const linesAbove = textAboveCursor.split('\n');
        const linesBelow = textBelowCursor.split('\n');

        if (linesAbove.length > maxLinesAbove) {
            linesAbove.splice(0, linesAbove.length - maxLinesAbove);
            textAboveCursor = linesAbove.join('\n');
        }

        if (linesBelow.length > maxLinesBelow) {
            linesBelow.splice(linesBelow.length - maxLinesBelow, linesBelow.length);
            textBelowCursor = linesBelow.join('\n');
        }

        const prompt = this.promptTemplate
            .replace('{textAboveCursor}', textAboveCursor)
            .replace('{textBelowCursor}', textBelowCursor)
            .replaceAll("\r\n", "\n");
        outputChannel.appendLine(`prompt: ${rawString(prompt)}`);

        const completionItems: vscode.InlineCompletionItem[] = [];

        try {
            // 使用 OpenAI Completions API
            let stopSeq = this.multiline ? "\n\n" : "\n";
            outputChannel.appendLine(`stopSeq: ${rawString(stopSeq)}`);
            const response = await this.openai.completions.create({
                model: this.model,
                prompt: prompt,
                temperature: 0.3,
                max_tokens: this.maxTokens,
                stop: [stopSeq],
                seed: 1234
            });

            let completion = response.choices[0].text.replaceAll("\r\n", "\n");
            outputChannel.appendLine(`response: ${rawString(completion)}`);
            completionItems.push({ insertText: completion });
        }
        catch (err: any) {
            outputChannel.appendLine('Error while calling OpenAI API:');
            outputChannel.appendLine(err.message || JSON.stringify(err));

            // 增强错误处理
            if (err.status === 401) {
                vscode.window.showErrorMessage('Invalid OpenAI API key. Please check your configuration.');
            } else if (err.status === 404 && this.apiBase) {
                vscode.window.showErrorMessage(`API endpoint not found. Check your API Base URL: ${this.apiBase}`);
            } else if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
                vscode.window.showErrorMessage(`Connection error to API endpoint: ${this.apiBase || 'default OpenAI endpoint'}`);
            }
        }

        return completionItems;
    }
}