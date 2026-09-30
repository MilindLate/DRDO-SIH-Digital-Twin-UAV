import re

with open('/home/milind/.gemini/antigravity/scratch/digital-twin-uav-engine/frontend/src/components/FaultNotifier.tsx', 'r') as f:
    text = f.read()

text = text.replace('fault.fault_id', '(fault.id || fault.fault_id || "")')
text = text.replace('recommended_action', 'recommended_inspection')
text = text.replace('api.xai.getMaintenanceRationale(fault.fault_type, fault.confidence).then(res =>', 'api.xai.getMaintenanceRationale(fault.fault_type, fault.confidence).then((res: any) =>')

with open('/home/milind/.gemini/antigravity/scratch/digital-twin-uav-engine/frontend/src/components/FaultNotifier.tsx', 'w') as f:
    f.write(text)

