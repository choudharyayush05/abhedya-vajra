"""
Telemetry & Benchmarking module.
Tracks CPU, peak RAM usage, elapsed times, and operations/second for audit and live UI display.
"""

import time
import os
import psutil
from typing import Dict, Any, Optional

class SystemTelemetry:
    def __init__(self):
        self.process = psutil.Process(os.getpid())
        self._start_time: Optional[float] = None
        self._peak_ram_mb: float = 0.0

    def start_timer(self):
        self._start_time = time.perf_counter()
        self.update_ram()

    def update_ram(self) -> float:
        try:
            mem_info = self.process.memory_info()
            ram_mb = mem_info.rss / (1024 * 1024)
            if ram_mb > self._peak_ram_mb:
                self._peak_ram_mb = ram_mb
            return ram_mb
        except Exception:
            return 0.0

    @property
    def current_ram_mb(self) -> float:
        return self.update_ram()

    @property
    def peak_ram_mb(self) -> float:
        self.update_ram()
        return self._peak_ram_mb

    def elapsed_seconds(self) -> float:
        if self._start_time is None:
            return 0.0
        return time.perf_counter() - self._start_time

    def get_system_stats(self) -> Dict[str, Any]:
        vm = psutil.virtual_memory()
        return {
            "process_ram_mb": round(self.current_ram_mb, 2),
            "peak_process_ram_mb": round(self.peak_ram_mb, 2),
            "total_system_ram_gb": round(vm.total / (1024**3), 2),
            "available_system_ram_gb": round(vm.available / (1024**3), 2),
            "system_ram_percent": vm.percent,
            "cpu_percent": psutil.cpu_percent(interval=None),
            "cpu_count": psutil.cpu_count(logical=True)
        }

telemetry = SystemTelemetry()
