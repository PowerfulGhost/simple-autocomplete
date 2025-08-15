import * as vscode from 'vscode';
import { Ollama } from 'ollama';
import { resourceLimits } from 'worker_threads';

function rawString(str: string): string {
    return JSON.stringify(str).slice(1, -1);
}


export class SimpleInlineCompletionItemProvider implements vscode.InlineCompletionItemProvider {
    private debounceTimeout: NodeJS.Timeout | null = null;
    private debounceTimeInMilliseconds = vscode.workspace.getConfiguration("simple-autocomplete").get("debunceTimeMs") as number
    private ollama = new Ollama({ host: vscode.workspace.getConfiguration("simple-autocomplete").get("ollamaHost") })
    private model = vscode.workspace.getConfiguration("simple-autocomplete").get("model") as string

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
        let textAboveCursor = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
        let textBelowCursor = document.getText(new vscode.Range(position, new vscode.Position(document.lineCount, document.lineAt(document.lineCount - 1).range.end.character)));

        const prompt = `<|fim_prefix|>${textAboveCursor}<|fim_suffix|>${textBelowCursor}<|fim_middle|>`.replaceAll("\r\n", "\n"); // FIM prompt template for qwen2.5 coder
        console.log(`prompt: ${rawString(prompt)}`);

        const completionItems: vscode.InlineCompletionItem[] = [];

        try {
            const result = await this.ollama.generate({
                model: this.model,
                prompt: prompt,
                raw: true,
                stream: false,
                options: {
                    temperature: 0.3,
                    stop: ["\n"],
                    seed: 1234,
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
