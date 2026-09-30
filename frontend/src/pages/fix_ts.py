import re

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Fix import
    content = content.replace("import useStore from '../store';", "import { useStore } from '../store';")
    
    # Fix fault.id
    content = content.replace("id: f.id,", "id: f.fault_type,")
    
    # Fix implicit any in state =>
    content = content.replace("state =>", "(state: any) =>")
    
    # Add missing types to EngineHealthState
    adapter_patch = """  expected_values: {
    egt: number;
    fuel_flow: number;
    cht: number;
    oil_pressure: number;
    vibration: number;
  };
  residuals?: any;
  rul_estimated_hours?: number;"""
    content = content.replace("  expected_values: {\n    egt: number;\n    fuel_flow: number;\n    cht: number;\n    oil_pressure: number;\n    vibration: number;\n  };", adapter_patch)

    # Add missing default values for residuals and rul
    data_patch = """    expected_values: {
      egt: 700,
      fuel_flow: 15,
      cht: 120,
      oil_pressure: 3.5,
      vibration: 2
    },
    residuals: { egt: 0 },
    rul_estimated_hours: 1500,"""
    content = content.replace("""    expected_values: {
      egt: 700,
      fuel_flow: 15,
      cht: 120,
      oil_pressure: 3.5,
      vibration: 2
    },""", data_patch)

    # Fix implicit any for parameter a
    content = content.replace("(a) => a.id", "(a: any) => a.id")

    with open(filepath, 'w') as f:
        f.write(content)

fix_file('Page03_DigitalTwin.tsx')
fix_file('Page17_2DCrossSection.tsx')
print("Fixed TS errors")
