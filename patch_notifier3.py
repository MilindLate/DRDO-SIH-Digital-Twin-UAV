import re

with open('/home/milind/.gemini/antigravity/scratch/digital-twin-uav-engine/frontend/src/components/FaultNotifier.tsx', 'r') as f:
    text = f.read()

text = text.replace('(fault.fault_id || fault.timestamp || "")', '(fault.fault_id || String(Math.random()))')

with open('/home/milind/.gemini/antigravity/scratch/digital-twin-uav-engine/frontend/src/components/FaultNotifier.tsx', 'w') as f:
    f.write(text)

