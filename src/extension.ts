import * as vscode from 'vscode';
import { SimpleInlineCompletionItemProvider } from "./completionProvider";
export const outputChannel = vscode.window.createOutputChannel('Simple Autocomplete');

export function activate(context: vscode.ExtensionContext) {

	let providerDisposable: vscode.Disposable | undefined;

	// Status bar item creation
	let statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.command = 'simple-autocomplete.toggleActivate';
	statusBarItem.show();
	context.subscriptions.push(statusBarItem);

	// Command registration
	let disposable = vscode.commands.registerCommand('simple-autocomplete.toggleActivate', function () {
		let activated = context.globalState.get('simple-autocomplete-activated') || false;
		activated = !activated; // toggle the activation state

		context.globalState.update('simple-autocomplete-activated', activated);

		if (activated) {
			const provider = new SimpleInlineCompletionItemProvider();
			providerDisposable = vscode.languages.registerInlineCompletionItemProvider(
				{ scheme: 'file', language: '*' },
				provider
			);
			context.subscriptions.push(providerDisposable);
			statusBarItem.text = 'SAC: √'; // Change status bar text
		} else {
			if (providerDisposable) {
				providerDisposable.dispose(); // unregister the provider
				const index = context.subscriptions.indexOf(providerDisposable);
				if (index > -1) {
					context.subscriptions.splice(index, 1);
				}
				providerDisposable = undefined;
			}
			statusBarItem.text = 'SAC: ×'; // Change status bar text
		}
	});
	context.subscriptions.push(disposable);

	statusBarItem.text = 'SAC: ×';
}
