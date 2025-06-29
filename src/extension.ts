import { spawn } from 'child_process';
import { assert } from 'console';
import * as vscode from 'vscode';


export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "LocalPythonCodingLLM" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand

	// The commandId parameter must match the command field in package.json
	context.subscriptions.push(
		vscode.commands.registerCommand('LocalPythonCodingLLM.helloWorld', () => {

		vscode.window.showInformationMessage('Hello World from LocalPythonCodingLLM');
		})
	);

	//TODO: add python server and communication with it.
	//TODO: add function to write the code somwhere in the editor.
	//TODO: open chat command.
	let LLM = startLLM();
	let LLMready = false;

	context.subscriptions.push(
			 vscode.commands.registerCommand('LocalPythonCodingLLM.detectTests',() => {
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
			case "queryLLM":
				if(!LLMready){
					stream.markdown("Starting the LLM...\n");
					LLM = startLLM();
					stream.markdown("LLM started with PID: " + LLM.pid+ "\n");
				}
				const response = await queryLLM(request.prompt);
				stream.markdown(response);
				break;
			case "startLLM":
				stream.markdown("Starting the LLM...\n");
				stream.markdown("LLM started with PID: " + LLM.pid+ "\n");
				break;
			case "stopLLM":
				stream.markdown("Stopping the LLM...");
				LLM.kill();
				LLMready = false;
				stream.markdown("LLM stopped.");
				break;
			default:
			case "help":
			stream.markdown(` Here are some commands you can use:  
			- help : Show this help message  
			- detectTests : Detect tests in the current workspace  
			- queryLLM : query the LLM with a prompt  
			- startLLM : Load the LLM and get it ready for use
			- stopLLM : Stop the LLM process and clean up resources
			`);			

		}
		return;
	};


	const LLMChat = vscode.chat.createChatParticipant('LocalPythonCodingLLM', handler);
	LLMChat.iconPath = vscode.Uri.joinPath(context.extensionUri,  'LLM.jpeg');


		// TODO: get python version with correct installs


	

	 function startLLM() {

		const LLMpath = vscode.Uri.joinPath(context.extensionUri, 'LLM.py').fsPath;
		const PythonvenvPath = vscode.Uri.joinPath(context.extensionUri, '.venv/bin/python').fsPath;

		const llm = spawn(PythonvenvPath, [LLMpath]);
		llm.stderr.on('data', (data) => {
			console.error(`LLM Error: ${data}`);
		});

		llm.on('close', (code) => {
			console.log(`LLM process exited with code ${code}`);
		});
		llm.stdout.once('data', (data) => {
			LLMready = data.includes("LLM is ready to receive input.");
		});
		return llm;

	}

	async function queryLLM(prompt: string): Promise<string> {
		console.log('sending prompt:', prompt);

		LLM.stdin.write(prompt + '\n');
		return new Promise((resolve, reject) => {
			LLM.stdout.once('data', (data) => {
				const response = data.toString().trim();
				console.log('received response:', response);
				resolve(response);
			});

			LLM.stderr.once('data', (error) => {
				reject("An error occurred: " + error.toString());
			});
		});		
	}







}

export function deactivate() {}




