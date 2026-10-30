"""airflow.sdk: la interfaz pública para escribir DAGs en Airflow 3 (Task SDK)."""
from .._core import (  # noqa: F401
    DAG, dag, task, task_group, TaskGroup, BaseOperator, BaseSensorOperator, Variable, Connection,
    Asset, AssetAll, AssetAny, chain, cross_downstream, TriggerRule,
)
from ..models.param import Param  # noqa: F401

Context = dict
