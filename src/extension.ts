import { spawn,exec, ChildProcessWithoutNullStreams } from 'child_process';
import * as vscode from 'vscode';
import { promisify } from 'util';

let LLM: ChildProcessWithoutNullStreams | undefined = undefined;


export async function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "LocalPythonCodingLLM" is now active!');
	// Logic for the chat Bot, simple commands.
	const handler: vscode.ChatRequestHandler = async (
	request: vscode.ChatRequest,
	context: vscode.ChatContext,
	stream: vscode.ChatResponseStream,
	token: vscode.CancellationToken
	) => {
		switch (request.command) {
			case "queryLLM":
				if(!LLMready){
					await startLLMWithChat(stream);
				}
				const testIncluded = request.prompt.includes("test");
				if(!testIncluded){
					stream.markdown("please include the word 'test' followed by assert tests for a better model response.  \n");
				}
				const response = await queryLLM(request.prompt);
				// renders it as a code with indents and everything
				stream.markdown('```bash\n');
				stream.markdown(response);
				break;
			case "startLLM":
				if(!LLMready){
				await startLLMWithChat(stream);
				}else{
					stream.markdown("LLM is already running with PID: " + LLM!.pid+"  \n");
				}
				break;
			case "stopLLM":
				stream.markdown("Stopping the LLM...  ");
				LLM?.kill();
				LLMready = false;
				stream.markdown("LLM stopped.");
				break;
			default:
			case "help":
			stream.markdown(` Here are some commands you can use:  
			- help : Show this help message  
			- queryLLM : query the LLM with a prompt  AND tests  
			- startLLM : Load the LLM and get it ready for use  
			- stopLLM : Stop the LLM process and clean up resources  
			`);			

		}
	return;
	};

	const LLMChat = vscode.chat.createChatParticipant('LocalPythonCodingLLM', handler);
	LLMChat.iconPath = vscode.Uri.joinPath(context.extensionUri,  'Images/LLM.jpeg');


	
	// set to true when the LLM is loaded and the python process responds.
	let LLMready = false;	

	// To await Terminal commands for the venv installation.
	const execAsync = promisify(exec);
	await createVenv();


	async function startLLMWithChat(stream_: vscode.ChatResponseStream) {
		stream_.progress("Starting the LLM, this may take a few seconds...   \n");
		try{
			LLM =  await startLLM(stream_);
		}
		catch (error) {
			console.error("Error starting LLM:", error);
			stream_.markdown("An error occurred while starting the LLM: " + error);
			return;
		}
		stream_.progress("LLM started with PID: " + LLM!.pid+ "  \n");
	}

	async function startLLM(stream_: vscode.ChatResponseStream): Promise<ChildProcessWithoutNullStreams> {
		  return new Promise((resolve, reject) => {
			const LLMpath = vscode.Uri.joinPath(context.extensionUri, "LLM.py").fsPath;
			const activationVenv = process.platform === "win32" ? ".LocalPythonCodingLLMEnv/Scripts/python.exe" : ".LocalPythonCodingLLMEnv/bin/python";
			console.log("activationVenv:", activationVenv);
			const PythonPath = vscode.Uri.joinPath(context.extensionUri, activationVenv).fsPath;

			const llm = spawn(PythonPath, [LLMpath],{cwd: context.extensionUri.fsPath});

			llm.stderr.on('data', (data) => {
				console.error(`LLM Error: ${data}`);
				reject(new Error(data));
			});

			llm.on('close', (code) => {
				console.log(`LLM process exited with code ${code}`);
				stream_.markdown(`LLM process exited with code ${code}. Please restart the LLM if you want to use it again.`);
				LLMready = false;
			});

			llm.stdout.once("data", (data) => {
				// Writes if CUDA is available or not.
				const message = data.toString();
				stream_.progress(message);

				// Catches the LLM is ready message.
				llm.stdout.once("data", (data) => {
					const message = data.toString();
					stream_.progress(message);
					if (message.includes("LLM is ready to receive input.")) {
						resolve(llm);
						LLMready = true;
					} else {
						reject(new Error("LLM did not become ready as expected."));
					}
				});
			});
	  	return llm;
		});
		
	}


	async function queryLLM(prompt: string): Promise<string> {
		console.log('sending prompt:', prompt);

		LLM!.stdin.write(prompt + '\n');
		return new Promise((resolve, reject) => {
			LLM!.stdout.once('data', (data) => {
				const response = data.toString().trim();
				console.log('received response:', response);
				resolve(response);
			});

			LLM!.stderr.once('data', (error) => {
				reject("An error occurred: " + error.toString());
			});
		});		
	}
	async function createVenv(){
		const venvPath  = await vscode.workspace.getWorkspaceFolder(vscode.Uri.joinPath(context.extensionUri, ".LocalPythonCodingLLMEnv"));
		// check if the virtual environment already exists
		if(await fileExists(venvPath?.uri)){
			return;
		}

		const python = await findPythonCommand();
		if(!python){
			throw new Error("neither python nor python3 seem to be in the %PATH% ");
		}

		if(!venvPath){
			// Create the virtual environment
			const result = await execAsync(`${python} -m venv .LocalPythonCodingLLMEnv`, {cwd: context.extensionUri.fsPath});
			if (result.stderr) {
				throw new Error("couldnt create a virtual enviroment to install dependecies to run LLM!");
			} 
		}
		// install the dependencies
		const modules = await execAsync(activationCommandPythonVenv()+
		" && pip install --index-url https://pypi.org/simple --extra-index-url https://download.pytorch.org/whl/cu118 -r requirements.txt"
		,  { cwd: context.extensionUri.fsPath });
	}

	async function findPythonCommand(): Promise<'python' | 'python3' | null> {
		try {
			await execAsync('python --version');
			return 'python';
		} catch {
			try {
			await execAsync('python3 --version');
			return 'python3';
			} catch {
			return null;
			}
		}
	}

	function activationCommandPythonVenv(): string{
		const operatingSystem = process.platform;
		if(operatingSystem === "win32"){
			return ".LocalPythonCodingLLMEnv\\Scripts\\activate.bat";
		}else {
			// Assuming Linux or macOS, and we also dont konw what shell the user is using.
			return ". .LocalPythonCodingLLMEnv/bin/activate";
		}
	}
	async function fileExists(uri: vscode.Uri | undefined): Promise<boolean> {
		if (!uri) {
			return false;
		}

		try {
			// This tries to stat the file. If it exists, returns file info.
			await vscode.workspace.fs.stat(uri);
			return true; // No error, file exists
		} catch (err) {
			return false; // stat failed, file does not exist
		}
}

}

export function deactivate() {
	LLM?.kill();
}




