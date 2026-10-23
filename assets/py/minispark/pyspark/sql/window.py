"""Especificaciones de ventana (imitan pyspark.sql.window)."""


class WindowSpec:
    def __init__(self, partition=None, order=None, frame=None):
        self._partition = list(partition or [])
        self._order = list(order or [])
        self._frame = frame

    def partitionBy(self, *cols):
        cols = _flat(cols)
        return WindowSpec(self._partition + cols, self._order, self._frame)

    def orderBy(self, *cols):
        cols = _flat(cols)
        return WindowSpec(self._partition, self._order + cols, self._frame)

    def rowsBetween(self, start, end):
        return WindowSpec(self._partition, self._order, ("rows", _bound(start), _bound(end)))

    def rangeBetween(self, start, end):
        return WindowSpec(self._partition, self._order, ("range", _bound(start), _bound(end)))


def _flat(cols):
    out = []
    for c in cols:
        if isinstance(c, (list, tuple)):
            out.extend(c)
        else:
            out.append(c)
    from . import _col
    return [_col(c) if isinstance(c, str) else c for c in out]


def _bound(x):
    if x is None or abs(x) >= Window.unboundedFollowing:
        return None
    return x


class Window:
    unboundedPreceding = -(1 << 62)
    unboundedFollowing = (1 << 62)
    currentRow = 0

    @staticmethod
    def partitionBy(*cols):
        return WindowSpec().partitionBy(*cols)

    @staticmethod
    def orderBy(*cols):
        return WindowSpec().orderBy(*cols)

    @staticmethod
    def rowsBetween(start, end):
        return WindowSpec().rowsBetween(start, end)

    @staticmethod
    def rangeBetween(start, end):
        return WindowSpec().rangeBetween(start, end)
