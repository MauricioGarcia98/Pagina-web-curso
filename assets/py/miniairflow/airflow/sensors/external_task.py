from .._core import ExternalTaskSensor  # noqa: F401

from .._core import _ruta_vieja
_ruta_vieja('airflow.sensors.external_task', 'airflow.providers.standard.sensors.external_task')
