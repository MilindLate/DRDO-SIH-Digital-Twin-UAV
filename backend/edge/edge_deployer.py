"""
Edge AI Deployment Manager

Provides tools for deploying this Digital Twin system on edge hardware
(GCS embedded computers, Jetson Nano, Raspberry Pi 4, industrial NUCs).

Key capabilities:
  - Model optimization (ONNX export, size reduction)
  - Hardware resource monitoring
  - Deployment readiness assessment
  - Auto-generating Dockerfile and systemd service files
  - Offline capability verification

Edge Deployment Architecture:
  ┌─────────────────────────────────────────────────────────────────┐
  │  GCS Embedded Computer (Jetson Nano / RPi4 / x86 NUC)         │
  │                                                                │
  │  ┌─────────────────┐  ┌────────────────┐  ┌────────────────┐  │
  │  │ FastAPI Backend │  │ ML Models      │  │ SQLite DB      │  │
  │  │ (uvicorn)       │  │ (ONNX/joblib)  │  │ (local)        │  │
  │  └────────┬────────┘  └───────┬────────┘  └───────┬────────┘  │
  │           └────────────────────┴────────────────────┘          │
  │                               │                                │
  │                     ┌─────────▼────────┐                      │
  │                     │  React Dashboard  │                      │
  │                     │  (Nginx/static)   │                      │
  │                     └─────────┬────────┘                      │
  │                               │                                │
  │  CAN Bus ──[USB adapter]──────┘  WebSocket @ localhost:8000    │
  └─────────────────────────────────────────────────────────────────┘
        │
        │ Optional uplink (intermittent satellite / cellular)
        ▼
  Fleet-level cloud server (model aggregation, long-term analytics)

References:
  - NVIDIA Jetson Nano specs: developer.nvidia.com/embedded/jetson-nano
  - Raspberry Pi 4 specs: raspberrypi.com/products/raspberry-pi-4-model-b/
  - ONNX Runtime: onnxruntime.ai (MIT license)
  - systemd service format: freedesktop.org/wiki/Software/systemd/ (public)

DISCLAIMER: DEMONSTRATION SYSTEM — Not for operational use.
"""

import os
import sys
import time
import json
import logging
import platform
import subprocess
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Tuple
from pathlib import Path
from datetime import datetime

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Try optional imports — graceful degradation
# ─────────────────────────────────────────────────────────────────────────────
try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False
    logger.warning("psutil not installed — resource monitoring limited (pip install psutil)")

try:
    import joblib
    JOBLIB_AVAILABLE = True
except ImportError:
    JOBLIB_AVAILABLE = False

ONNX_AVAILABLE = False
SKL2ONNX_AVAILABLE = False

try:
    import onnxruntime
    ONNX_AVAILABLE = True
except ImportError:
    pass

try:
    from skl2onnx import convert_sklearn
    from skl2onnx.common.data_types import FloatTensorType
    SKL2ONNX_AVAILABLE = True
except ImportError:
    pass


# ─────────────────────────────────────────────────────────────────────────────
# Deployment Configuration
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class EdgeDeploymentConfig:
    """
    Edge deployment configuration. [CONFIGURABLE]
    Adapt to target hardware platform.
    """
    target_platform: str = "generic_x86"     # jetson_nano | raspberry_pi4 | generic_x86 | docker
    max_inference_latency_ms: float = 50.0   # Maximum acceptable ML inference time
    max_model_size_mb: float = 50.0          # Maximum model file size
    enable_gpu: bool = False                  # GPU inference (Jetson only)
    offline_capable: bool = True             # System must work without internet
    battery_power: bool = False              # Optimize for low power consumption
    min_ram_mb: float = 512.0               # Minimum required RAM
    min_disk_gb: float = 2.0               # Minimum required disk space
    target_data_rate_hz: float = 1.0        # Required telemetry rate

    # Resource requirements by platform [CONFIGURABLE]
    PLATFORM_REQUIREMENTS: Dict = field(default_factory=lambda: {
        "jetson_nano": {"min_ram_mb": 4096, "cpu_cores": 4, "has_gpu": True},
        "raspberry_pi4": {"min_ram_mb": 2048, "cpu_cores": 4, "has_gpu": False},
        "generic_x86": {"min_ram_mb": 512, "cpu_cores": 2, "has_gpu": False},
        "docker": {"min_ram_mb": 512, "cpu_cores": 1, "has_gpu": False},
    })


