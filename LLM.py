# llm_server.py
import sys,torch
from transformers import AutoModelForCausalLM, AutoTokenizer,pipeline,BitsAndBytesConfig,logging

logging.set_verbosity_error()

url = "/home/focus/.cache/huggingface/hub/models--bigcode--starcoderbase-1b/snapshots/182f0165fdf8da9c9935901eec65c94337f01c11"

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_use_double_quant=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16
)
model = AutoModelForCausalLM.from_pretrained(
    url,    
    quantization_config=bnb_config,
    device_map="auto",
)

tokenizer = AutoTokenizer.from_pretrained(url)


tokenizer.pad_token = tokenizer.eos_token
model.config.pad_token_id = tokenizer.pad_token_id

text_generator = pipeline(
    "text-generation",
    model=model,
    tokenizer=tokenizer,
    max_new_tokens = 256,
)

def generate_response(prompt:str) -> str:
    response = text_generator(prompt)
    gen_text = response[0]["generated_text"]
    return gen_text

print("LLM is ready to receive input.", flush=True)


for line in sys.stdin:
    try:
        response = generate_response(line.strip())
        print(response, flush=True)
    except Exception as e:
        print({"error": str(e)}, flush=True,file=sys.stderr)

