# llm_server.py
import sys,torch
from transformers import AutoModelForCausalLM, AutoTokenizer,pipeline,BitsAndBytesConfig,logging
from peft import PeftModel
import warnings

# so somthing like: device set to use cuda:0 from auto doesnt print as output for the user !
warnings.filterwarnings("ignore")
logging.set_verbosity_error()

url = "Models/starcoder"
basemodel_name = "Models/Starcoder_base"

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_use_double_quant=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16
)
# load the quantized(reduced size in memory) basemodel
basemodel = AutoModelForCausalLM.from_pretrained(
    basemodel_name,
    quantization_config = bnb_config,
    device_map = "auto"
)

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

def generate_response(prompt:str) -> str:
    parts = prompt.split("test",1)
    prompt_build = f"""
                   ### Instruction: Write a python function based on the text, and the tests. Make sure to name it after the assert test. Please only return executable python code without assert tests.
                   ### text: Write a function to count the number of vowels in a given string
                   ### assert test:assert count_vowels("python") == 1, assert count_vowels("a") == 1
                   ### Response:
                """
    response = text_generator(prompt_build)
    gen_text = response[0]['generated_text']

    if "Response:" in gen_text:
       return gen_text.split("Response:", 1)[1].strip()
    
    return gen_text

print("LLM is ready to receive input.", flush=True)



for line in sys.stdin:
    try:
        response = generate_response(line)
        print(response, flush=True)
    except Exception as e:
        print({"error": str(e)}, flush=True,file=sys.stderr)

