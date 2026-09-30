import os

DIR = "/home/milind/.gemini/antigravity/scratch/digital-twin-uav-engine/frontend/src"

REPLACEMENTS = {
    'text-[6px]': 'text-[clamp(6px,0.5vw,8px)]',
    'text-[7px]': 'text-[clamp(7px,0.6vw,9px)]',
    'text-[8px]': 'text-[clamp(8px,0.7vw,10px)]',
    'text-[9px]': 'text-[clamp(9px,0.8vw,11px)]',
    'text-[10px]': 'text-[clamp(10px,0.9vw,12px)]',
    'text-[11px]': 'text-[clamp(11px,1vw,13px)]',
    'text-[12px]': 'text-[clamp(12px,1.1vw,14px)]',
    'text-[13px]': 'text-[clamp(13px,1.2vw,15px)]',
    'text-[14px]': 'text-[clamp(14px,1.3vw,16px)]',
    'text-[15px]': 'text-[clamp(15px,1.4vw,17px)]',
    'text-[16px]': 'text-[clamp(16px,1.5vw,18px)]',
    'text-[18px]': 'text-[clamp(18px,1.7vw,22px)]',
    'text-[20px]': 'text-[clamp(20px,1.9vw,26px)]',
    'text-[24px]': 'text-[clamp(24px,2.2vw,32px)]',
    '"text-xs"': '"text-[clamp(10px,0.9vw,12px)]"',
    '"text-sm"': '"text-[clamp(12px,1.1vw,14px)]"',
    ' text-xs ': ' text-[clamp(10px,0.9vw,12px)] ',
    ' text-sm ': ' text-[clamp(12px,1.1vw,14px)] ',
}

for root, _, files in os.walk(DIR):
    for f in files:
        if f.endswith(('.tsx', '.ts')):
            path = os.path.join(root, f)
            with open(path, 'r') as file:
                content = file.read()
            
            orig = content
            for p, r in REPLACEMENTS.items():
                content = content.replace(p, r)
            
            if content != orig:
                with open(path, 'w') as file:
                    file.write(content)
                print(f"Updated {f}")

