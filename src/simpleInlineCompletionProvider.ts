import * as vscode from 'vscode';
import { Ollama } from 'ollama';

function rawString(str: string): string {
    return JSON.stringify(str).slice(1, -1);
}

// Create a logger to output to VS Code's Output Panel
const outputChannel = vscode.window.createOutputChannel('Simple Autocomplete');

export class SimpleInlineCompletionItemProvider implements vscode.InlineCompletionItemProvider {
    private debounceTimeout: NodeJS.Timeout | null = null;
    private debounceTimeInMilliseconds = vscode.workspace.getConfiguration("simple-autocomplete").get("debunceTimeMs") as number
    private ollama = new Ollama({ host: vscode.workspace.getConfiguration("simple-autocomplete").get("ollamaHost") })
    private model = vscode.workspace.getConfiguration("simple-autocomplete").get("model") as string
    private maxLinesAbove = vscode.workspace.getConfiguration("simple-autocomplete").get("maxLinesAbove") as number
    private maxLinesBelow = vscode.workspace.getConfiguration("simple-autocomplete").get("maxLinesBelow") as number
    private promptTemplate = vscode.workspace.getConfiguration("simple-autocomplete").get("promptTemplate") as string

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

        // Truncate context based on configured length
        const maxLinesAbove = this.maxLinesAbove;
        const maxLinesBelow = this.maxLinesBelow;
        const linesAbove = textAboveCursor.split('\n');
        const linesBelow = textBelowCursor.split('\n');

        // Limit lines above cursor
        if (linesAbove.length > maxLinesAbove) {
            linesAbove.splice(0, linesAbove.length - maxLinesAbove);
            textAboveCursor = linesAbove.join('\n');
        }

        // Limit lines below cursor
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
            outputChannel.appendLine(`response: ${rawString(completion)}`);
            completionItems.push({ insertText: completion });
        }
        catch (err) {
            outputChannel.appendLine('Error while calling AI API:');
            outputChannel.appendLine(JSON.stringify(err));
        }

        return completionItems;
    }
}