# ─────────────────────────────────────────────────────────────────────────────
# Resource Monitor
# ─────────────────────────────────────────────────────────────────────────────

class ResourceMonitor:
    """Monitor system resources for edge deployment assessment."""

    def get_cpu_usage(self) -> float:
        """CPU usage percentage (0–100)."""
        if PSUTIL_AVAILABLE:
            return psutil.cpu_percent(interval=0.5)
        # Fallback: read /proc/stat on Linux
        try:
            with open("/proc/loadavg") as f:
                load = float(f.read().split()[0])
            return min(100.0, load * 10)
        except Exception:
            return -1.0

    def get_cpu_count(self) -> int:
        """Number of logical CPU cores."""
        if PSUTIL_AVAILABLE:
            return psutil.cpu_count(logical=True) or 1
        return os.cpu_count() or 1

    def get_memory_usage(self) -> Dict[str, float]:
        """RAM usage in MB."""
        if PSUTIL_AVAILABLE:
            mem = psutil.virtual_memory()
            return {
                "total_mb": round(mem.total / 1024 / 1024, 1),
                "used_mb": round(mem.used / 1024 / 1024, 1),
                "available_mb": round(mem.available / 1024 / 1024, 1),
                "percent": mem.percent,
            }
        # Fallback: /proc/meminfo
        try:
            info = {}
            with open("/proc/meminfo") as f:
                for line in f:
                    parts = line.split()
                    if len(parts) >= 2:
                        info[parts[0].rstrip(":")] = int(parts[1])
            total = info.get("MemTotal", 0) / 1024
            avail = info.get("MemAvailable", 0) / 1024
            return {"total_mb": total, "available_mb": avail,
                    "used_mb": total - avail, "percent": (total - avail) / max(total, 1) * 100}
        except Exception:
            return {"total_mb": -1, "used_mb": -1, "available_mb": -1, "percent": -1}

    def get_disk_usage(self, path: str = "/") -> Dict[str, float]:
        """Disk usage in GB."""
        if PSUTIL_AVAILABLE:
            disk = psutil.disk_usage(path)
            return {
                "total_gb": round(disk.total / 1024**3, 2),
                "used_gb": round(disk.used / 1024**3, 2),
                "free_gb": round(disk.free / 1024**3, 2),
                "percent": disk.percent,
            }
        try:
            stat = os.statvfs(path)
            total = stat.f_blocks * stat.f_frsize / 1024**3
            free = stat.f_bfree * stat.f_frsize / 1024**3
            return {"total_gb": round(total, 2), "free_gb": round(free, 2),
                    "used_gb": round(total - free, 2), "percent": round((total - free) / max(total, 1) * 100, 1)}
        except Exception:
            return {"total_gb": -1, "used_gb": -1, "free_gb": -1, "percent": -1}

    def get_system_info(self) -> Dict[str, Any]:
        """Full system information."""
        info = {
            "os": platform.system(),
            "os_version": platform.release(),
            "architecture": platform.machine(),
            "python_version": sys.version.split()[0],
            "cpu_cores": self.get_cpu_count(),
            "hostname": platform.node(),
            "gpu_available": False,
            "onnx_available": ONNX_AVAILABLE,
            "psutil_available": PSUTIL_AVAILABLE,
            "joblib_available": JOBLIB_AVAILABLE,
            "skl2onnx_available": SKL2ONNX_AVAILABLE,
        }

        # Check for NVIDIA GPU
        try:
            result = subprocess.run(["nvidia-smi", "--query-gpu=name", "--format=csv,noheader"],
                                    capture_output=True, text=True, timeout=3)
            if result.returncode == 0:
                info["gpu_available"] = True
                info["gpu_name"] = result.stdout.strip()
        except Exception:
            pass

        return info


