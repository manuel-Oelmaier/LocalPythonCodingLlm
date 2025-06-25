import { request } from 'http';
import * as vscode from 'vscode';


export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "test-driven-llm" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand

	// The commandId parameter must match the command field in package.json
	context.subscriptions.push(
		vscode.commands.registerCommand('test-driven-llm.helloWorld', () => {

		vscode.window.showInformationMessage('Hello World from Test-driven-LLM!');
		})
	);

	//TODO: add python server and communication with it.
	//TODO: add function to write the code somwhere in the editor.
	//TODO: open chat command.
	

	context.subscriptions.push(
			 vscode.commands.registerCommand('test-driven-llm.detectTests',() => {
		const testController = vscode.tests.createTestController("test","TestController");
	})

	);
		

		const handler: vscode.ChatRequestHandler = async (
		request: vscode.ChatRequest,
		context: vscode.ChatContext,
		stream: vscode.ChatResponseStream,
		token: vscode.CancellationToken
		) => {
		switch (request.command) {
			case "detectTests":
				stream.markdown("Comming soon");
			case "generateCodeFromDescription":
				stream.markdown("Comming soon");
			case "generateCodeFromTests":
				stream.markdown("Comming soon");
			case "help":
				stream.markdown(` Here are some commands you can use:  
				- help : Show this help message  
				- detectTests : Detect tests in the current workspace  
				- generateCodeFromDescription : Generate code from a description  
				- generateCodeFromTests : Generates python code that passes the Tests  
				`);		

		}
		return;
	};



	const LLMChat = vscode.chat.createChatParticipant('berlin-llm', handler);
	LLMChat.iconPath = vscode.Uri.joinPath(context.extensionUri,  'LLM.jpeg');


}

export function deactivate() {}

