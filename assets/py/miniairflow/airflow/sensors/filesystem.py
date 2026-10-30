from .._core import FileSensor  # noqa: F401

from .._core import _ruta_vieja
_ruta_vieja('airflow.sensors.filesystem', 'airflow.providers.standard.sensors.filesystem')
