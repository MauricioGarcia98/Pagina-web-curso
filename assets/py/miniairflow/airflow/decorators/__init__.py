from .._core import dag, task, task_group  # noqa: F401

from .._core import _ruta_vieja
_ruta_vieja('airflow.decorators', 'airflow.sdk')
