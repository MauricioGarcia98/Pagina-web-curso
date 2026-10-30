"""Timetables "de intervalo de datos" (el comportamiento por defecto de Airflow 2)."""


class CronDataIntervalTimetable:
    def __init__(self, cron, timezone="UTC"):
        self.cron = cron
        self.timezone = timezone


class DeltaDataIntervalTimetable:
    def __init__(self, delta):
        self.delta = delta
