import sys,torch
import warnings


from transformers import AutoModelForCausalLM, AutoTokenizer,pipeline,logging
from peft import PeftModel
from transformers import BitsAndBytesConfig

# this is to ensure that the LLM server does not crash due to warnings
warnings.filterwarnings("ignore")
logging.set_verbosity_error()



url = "Models/starcoder"
basemodel_name = "Models/Starcoder_base"

if torch.cuda.is_available():
    print("CUDA is available! Loading the Model...", flush=True)
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_use_double_quant=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16
    )
    basemodel = AutoModelForCausalLM.from_pretrained(
        basemodel_name,
        quantization_config=bnb_config,
        device_map="auto"
    )
else:
    print("CUDA is not available, this will be very slow!\n If you have an NVIDIA GPU, please install the CUDA toolkit and restart your PC.", flush=True)
    # if cuda is not available, load the model in full precision and CPU
    try:
        basemodel = AutoModelForCausalLM.from_pretrained(basemodel_name)
    except Exception as e:
        print(f"Error loading the model: {e} \n Stoping the LLM!", flush=True)
        sys.exit(1)
#

# load the finetuned weights 
model = PeftModel.from_pretrained(basemodel, url)
model.enable_adapter_layers()

tokenizer = AutoTokenizer.from_pretrained(url)
tokenizer.pad_token = tokenizer.eos_token
tokenizer.padding_side = "right"

# finished loading model:

text_generator = pipeline(
    "text-generation",
    model=model,
    tokenizer=tokenizer,
    max_new_tokens = 256,
)

# print a message to indicate that the LLM is ready, used only on startup   
print("LLM is ready to receive input.", flush=True)

def generate_response(prompt:str) -> str:
    if "test" in prompt:
        text, tests = prompt.split("test", 1)
    else:
        text, tests = prompt, ""

    text,tests = prompt.split("test",1)
    prompt_build = f"""
                   ### Instruction: Write a python function based on the text, and the tests. Make sure to name it after the assert test. Please only return executable python code without assert tests.
                   ### text: {text}
                   ### assert test: {tests}
                   ### Response:
                """
    response = text_generator(prompt_build)
    gen_text = response[0]['generated_text']

    if "Response:" in gen_text:
       return gen_text.split("Response:", 1)[1].strip()
    
    return gen_text

for line in sys.stdin:
    try:
        
        response = ""
        # to catch the case where the LLM resposn with an empty string
        while not response:
            response = generate_response(line)
        print(response, flush=True)
    except Exception as e:
        print({"error": str(e)}, flush=True,file=sys.stderr)

