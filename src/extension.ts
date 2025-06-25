import { spawn } from 'child_process';
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
				break;
			case "generateCodeFromDescription":
			case "generateCodeFromTests":
				const response = await queryLLM(request.prompt);
				stream.markdown(response);
				break;
			case "help":
				stream.markdown(` Here are some commands you can use:  
				- help : Show this help message  
				- detectTests : Detect tests in the current workspace  
				- generateCodeFromDescription : Generate code from a description  
				- generateCodeFromTests : Generates python code that passes the Tests  
				`);
				break;		

		}
		return;
	};



	const LLMChat = vscode.chat.createChatParticipant('berlin-llm', handler);
	LLMChat.iconPath = vscode.Uri.joinPath(context.extensionUri,  'LLM.jpeg');

	const LLMpath = vscode.Uri.joinPath(context.extensionUri, 'LLM.py').fsPath;
	const PythonvenvPath = vscode.Uri.joinPath(context.extensionUri, '.venv/bin/python').fsPath;
	const LLM = spawn(PythonvenvPath, [LLMpath]);

	// toDO create a virtual environment and install the requirements.

	console.log(`LLM PID: ${LLM.pid}`);

		LLM.stderr.on('data', (data) => {
			console.error(`LLM Error: ${data}`);
		});

		LLM.on('close', (code) => {
			console.log(`LLM process exited with code ${code}`);
		});

	async function queryLLM(prompt: string): Promise<string> {
		console.log('Received prompt:', prompt);

		LLM.stdin.write(JSON.stringify(prompt) + '\n');
		return new Promise((resolve, reject) => {
			LLM.stdout.once('data', (data) => {
				const response = data.toString().trim();
				resolve(response);
			});

			LLM.stderr.once('data', (error) => {
				reject(error.toString());
			});
		});		
	}







}

export function deactivate() {}




