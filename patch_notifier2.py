import re

with open('/home/milind/.gemini/antigravity/scratch/digital-twin-uav-engine/frontend/src/components/FaultNotifier.tsx', 'r') as f:
    text = f.read()

text = text.replace('(fault.id || fault.fault_id || "")', '(fault.fault_id || fault.timestamp || "")')
text = text.replace('fault.confidence)', '(fault.confidence || 0.8))')

with open('/home/milind/.gemini/antigravity/scratch/digital-twin-uav-engine/frontend/src/components/FaultNotifier.tsx', 'w') as f:
    f.write(text)

