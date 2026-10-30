"""Timetables de Airflow 3: CronTriggerTimetable (por defecto para cron) y MultipleCronTriggerTimetable."""


class CronTriggerTimetable:
    def __init__(self, cron, timezone="UTC", interval=None, run_immediately=False):
        self.cron = cron
        self.timezone = timezone
        self.interval = interval
        self.run_immediately = run_immediately

    def __repr__(self):
        return "CronTriggerTimetable(%r, interval=%r)" % (self.cron, self.interval)


class MultipleCronTriggerTimetable:
    def __init__(self, *crons, timezone="UTC", interval=None):
        self.crons = list(crons)
        self.timezone = timezone
        self.interval = interval


class DeltaTriggerTimetable:
    def __init__(self, delta, interval=None):
        self.delta = delta
        self.interval = interval
