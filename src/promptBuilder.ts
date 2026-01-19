// promptBuilder.ts
import * as vscode from 'vscode';
import { AutocompleteConfig } from './config';

export function buildPrompt(document: vscode.TextDocument, position: vscode.Position, config: AutocompleteConfig): string {
    const rangeAbove = new vscode.Range(new vscode.Position(0, 0), position);
    const rangeBelow = new vscode.Range(position, document.lineAt(document.lineCount - 1).range.end);

    let textAbove = document.getText(rangeAbove);
    let textBelow = document.getText(rangeBelow);

    const linesAbove = textAbove.split('\n');
    const linesBelow = textBelow.split('\n');

    if (linesAbove.length > config.maxLinesAbove) {
        textAbove = linesAbove.slice(-config.maxLinesAbove).join('\n');
    }
    if (linesBelow.length > config.maxLinesBelow) {
        textBelow = linesBelow.slice(0, config.maxLinesBelow).join('\n');
    }

    return config.promptTemplate
        .replace('{textAboveCursor}', textAbove)
        .replace('{textBelowCursor}', textBelow)
        .replaceAll("\r\n", "\n");
}
