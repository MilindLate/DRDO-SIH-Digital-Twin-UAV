"""ML service wrapper for the backend."""

import logging
from typing import List, Dict, Optional, Any

logger = logging.getLogger(__name__)


class MLService:
    def __init__(self):
        self._engine = None
        self._initialized = False

    async def initialize(self):
        try:
            import sys, os
            ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            if ROOT not in sys.path:
                sys.path.insert(0, ROOT)
            from ml.inference.ml_engine import ml_engine, SKLEARN_AVAILABLE
            self._engine = ml_engine
            if not SKLEARN_AVAILABLE:
                logger.warning("scikit-learn not available — ML disabled")
                return
            # Try to load pre-trained models
            loaded = self._engine.initialize()
            if "loaded_from_disk" not in str(loaded):
                # Train on synthetic data
                logger.info("Training ML models on synthetic data...")
                await self._train_from_synthetic()
            self._initialized = True
            logger.info("ML service initialized")
        except Exception as e:
            logger.error(f"ML service init error: {e}")

    async def _train_from_synthetic(self):
        try:
            from simulator.engine_model.simulator import DatasetGenerator
            gen = DatasetGenerator()
            # Generate small training set quickly
            records = []
            for scenario in ["normal_endurance", "injector_degradation",
                              "lubrication_degradation", "vibration_anomaly"]:
                try:
                    r = gen.generate_scenario(scenario, dt=30.0)
                    records.extend(r[:200])  # Limit for speed
                except Exception as e:
                    logger.warning(f"Scenario {scenario} generation error: {e}")
            if records:
                self._engine.initialize(records)
                logger.info(f"ML models trained on {len(records)} synthetic records")
        except Exception as e:
            logger.error(f"ML training error: {e}")

    def analyze(self, record: dict, operating_hours: float = 0.0,
                health_history: Optional[List[float]] = None,
                fault_count: int = 0) -> Dict[str, Any]:
        if not self._initialized or self._engine is None:
            return {"status": "ml_disabled"}
        try:
            return self._engine.analyze(record, operating_hours, health_history, fault_count)
        except Exception as e:
            logger.error(f"ML analyze error: {e}")
            return {"status": "error", "error": str(e)}

    def get_registry(self) -> List[Dict]:
        if self._engine:
            return self._engine.get_model_registry()
        return []


ml_service = MLService()
