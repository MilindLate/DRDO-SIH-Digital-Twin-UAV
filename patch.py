import re

with open('/home/milind/.gemini/antigravity/scratch/digital-twin-uav-engine/frontend/src/pages/Page03_DigitalTwin.tsx', 'r') as f:
    text = f.read()

# Replace <select> ... </select> with fixed text
text = re.sub(r'<select.*?</select>', '<span className="text-[clamp(9px,0.8vw,11px)] font-mono text-text-primary px-2 py-0.5 border border-border rounded">UAV-003 (Tactical MALE)</span>', text, flags=re.DOTALL)

# Remove UAV TOP button
text = re.sub(r'<button\s*onClick=\{[^{}]*setViewMode\(\'2d\'\)[^>]*>.*?UAV TOP.*?</button>', '', text, flags=re.DOTALL)

# Remove the UAV TOP branch from render:
# {viewMode === '2d' ? ( <UAVDiagram ... /> ) : viewMode === 'block' ? ...
text = re.sub(r'\{viewMode === \'2d\'.*?viewMode === \'block\' \? \(', '{viewMode === \'block\' ? (', text, flags=re.DOTALL)

with open('/home/milind/.gemini/antigravity/scratch/digital-twin-uav-engine/frontend/src/pages/Page03_DigitalTwin.tsx', 'w') as f:
    f.write(text)

