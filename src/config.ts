// config.ts
import * as vscode from 'vscode';

export interface AutocompleteConfig {
    debounceTimeMs: number;
    apiBase: string;
    apiKey: string;
    model: string;
    maxLinesAbove: number;
    maxLinesBelow: number;
    promptTemplate: string;
    maxTokens: number;
    multiline: boolean;
}

export function loadConfig(): AutocompleteConfig {
    const cfg = vscode.workspace.getConfiguration("simple-autocomplete");
    return {
        debounceTimeMs: cfg.get("debounceTimeMs", 300),
        apiBase: cfg.get("apiBase", "http://127.0.0.1:8080/v1"),
        apiKey: cfg.get("apiKey", "foo"),
        model: cfg.get("model", "Qwen3 Coder 30B A3B"),
        maxLinesAbove: cfg.get("maxLinesAbove", 10),
        maxLinesBelow: cfg.get("maxLinesBelow", 2),
        promptTemplate: cfg.get("promptTemplate", "<|fim_prefix|>{textAboveCursor}<|fim_suffix|>{textBelowCursor}<|fim_middle|>"),
        maxTokens: cfg.get("maxTokens", 128),
        multiline: cfg.get("multiline", false)
    };
}