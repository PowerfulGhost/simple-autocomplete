import * as vscode from 'vscode';
import { Ollama } from 'ollama';
import { resourceLimits } from 'worker_threads';

function rawString(str: string): string {
    return JSON.stringify(str).slice(1, -1);
}


export class SimpleInlineCompletionItemProvider implements vscode.InlineCompletionItemProvider {
    private debounceTimeout: NodeJS.Timeout | null = null;
    private debounceTimeInMilliseconds = 500;
    private ollama = new Ollama({ host: "http://127.0.0.1:16384" })

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

        // process context for the prompt
        const contextWindow = 500; // TODO: Implement context window control

        let textAboveCursor = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
        let textBelowCursor = document.getText(new vscode.Range(position, new vscode.Position(document.lineCount, document.lineAt(document.lineCount - 1).range.end.character)));

        const prompt = `<|fim_prefix|>${textAboveCursor}<|fim_suffix|>${textBelowCursor}<|fim_middle|>`.replaceAll("\r\n", "\n"); // TODO: Implement custom prompt template config
        console.log(`prompt: ${rawString(prompt)}`);

        const completionItems: vscode.InlineCompletionItem[] = [];

        try {
            const result = await this.ollama.generate({
                model: "qwen2.5-coder:latest",
                prompt: prompt,
                raw: true,
                stream: false,
                options: {
                    temperature: 0.3,
                    stop: ["\n"],
                    seed: 1234,
                    num_ctx: 8192,
                }
            });
            let completion = result.response.replaceAll("\r\n", "\n")
            console.log(`response: ${rawString(completion)}`);
            completionItems.push({ insertText: completion });
        }
        catch (err) {
            console.error('Error while calling AI API:', err);
        }

        return completionItems;
    }
}