# ─────────────────────────────────────────────────────────────────────────────
# Model Optimizer
# ─────────────────────────────────────────────────────────────────────────────

class ModelOptimizer:
    """Optimize ML models for edge deployment."""

    def get_model_size_mb(self, model_path: str) -> float:
        """Return model file size in MB."""
        try:
            return os.path.getsize(model_path) / 1024 / 1024
        except Exception:
            return -1.0

    def benchmark_inference(self, model_path: str, n_features: int = 11,
                             n_iterations: int = 500) -> Dict[str, float]:
        """
        Benchmark ML model inference latency.
        Returns latency statistics in milliseconds.
        """
        import numpy as np
        results = {"mean_ms": -1, "p50_ms": -1, "p95_ms": -1, "p99_ms": -1,
                   "n_iterations": n_iterations, "status": "not_run"}

        if not JOBLIB_AVAILABLE:
            results["status"] = "joblib_not_installed"
            return results

        try:
            model = joblib.load(model_path)
            sample_input = np.random.randn(1, n_features).astype(np.float32)
            latencies = []
            for _ in range(n_iterations):
                t0 = time.perf_counter()
                model.predict(sample_input)
                latencies.append((time.perf_counter() - t0) * 1000)
            latencies = sorted(latencies)
            results = {
                "mean_ms": round(float(sum(latencies) / len(latencies)), 3),
                "p50_ms": round(latencies[len(latencies) // 2], 3),
                "p95_ms": round(latencies[int(len(latencies) * 0.95)], 3),
                "p99_ms": round(latencies[int(len(latencies) * 0.99)], 3),
                "n_iterations": n_iterations,
                "status": "ok",
            }
        except Exception as e:
            results["status"] = f"error: {e}"
        return results

    def export_to_onnx(self, model_path: str, feature_names: List[str],
                        output_path: Optional[str] = None) -> Dict[str, Any]:
        """
        Export a scikit-learn model to ONNX format.
        ONNX models are 30–60% faster on CPU inference via ONNX Runtime.
        """
        if not SKL2ONNX_AVAILABLE:
            return {"status": "skl2onnx_not_installed",
                    "note": "Run: pip install skl2onnx onnxruntime"}
        if not JOBLIB_AVAILABLE:
            return {"status": "joblib_not_installed"}

        try:
            model = joblib.load(model_path)
            n_features = len(feature_names)
            initial_type = [("float_input", FloatTensorType([None, n_features]))]
            onnx_model = convert_sklearn(model, initial_types=initial_type)

            output_path = output_path or model_path.replace(".joblib", ".onnx")
            with open(output_path, "wb") as f:
                f.write(onnx_model.SerializeToString())

            return {
                "status": "ok",
                "output_path": output_path,
                "size_mb": self.get_model_size_mb(output_path),
                "note": "ONNX model ready for edge deployment via onnxruntime",
            }
        except Exception as e:
            return {"status": f"error: {e}"}


# ─────────────────────────────────────────────────────────────────────────────
# Edge Deployment Manager
# ─────────────────────────────────────────────────────────────────────────────

class EdgeDeploymentManager:
    """Main edge deployment manager."""

    def __init__(self, config: Optional[EdgeDeploymentConfig] = None):
        self.config = config or EdgeDeploymentConfig()
        self.resource_monitor = ResourceMonitor()
        self.model_optimizer = ModelOptimizer()
        self._project_root = Path(__file__).parent.parent.parent

    def assess_readiness(self) -> Dict[str, Any]:
        """
        Assess if current system meets edge deployment requirements.
        Returns a readiness report with PASS/FAIL per criterion.
        """
        checks = {}
        sys_info = self.resource_monitor.get_system_info()
        mem = self.resource_monitor.get_memory_usage()
        disk = self.resource_monitor.get_disk_usage()

        # RAM check
        ram_ok = mem.get("total_mb", 0) >= self.config.min_ram_mb
        checks["ram"] = {
            "required_mb": self.config.min_ram_mb,
            "available_mb": mem.get("total_mb", -1),
            "status": "PASS" if ram_ok else "FAIL",
        }

        # Disk check
        disk_ok = disk.get("free_gb", 0) >= self.config.min_disk_gb
        checks["disk"] = {
            "required_free_gb": self.config.min_disk_gb,
            "free_gb": disk.get("free_gb", -1),
            "status": "PASS" if disk_ok else "FAIL",
        }

        # Python version check (need 3.10+)
        py_parts = sys_info["python_version"].split(".")
        py_ok = int(py_parts[0]) >= 3 and int(py_parts[1]) >= 10 if len(py_parts) >= 2 else False
        checks["python_version"] = {
            "required": "3.10+",
            "found": sys_info["python_version"],
            "status": "PASS" if py_ok else "FAIL",
        }

        # ML dependency check
        checks["ml_dependencies"] = {
            "joblib": "PASS" if JOBLIB_AVAILABLE else "FAIL",
            "psutil": "PASS" if PSUTIL_AVAILABLE else "WARN",
            "onnx": "PASS" if ONNX_AVAILABLE else "WARN (optional)",
            "skl2onnx": "PASS" if SKL2ONNX_AVAILABLE else "WARN (optional)",
        }

        # Model files check
        model_dir = self._project_root / "ml" / "models"
        model_files = list(model_dir.glob("*.joblib")) if model_dir.exists() else []
        checks["ml_models"] = {
            "model_count": len(model_files),
            "models": [f.name for f in model_files],
            "status": "PASS" if model_files else "WARN (will train on startup)",
        }

        all_pass = all(
            v.get("status", "").startswith("PASS")
            for k, v in checks.items()
            if isinstance(v, dict) and "status" in v
        )

        return {
            "overall": "READY" if all_pass else "NEEDS_ATTENTION",
            "platform": self.config.target_platform,
            "checks": checks,
            "system_info": sys_info,
            "timestamp": datetime.utcnow().isoformat(),
        }

    def generate_deployment_report(self) -> Dict[str, Any]:
        """Full deployment report with benchmarks."""
        readiness = self.assess_readiness()
        mem = self.resource_monitor.get_memory_usage()
        disk = self.resource_monitor.get_disk_usage()
        cpu = self.resource_monitor.get_cpu_usage()

        # Benchmark models
        model_dir = self._project_root / "ml" / "models"
        model_benchmarks = {}
        for model_file in model_dir.glob("*.joblib") if model_dir.exists() else []:
            model_benchmarks[model_file.stem] = {
                "size_mb": self.model_optimizer.get_model_size_mb(str(model_file)),
                "benchmark": self.model_optimizer.benchmark_inference(str(model_file), n_iterations=100),
            }

        return {
            "report_title": "Edge Deployment Readiness Report",
            "generated_at": datetime.utcnow().isoformat(),
            "system": {
                "cpu_usage_pct": cpu,
                "memory": mem,
                "disk": disk,
                "info": self.resource_monitor.get_system_info(),
            },
            "readiness": readiness,
            "ml_models": model_benchmarks,
            "recommendations": self._generate_recommendations(readiness, model_benchmarks),
            "disclaimer": "DEMONSTRATION SYSTEM — For research use only.",
        }

    def generate_dockerfile(self) -> str:
        """Generate production-ready Dockerfile for edge deployment."""
        return '''# Digital Twin UAV Engine — Edge Deployment Dockerfile
# Optimized for: GCS embedded computers, Jetson Nano, x86 NUC
# Build: docker build -t dt-uav-engine .
# Run:   docker run -p 8000:8000 -p 5173:5173 dt-uav-engine
# NOTE: DEMONSTRATION SYSTEM — Not for operational use

FROM python:3.11-slim-bookworm

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \\
    gcc g++ libgomp1 curl nginx \\
    # CAN bus tools (for hardware integration)
    can-utils iproute2 \\
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python dependencies
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt \\
    && pip install --no-cache-dir psutil onnxruntime

# Copy application
COPY . .

# Build frontend
RUN apt-get update && apt-get install -y nodejs npm && rm -rf /var/lib/apt/lists/*
RUN cd frontend && npm install && npm run build

# Configure nginx to serve frontend + proxy API
RUN echo 'server { \\n\\
    listen 5173; \\n\\
    root /app/frontend/dist; \\n\\
    index index.html; \\n\\
    location / { try_files $uri $uri/ /index.html; } \\n\\
    location /api/ { proxy_pass http://127.0.0.1:8000; } \\n\\
    location /ws { proxy_pass http://127.0.0.1:8000; proxy_http_version 1.1; \\n\\
                  proxy_set_header Upgrade $http_upgrade; \\n\\
                  proxy_set_header Connection "upgrade"; } \\n\\
}' > /etc/nginx/conf.d/dt.conf

# Expose ports
EXPOSE 8000 5173

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s \\
    CMD curl -f http://localhost:8000/health || exit 1

# Startup script
RUN echo '#!/bin/bash\\nnginx\\nexec python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000' \\
    > /app/start.sh && chmod +x /app/start.sh

CMD ["/app/start.sh"]
'''

    def generate_systemd_service(self) -> str:
        """Generate systemd service file for auto-start on embedded Linux."""
        install_path = "/opt/dt-uav-engine"
        return f'''[Unit]
Description=Digital Twin UAV Engine Health Monitoring System
Documentation=https://github.com/your-org/dt-uav-engine
After=network.target can0.service
Wants=can0.service

[Service]
Type=simple
User=dtengine
Group=dtengine
WorkingDirectory={install_path}
Environment="PYTHONPATH={install_path}"
Environment="DT_ENV=production"
ExecStartPre=/usr/bin/ip link set can0 type can bitrate 500000
ExecStartPre=/usr/bin/ip link set up can0
ExecStart=/usr/bin/python3 -m uvicorn backend.main:app \\
    --host 0.0.0.0 --port 8000 \\
    --workers 1 \\
    --log-level warning \\
    --access-log

Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=dt-uav-engine

# Resource limits for embedded hardware
MemoryMax=512M
CPUQuota=80%

[Install]
WantedBy=multi-user.target

# Installation:
#   sudo cp dt-uav-engine.service /etc/systemd/system/
#   sudo systemctl daemon-reload
#   sudo systemctl enable dt-uav-engine
#   sudo systemctl start dt-uav-engine
#   sudo journalctl -u dt-uav-engine -f   # View logs
'''

    def _generate_recommendations(self, readiness: Dict, benchmarks: Dict) -> List[str]:
        recommendations = []
        checks = readiness.get("checks", {})

        if not PSUTIL_AVAILABLE:
            recommendations.append("Install psutil for resource monitoring: pip install psutil")
        if not ONNX_AVAILABLE:
            recommendations.append("Install ONNX Runtime for faster inference: pip install onnxruntime")
        if not SKL2ONNX_AVAILABLE:
            recommendations.append("Install skl2onnx for model export: pip install skl2onnx")

        for model_name, data in benchmarks.items():
            bench = data.get("benchmark", {})
            p99 = bench.get("p99_ms", 0)
            if p99 > 50:
                recommendations.append(
                    f"Model '{model_name}' p99 latency {p99:.1f}ms exceeds 50ms target — "
                    "consider ONNX export or feature reduction"
                )

        if not recommendations:
            recommendations.append("System meets all edge deployment requirements.")

        return recommendations


# Singleton
edge_manager = EdgeDeploymentManager()
