"""mini-Spark: simulador educativo de PySpark (ver pyspark/sql/__init__.py)."""
from .sql import SparkSession, Row  # noqa: F401

__version__ = "3.5.0-mini"


class StorageLevel:
    MEMORY_ONLY = "MEMORY_ONLY"
    MEMORY_AND_DISK = "MEMORY_AND_DISK"
    DISK_ONLY = "DISK_ONLY"
    MEMORY_ONLY_SER = "MEMORY_ONLY_SER"
    MEMORY_AND_DISK_SER = "MEMORY_AND_DISK_SER"
    OFF_HEAP = "OFF_HEAP"


class SparkConf:
    def __init__(self):
        self._d = {}

    def setAppName(self, n):
        self._d["spark.app.name"] = n
        return self

    def setMaster(self, m):
        return self

    def set(self, k, v):
        self._d[k] = v
        return self


class SparkContext:
    @staticmethod
    def getOrCreate(conf=None):
        return SparkSession.builder.getOrCreate().sparkContext
