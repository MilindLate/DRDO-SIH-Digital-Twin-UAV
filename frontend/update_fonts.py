import os
import re

DIR = "/home/milind/.gemini/antigravity/scratch/digital-twin-uav-engine/frontend/src"

REPLACEMENTS = {
    r'text-\[6px\]': 'text-[clamp(6px,0.5vw,8px)]',
    r'text-\[7px\]': 'text-[clamp(7px,0.6vw,9px)]',
    r'text-\[8px\]': 'text-[clamp(8px,0.7vw,10px)]',
    r'text-\[9px\]': 'text-[clamp(9px,0.8vw,11px)]',
    r'text-\[10px\]': 'text-[clamp(10px,0.9vw,12px)]',
    r'text-\[11px\]': 'text-[clamp(11px,1vw,13px)]',
    r'text-\[12px\]': 'text-[clamp(12px,1.1vw,14px)]',
    r'text-\[13px\]': 'text-[clamp(13px,1.2vw,15px)]',
    r'text-\[14px\]': 'text-[clamp(14px,1.3vw,16px)]',
    r'text-\[15px\]': 'text-[clamp(15px,1.4vw,17px)]',
    r'text-\[16px\]': 'text-[clamp(16px,1.5vw,18px)]',
    r'text-\[18px\]': 'text-[clamp(18px,1.7vw,22px)]',
    r'text-\[20px\]': 'text-[clamp(20px,1.9vw,26px)]',
    r'text-\[24px\]': 'text-[clamp(24px,2.2vw,32px)]',
    r'text-xs': 'text-[clamp(10px,0.9vw,12px)]',
    r'text-sm': 'text-[clamp(12px,1.1vw,14px)]',
    r'text-base': 'text-[clamp(14px,1.3vw,16px)]',
    r'text-lg': 'text-[clamp(16px,1.5vw,18px)]',
    r'text-xl': 'text-[clamp(18px,1.7vw,22px)]',
    r'text-2xl': 'text-[clamp(20px,2vw,28px)]',
    r'text-3xl': 'text-[clamp(24px,2.5vw,36px)]',
    r'text-4xl': 'text-[clamp(32px,3.5vw,48px)]',
    r'text-5xl': 'text-[clamp(40px,4.5vw,60px)]',
}

for root, _, files in os.walk(DIR):
    for f in files:
        if f.endswith(('.tsx', '.ts')):
            path = os.path.join(root, f)
            with open(path, 'r') as file:
                content = file.read()
            
            orig = content
            for p, r in REPLACEMENTS.items():
                # use word boundary or similar if needed, but since it's text-[xpx] or text-xs, we can use exact match replacing.
                # regex replacement:
                content = re.sub(r'\b' + p + r'\b', r, content)
            
            if content != orig:
                with open(path, 'w') as file:
                    file.write(content)
                print(f"Updated {f}")

