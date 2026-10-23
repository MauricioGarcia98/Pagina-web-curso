"""Shim mínimo de pendulum para el simulador."""
import datetime as _dt


def datetime(year, month=1, day=1, hour=0, minute=0, second=0, tz="UTC"):
    return _dt.datetime(year, month, day, hour, minute, second, tzinfo=_dt.timezone.utc)


def now(tz="UTC"):
    return _dt.datetime.now(_dt.timezone.utc)


def duration(**kw):
    return _dt.timedelta(**kw)


def today(tz="UTC"):
    return now().replace(hour=0, minute=0, second=0, microsecond=0)
