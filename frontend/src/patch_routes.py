import re

# App.tsx
with open('App.tsx', 'r') as f:
    app = f.read()

app = app.replace(
    "import Page16_Configuration from './pages/Page16_Configuration'",
    "import Page16_Configuration from './pages/Page16_Configuration'\nimport Page17_2DCrossSection from './pages/Page17_2DCrossSection'"
)

app = app.replace(
    '<Route path="/configuration" element={<Page16_Configuration />} />',
    '<Route path="/configuration" element={<Page16_Configuration />} />\n            <Route path="/cross-section" element={<Page17_2DCrossSection />} />'
)

with open('App.tsx', 'w') as f:
    f.write(app)

# Sidebar.tsx
with open('components/Sidebar.tsx', 'r') as f:
    sidebar = f.read()

sidebar = sidebar.replace(
    "{ path: '/configuration', icon: <Settings size={20} />, label: 'S16 Configuration' }",
    "{ path: '/configuration', icon: <Settings size={20} />, label: 'S16 Configuration' },\n    { path: '/cross-section', icon: <Cpu size={20} />, label: 'S17 2D Cross-Section' }"
)

with open('components/Sidebar.tsx', 'w') as f:
    f.write(sidebar)

print("Routes and Sidebar patched")
