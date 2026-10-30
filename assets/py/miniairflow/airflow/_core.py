"""
mini-Airflow: simulador educativo de Apache Airflow.

Permite definir DAGs con la misma sintaxis que Airflow 2.x (DAG, operadores,
TaskFlow API, dependencias con >> y <<, XCom, ramas y trigger rules) y
"ejecutarlos" en el navegador con dag.test(). No hay scheduler, workers ni
base de datos: es solo para aprender y practicar.
"""
import datetime as _dt
import inspect as _inspect

_DAG_REGISTRY = {}
_CURRENT_DAG = []
_CURRENT_GROUP = []


class AirflowException(Exception):
    pass


class AirflowSkipException(AirflowException):
    pass


class AirflowFailException(AirflowException):
    pass


class TriggerRule:
    ALL_SUCCESS = "all_success"
    ALL_FAILED = "all_failed"
    ALL_DONE = "all_done"
    ONE_SUCCESS = "one_success"
    ONE_FAILED = "one_failed"
    NONE_FAILED = "none_failed"
    NONE_FAILED_MIN_ONE_SUCCESS = "none_failed_min_one_success"
    NONE_SKIPPED = "none_skipped"
    ALWAYS = "always"


# ------------------------------------------------------------------ DAG
class DAG:
    def __init__(self, dag_id, description=None, schedule=None, schedule_interval=None, start_date=None,
                 end_date=None, catchup=False, default_args=None, tags=None, max_active_runs=16,
                 max_active_tasks=16, dagrun_timeout=None, params=None, doc_md=None, **kwargs):
        if not isinstance(dag_id, str) or not dag_id:
            raise AirflowException("dag_id debe ser un texto no vacío")
        self.dag_id = dag_id
        self.description = description
        self.schedule = schedule if schedule is not None else schedule_interval
        self.schedule_interval = self.schedule
        self.start_date = start_date
        self.end_date = end_date
        self.catchup = catchup
        self.default_args = dict(default_args or {})
        self.tags = list(tags or [])
        self.max_active_runs = max_active_runs
        self.max_active_tasks = max_active_tasks
        self.dagrun_timeout = dagrun_timeout
        self.params = dict(params or {})
        self.doc_md = doc_md
        self.task_dict = {}
        self.extra = kwargs
        _DAG_REGISTRY[dag_id] = self

    def __enter__(self):
        _CURRENT_DAG.append(self)
        return self

    def __exit__(self, *a):
        _CURRENT_DAG.pop()

    def __repr__(self):
        return "<DAG: %s>" % self.dag_id

    @property
    def tasks(self):
        return list(self.task_dict.values())

    @property
    def task_ids(self):
        return list(self.task_dict.keys())

    def get_task(self, task_id):
        if task_id not in self.task_dict:
            raise AirflowException("La tarea '%s' no existe en el DAG '%s'" % (task_id, self.dag_id))
        return self.task_dict[task_id]

    def has_task(self, task_id):
        return task_id in self.task_dict

    @property
    def roots(self):
        return [t for t in self.tasks if not t.upstream_task_ids]

    @property
    def leaves(self):
        return [t for t in self.tasks if not t.downstream_task_ids]

    def topological_sort(self):
        indeg = {t: len(self.task_dict[t].upstream_task_ids) for t in self.task_dict}
        order = []
        ready = [t for t in self.task_dict if indeg[t] == 0]
        while ready:
            t = ready.pop(0)
            order.append(self.task_dict[t])
            for d in sorted(self.task_dict[t].downstream_task_ids, key=list(self.task_dict).index):
                indeg[d] -= 1
                if indeg[d] == 0:
                    ready.append(d)
        if len(order) != len(self.task_dict):
            raise AirflowException("¡El DAG '%s' tiene un ciclo! Un DAG debe ser acíclico." % self.dag_id)
        return order

    def check_cycle(self):
        self.topological_sort()
        return False

    def tree(self):
        """Imprime las dependencias del DAG."""
        for t in self.topological_sort():
            down = ", ".join(sorted(t.downstream_task_ids)) or "-"
            print("%s -> %s" % (t.task_id, down))

    def test(self, execution_date=None, logical_date=None, run_conf=None, **kw):
        """Ejecuta todas las tareas en orden, como `airflow dags test`."""
        ld = logical_date or execution_date or self.start_date or _dt.datetime(2024, 1, 1)
        if isinstance(ld, _dt.date) and not isinstance(ld, _dt.datetime):
            ld = _dt.datetime(ld.year, ld.month, ld.day)
        run = DagRun(self, ld, run_conf or {})
        run.run()
        return run


class DagRun:
    def __init__(self, dag, logical_date, conf):
        self.dag = dag
        self.logical_date = logical_date
        self.conf = conf
        self.run_id = "manual__%s" % logical_date.isoformat()
        self.xcoms = {}
        self.states = {}

    def get_task_instance(self, task_id):
        return TaskInstance(self.dag.get_task(task_id), self)

    def run(self):
        print("▶ Ejecutando DAG '%s' (logical_date=%s)" % (self.dag.dag_id, self.logical_date.date()))
        for task in self.dag.topological_sort():
            if self.states.get(task.task_id) == "skipped":
                print("  ⏭  %-22s skipped (rama no elegida)" % task.task_id)
                continue
            ups = [self.states.get(u) for u in task.upstream_task_ids]
            if not _trigger_ok(task.trigger_rule, ups):
                state = "upstream_failed" if ("failed" in ups or "upstream_failed" in ups) else "skipped"
                self.states[task.task_id] = state
                print("  ⏭  %-22s %s" % (task.task_id, state))
                continue
            ti = TaskInstance(task, self)
            attempts = 1 + int(task.retries or 0)
            for attempt in range(1, attempts + 1):
                try:
                    _ctx = ti.get_template_context()
                    _CURRENT_CONTEXT.append(_ctx)
                    try:
                        result = task.execute(_ctx)
                    finally:
                        _CURRENT_CONTEXT.pop()
                    if result is not None and task.do_xcom_push:
                        self.xcoms[(task.task_id, "return_value")] = result
                    self.states[task.task_id] = "success"
                    print("  ✅ %-22s success%s" % (task.task_id, "" if result is None else "  (XCom: %r)" % (result,)))
                    if getattr(task, "_is_short_circuit", False) and not result:
                        print("     condición falsa: se saltean las tareas siguientes")
                        pend = list(task.downstream_task_ids)
                        while pend:
                            d = pend.pop()
                            if self.states.get(d) != "skipped":
                                self.states[d] = "skipped"
                                if task.ignore_downstream_trigger_rules:
                                    pend.extend(self.dag.get_task(d).downstream_task_ids)
                    if getattr(task, "_is_branch", False):
                        chosen = set(result) if isinstance(result, (list, tuple, set)) else {result}
                        for d in task.downstream_task_ids:
                            if d not in chosen:
                                self.states[d] = "skipped"
                    break
                except AirflowSkipException:
                    self.states[task.task_id] = "skipped"
                    print("  ⏭  %-22s skipped" % task.task_id)
                    break
                except Exception as e:  # noqa: BLE001
                    if attempt < attempts and not isinstance(e, AirflowFailException):
                        print("  🔁 %-22s falló (%s). Reintento %d/%d" % (task.task_id, e, attempt, attempts - 1))
                        continue
                    self.states[task.task_id] = "failed"
                    print("  ❌ %-22s failed: %s: %s" % (task.task_id, type(e).__name__, e))
                    if task.on_failure_callback:
                        task.on_failure_callback(ti.get_template_context())
        ok = all(v in ("success", "skipped") for v in self.states.values())
        self.state = "success" if ok else "failed"
        print("■ DAG run %s" % self.state)
        return self


def _trigger_ok(rule, ups):
    if not ups:
        return True
    s = ups
    if rule == TriggerRule.ALL_SUCCESS:
        return all(x == "success" for x in s)
    if rule == TriggerRule.ALL_DONE or rule == TriggerRule.ALWAYS:
        return True
    if rule == TriggerRule.ONE_SUCCESS:
        return any(x == "success" for x in s)
    if rule == TriggerRule.ONE_FAILED:
        return any(x in ("failed", "upstream_failed") for x in s)
    if rule == TriggerRule.ALL_FAILED:
        return all(x in ("failed", "upstream_failed") for x in s)
    if rule == TriggerRule.NONE_FAILED:
        return all(x not in ("failed", "upstream_failed") for x in s)
    if rule == TriggerRule.NONE_FAILED_MIN_ONE_SUCCESS:
        return all(x not in ("failed", "upstream_failed") for x in s) and any(x == "success" for x in s)
    if rule == TriggerRule.NONE_SKIPPED:
        return all(x != "skipped" for x in s)
    return all(x == "success" for x in s)


class TaskInstance:
    def __init__(self, task, run):
        self.task = task
        self.task_id = task.task_id
        self.dag_run = run
        self.try_number = 1

    def xcom_push(self, key, value):
        self.dag_run.xcoms[(self.task_id, key)] = value

    def xcom_pull(self, task_ids=None, key="return_value", default=None):
        if isinstance(task_ids, (list, tuple)):
            return [self.dag_run.xcoms.get((t, key), default) for t in task_ids]
        if task_ids is None:
            task_ids = self.task_id
        return self.dag_run.xcoms.get((task_ids, key), default)

    def get_template_context(self):
        ld = self.dag_run.logical_date
        # Intervalo de datos como en Airflow 3: con un cron (CronTriggerTimetable) inicio = fin = disparo;
        # si el timetable declara interval=, el intervalo termina en el disparo; con timedelta, el período siguiente.
        sch = self.task.dag.schedule if self.task.dag else None
        if getattr(sch, "interval", None) is not None:
            di_start, di_end = ld - sch.interval, ld
        elif isinstance(sch, _dt.timedelta):
            di_start, di_end = ld, ld + sch
        else:
            di_start, di_end = ld, ld
        return {
            "ti": self, "task_instance": self, "task": self.task, "dag": self.task.dag,
            "ds": ld.strftime("%Y-%m-%d"), "ds_nodash": ld.strftime("%Y%m%d"),
            "ts": ld.isoformat(), "logical_date": ld, "execution_date": ld,
            "data_interval_start": di_start, "data_interval_end": di_end,
            "params": dict(self.task.dag.params if self.task.dag else {}, **(self.task.params or {})),
            "dag_run": self.dag_run, "run_id": self.dag_run.run_id, "conf": self.dag_run.conf,
            "var": {"value": _VarAccessor()},
            "macros": _Macros(),
        }


class _VarAccessor:
    def __getattr__(self, k):
        return Variable.get(k)


class _Macros:
    datetime = _dt.datetime
    timedelta = _dt.timedelta

    @staticmethod
    def ds_add(ds, days):
        return (_dt.date.fromisoformat(ds) + _dt.timedelta(days=days)).isoformat()

    @staticmethod
    def ds_format(ds, in_fmt, out_fmt):
        return _dt.datetime.strptime(ds, in_fmt).strftime(out_fmt)


# ------------------------------------------------------------ operadores
class BaseOperator:
    template_fields = ()
    ui_color = "#fff"

    def __init__(self, task_id, dag=None, retries=None, retry_delay=None, trigger_rule=TriggerRule.ALL_SUCCESS,
                 depends_on_past=False, owner=None, email=None, email_on_failure=False, pool=None,
                 execution_timeout=None, sla=None, params=None, do_xcom_push=True, on_failure_callback=None,
                 on_success_callback=None, priority_weight=1, queue=None, doc_md=None, **kwargs):
        if not isinstance(task_id, str) or not task_id:
            raise AirflowException("task_id debe ser un texto no vacío")
        dag = dag or (_CURRENT_DAG[-1] if _CURRENT_DAG else None)
        if _CURRENT_GROUP:
            task_id = _CURRENT_GROUP[-1].prefix + task_id
        defaults = dict(dag.default_args) if dag else {}
        self.task_id = task_id
        self.dag = dag
        self.retries = retries if retries is not None else defaults.get("retries", 0)
        self.retry_delay = retry_delay if retry_delay is not None else defaults.get("retry_delay")
        self.trigger_rule = trigger_rule
        self.depends_on_past = depends_on_past or defaults.get("depends_on_past", False)
        self.owner = owner or defaults.get("owner", "airflow")
        self.email = email or defaults.get("email")
        self.pool = pool
        # como en Airflow: lo que no se pasa a la tarea se toma de default_args del DAG
        self.execution_timeout = execution_timeout if execution_timeout is not None else defaults.get("execution_timeout")
        self.params = params or {}
        self.do_xcom_push = do_xcom_push
        # Assets que esta tarea produce (outlets) o lee (inlets): base de la programación por datos
        self.outlets = list(kwargs.get('outlets') or [])
        self.inlets = list(kwargs.get('inlets') or [])
        self.on_failure_callback = on_failure_callback or defaults.get("on_failure_callback")
        self.on_success_callback = on_success_callback
        self.doc_md = doc_md
        self.extra = kwargs
        self.upstream_task_ids = set()
        self.downstream_task_ids = set()
        if dag is not None:
            if task_id in dag.task_dict:
                raise AirflowException("Ya existe una tarea con task_id '%s' en el DAG '%s' (los task_id deben ser únicos)" % (task_id, dag.dag_id))
            dag.task_dict[task_id] = self
        if _CURRENT_GROUP:
            _CURRENT_GROUP[-1].children.append(self)

    def __repr__(self):
        return "<Task(%s): %s>" % (type(self).__name__, self.task_id)

    # ---- dependencias
    def set_downstream(self, other):
        for o in _flatten(other):
            for t in _tasks_of(o):
                self.downstream_task_ids.add(t.task_id)
                t.upstream_task_ids.add(self.task_id)

    def set_upstream(self, other):
        for o in _flatten(other):
            for t in _tasks_of(o):
                t.set_downstream(self)

    def __rshift__(self, other):
        self.set_downstream(other)
        return other

    def __lshift__(self, other):
        self.set_upstream(other)
        return other

    def __rrshift__(self, other):
        for o in _flatten(other):
            for t in _tasks_of(o):
                t.set_downstream(self)
        return self

    def __rlshift__(self, other):
        self.set_downstream(other)
        return self

    @property
    def upstream_list(self):
        return [self.dag.task_dict[t] for t in sorted(self.upstream_task_ids)]

    @property
    def downstream_list(self):
        return [self.dag.task_dict[t] for t in sorted(self.downstream_task_ids)]

    def render(self, value, context):
        if isinstance(value, str) and "{{" in value:
            try:
                import jinja2
                return jinja2.Template(value).render(**context)
            except ImportError:
                return value.replace("{{ ds }}", context["ds"]).replace("{{ds}}", context["ds"])
        return value

    def execute(self, context):
        raise NotImplementedError


def _output(self):
    """op.output: el XCom return_value de un operador clásico, para pasarlo a una tarea @task."""
    return XComArg(self)


BaseOperator.output = property(_output)


def _flatten(x):
    if isinstance(x, (list, tuple, set)):
        out = []
        for y in x:
            out.extend(_flatten(y))
        return out
    return [x]


def _tasks_of(x):
    if isinstance(x, TaskGroup):
        return x.roots()
    if isinstance(x, XComArg):
        return [x.operator]
    return [x]


class EmptyOperator(BaseOperator):
    def execute(self, context):
        return None


DummyOperator = EmptyOperator


class BashOperator(BaseOperator):
    template_fields = ("bash_command", "env")

    def __init__(self, task_id, bash_command, env=None, cwd=None, **kw):
        super().__init__(task_id, **kw)
        self.bash_command = bash_command
        self.env = env
        self.cwd = cwd

    def execute(self, context):
        cmd = self.render(self.bash_command, context)
        print("     $ %s" % cmd)
        if "exit 1" in cmd or "false" == cmd.strip():
            raise AirflowException("El comando bash terminó con código 1")
        last = cmd.strip().split("\n")[-1]
        if last.startswith("echo "):
            out = last[5:].strip().strip("'\"")
            print("     %s" % out)
            return out
        return None


class PythonOperator(BaseOperator):
    template_fields = ("op_args", "op_kwargs")

    def __init__(self, task_id, python_callable, op_args=None, op_kwargs=None, templates_dict=None, **kw):
        super().__init__(task_id, **kw)
        if not callable(python_callable):
            raise AirflowException("python_callable debe ser una función")
        self.python_callable = python_callable
        self.op_args = list(op_args or [])
        self.op_kwargs = dict(op_kwargs or {})
        self.templates_dict = templates_dict

    def execute(self, context):
        args = [self.render(a, context) for a in self.op_args]
        kwargs = {k: self.render(v, context) for k, v in self.op_kwargs.items()}
        if self.templates_dict:
            context["templates_dict"] = {k: self.render(v, context) for k, v in self.templates_dict.items()}
        return _call_with_context(self.python_callable, args, kwargs, context)


def _call_with_context(fn, args, kwargs, context):
    sig = _inspect.signature(fn)
    params = sig.parameters
    accepts_var_kw = any(p.kind == p.VAR_KEYWORD for p in params.values())
    for k, v in context.items():
        if accepts_var_kw or (k in params and k not in kwargs):
            if k not in kwargs and (accepts_var_kw or k in params):
                # no pisar argumentos posicionales
                names = list(params)
                if k in names and names.index(k) < len(args):
                    continue
                kwargs[k] = v
    return fn(*args, **kwargs)


class BranchPythonOperator(PythonOperator):
    _is_branch = True


class ShortCircuitOperator(PythonOperator):
    """Como en Airflow: la tarea termina en success y, si la condición es falsa, se saltean todas las siguientes."""
    _is_short_circuit = True

    def __init__(self, task_id, python_callable, ignore_downstream_trigger_rules=True, **kw):
        super().__init__(task_id, python_callable=python_callable, **kw)
        self.ignore_downstream_trigger_rules = ignore_downstream_trigger_rules


class BaseSensorOperator(BaseOperator):
    def __init__(self, task_id, poke_interval=60, timeout=3600, mode="poke", soft_fail=False, **kw):
        super().__init__(task_id, **kw)
        self.poke_interval = poke_interval
        self.timeout = timeout
        self.mode = mode
        self.soft_fail = soft_fail

    def poke(self, context):
        return True

    def execute(self, context):
        if not self.poke(context):
            if self.soft_fail:
                raise AirflowSkipException("sensor sin éxito (soft_fail)")
            raise AirflowException("Timeout del sensor %s" % self.task_id)
        print("     sensor OK (simulado)")


class FileSensor(BaseSensorOperator):
    def __init__(self, task_id, filepath, fs_conn_id="fs_default", **kw):
        super().__init__(task_id, **kw)
        self.filepath = filepath


class ExternalTaskSensor(BaseSensorOperator):
    def __init__(self, task_id, external_dag_id, external_task_id=None, **kw):
        super().__init__(task_id, **kw)
        self.external_dag_id = external_dag_id
        self.external_task_id = external_task_id


class PythonSensor(BaseSensorOperator):
    def __init__(self, task_id, python_callable, op_args=None, op_kwargs=None, **kw):
        super().__init__(task_id, **kw)
        self.python_callable = python_callable
        self.op_args = op_args or []
        self.op_kwargs = op_kwargs or {}

    def poke(self, context):
        return _call_with_context(self.python_callable, list(self.op_args), dict(self.op_kwargs), context)


class TriggerDagRunOperator(BaseOperator):
    def __init__(self, task_id, trigger_dag_id, conf=None, wait_for_completion=False, **kw):
        super().__init__(task_id, **kw)
        self.trigger_dag_id = trigger_dag_id
        self.conf = conf

    def execute(self, context):
        print("     (simulado) disparando DAG '%s'" % self.trigger_dag_id)


class _RecordingOperator(BaseOperator):
    """Operadores de proveedores: guardan su configuración y simulan la ejecución."""

    def __init__(self, task_id, **kw):
        base_keys = set(_inspect.signature(BaseOperator.__init__).parameters)
        own = {k: v for k, v in kw.items() if k not in base_keys}
        base = {k: v for k, v in kw.items() if k in base_keys}
        super().__init__(task_id, **base)
        for k, v in own.items():
            setattr(self, k, v)
        self.config = own

    def execute(self, context):
        print("     (simulado) %s con %s" % (type(self).__name__, ", ".join("%s=%r" % kv for kv in self.config.items())))


class DatabricksRunNowOperator(_RecordingOperator):
    pass


class DatabricksSubmitRunOperator(_RecordingOperator):
    pass


class DatabricksSqlOperator(_RecordingOperator):
    pass


class SQLExecuteQueryOperator(_RecordingOperator):
    pass


class EmailOperator(_RecordingOperator):
    pass



# ---------------------------------------------------------------- proveedores de nube (AWS y Google Cloud)
class _RecordingSensor(BaseSensorOperator):
    """Sensores de proveedores: guardan su configuración y se cumplen al instante."""

    def __init__(self, task_id, **kw):
        base_keys = set(_inspect.signature(BaseSensorOperator.__init__).parameters) | set(_inspect.signature(BaseOperator.__init__).parameters)
        own = {k: v for k, v in kw.items() if k not in base_keys}
        base = {k: v for k, v in kw.items() if k in base_keys}
        super().__init__(task_id, **base)
        for k, v in own.items():
            setattr(self, k, v)
        self.config = own

    def poke(self, context):
        print("     (simulado) %s: condición cumplida (%s)" % (type(self).__name__, ", ".join("%s=%r" % kv for kv in self.config.items())))
        return True


class S3CreateBucketOperator(_RecordingOperator):
    pass


class S3CreateObjectOperator(_RecordingOperator):
    pass


class S3CopyObjectOperator(_RecordingOperator):
    pass


class S3DeleteObjectsOperator(_RecordingOperator):
    pass


class GlueJobOperator(_RecordingOperator):
    pass


class GlueCrawlerOperator(_RecordingOperator):
    pass


class AthenaOperator(_RecordingOperator):
    pass


class EmrServerlessStartJobOperator(_RecordingOperator):
    pass


class EmrCreateJobFlowOperator(_RecordingOperator):
    pass


class EmrAddStepsOperator(_RecordingOperator):
    pass


class EmrTerminateJobFlowOperator(_RecordingOperator):
    pass


class RedshiftDataOperator(_RecordingOperator):
    pass


class LambdaInvokeFunctionOperator(_RecordingOperator):
    pass


class StepFunctionStartExecutionOperator(_RecordingOperator):
    pass


class S3KeySensor(_RecordingSensor):
    pass


class GlueJobSensor(_RecordingSensor):
    pass


class GlueCrawlerSensor(_RecordingSensor):
    pass


class AthenaSensor(_RecordingSensor):
    pass


class GCSCreateBucketOperator(_RecordingOperator):
    pass


class GCSDeleteObjectsOperator(_RecordingOperator):
    pass


class GCSToBigQueryOperator(_RecordingOperator):
    pass


class BigQueryInsertJobOperator(_RecordingOperator):
    pass


class BigQueryCreateEmptyDatasetOperator(_RecordingOperator):
    pass


class BigQueryCheckOperator(_RecordingOperator):
    pass


class DataprocCreateClusterOperator(_RecordingOperator):
    pass


class DataprocSubmitJobOperator(_RecordingOperator):
    pass


class DataprocDeleteClusterOperator(_RecordingOperator):
    pass


class DataprocCreateBatchOperator(_RecordingOperator):
    pass


class DataflowStartFlexTemplateOperator(_RecordingOperator):
    pass


class DataformCreateCompilationResultOperator(_RecordingOperator):
    pass


class DataformCreateWorkflowInvocationOperator(_RecordingOperator):
    pass


class GCSObjectExistenceSensor(_RecordingSensor):
    pass


class BigQueryTableExistenceSensor(_RecordingSensor):
    pass


# ---------------------------------------------------------------- TaskGroup
class TaskGroup:
    def __init__(self, group_id, tooltip=None, prefix_group_id=True, dag=None, **kw):
        self.group_id = group_id
        parent = _CURRENT_GROUP[-1].prefix if _CURRENT_GROUP else ""
        self.prefix = (parent + group_id + ".") if prefix_group_id else parent
        self.children = []

    def __enter__(self):
        _CURRENT_GROUP.append(self)
        return self

    def __exit__(self, *a):
        _CURRENT_GROUP.pop()

    def _ids(self):
        return set(t.task_id for t in self.children)

    def roots(self):
        ids = self._ids()
        return [t for t in self.children if not (t.upstream_task_ids & ids)]

    def leaves(self):
        ids = self._ids()
        return [t for t in self.children if not (t.downstream_task_ids & ids)]

    def __rshift__(self, other):
        for t in self.leaves():
            t.set_downstream(other)
        return other

    def __lshift__(self, other):
        for t in self.roots():
            t.set_upstream(other)
        return other

    def __rrshift__(self, other):
        for o in _flatten(other):
            for src in (o.leaves() if isinstance(o, TaskGroup) else _tasks_of(o)):
                for t in self.roots():
                    src.set_downstream(t)
        return self


# ---------------------------------------------------------------- TaskFlow
class XComArg:
    def __init__(self, operator, key="return_value"):
        self.operator = operator
        self.key = key

    def resolve(self, run):
        return run.xcoms.get((self.operator.task_id, self.key))

    def __getitem__(self, k):
        return _XComItem(self, k)

    def __rshift__(self, other):
        self.operator.set_downstream(other)
        return other

    def __lshift__(self, other):
        self.operator.set_upstream(other)
        return other

    def __rrshift__(self, other):
        for o in _flatten(other):
            for t in _tasks_of(o):
                t.set_downstream(self.operator)
        return self

    @property
    def task_id(self):
        return self.operator.task_id

    def __repr__(self):
        return "XComArg(%s)" % self.operator.task_id


class _XComItem(XComArg):
    def __init__(self, parent, k):
        super().__init__(parent.operator, parent.key)
        self.k = k

    def resolve(self, run):
        v = super().resolve(run)
        return None if v is None else v[self.k]


def _resolve_args(obj, run):
    if isinstance(obj, XComArg):
        return obj.resolve(run)
    if isinstance(obj, list):
        return [_resolve_args(x, run) for x in obj]
    if isinstance(obj, tuple):
        return tuple(_resolve_args(x, run) for x in obj)
    if isinstance(obj, dict):
        return {k: _resolve_args(v, run) for k, v in obj.items()}
    return obj


def _xcom_deps(obj):
    if isinstance(obj, XComArg):
        return [obj.operator]
    if isinstance(obj, (list, tuple)):
        return [d for x in obj for d in _xcom_deps(x)]
    if isinstance(obj, dict):
        return [d for x in obj.values() for d in _xcom_deps(x)]
    return []


_CURRENT_CONTEXT = []


def get_current_context():
    """Devuelve el contexto de la tarea que se está ejecutando (ds, logical_date, ti, params…)."""
    if not _CURRENT_CONTEXT:
        raise AirflowException("get_current_context() solo funciona dentro de una tarea en ejecución")
    return _CURRENT_CONTEXT[-1]


class _DecoratedOperator(BaseOperator):
    def __init__(self, task_id, fn, args, kwargs, multiple_outputs=False, branch=False, **kw):
        super().__init__(task_id, **kw)
        self.python_callable = fn
        self.op_args = args
        self.op_kwargs = kwargs
        self.multiple_outputs = multiple_outputs
        self._is_branch = branch
        for dep in _xcom_deps(list(args) + list(kwargs.values())):
            dep.set_downstream(self)

    def execute(self, context):
        run = context["dag_run"]
        args = _resolve_args(list(self.op_args), run)
        kwargs = _resolve_args(dict(self.op_kwargs), run)
        res = _call_with_context(self.python_callable, args, kwargs, context)
        if self.multiple_outputs and isinstance(res, dict):
            for k, v in res.items():
                run.xcoms[(self.task_id, k)] = v
        return res


class _TaskDecorator:
    def __init__(self, fn=None, branch=False, **opts):
        self.fn = fn
        self.opts = opts
        self.branch = branch

    def __call__(self, *args, **kwargs):
        if self.fn is None:
            # usado como @task(...) -> recibimos la función
            return _TaskDecorator(args[0], self.branch, **self.opts)
        dag = _CURRENT_DAG[-1] if _CURRENT_DAG else None
        if dag is None:
            raise AirflowException("Las tareas @task deben llamarse dentro de un DAG (with DAG(...) o una función @dag)")
        base_id = self.opts.get("task_id") or self.fn.__name__
        tid = base_id
        prefix = _CURRENT_GROUP[-1].prefix if _CURRENT_GROUP else ""
        k = 1
        while (prefix + tid) in dag.task_dict:
            tid = "%s__%d" % (base_id, k)
            k += 1
        opts = {kk: v for kk, v in self.opts.items() if kk != "task_id"}
        op = _DecoratedOperator(tid, self.fn, args, kwargs, branch=self.branch, **opts)
        return XComArg(op)

    def partial(self, **kwargs):
        return _PartialTask(self, kwargs)

    def expand(self, **mapped):
        return _PartialTask(self, {}).expand(**mapped)

    def override(self, **opts):
        o = dict(self.opts)
        o.update(opts)
        return _TaskDecorator(self.fn, self.branch, **o)

    @property
    def __name__(self):
        return self.fn.__name__ if self.fn else "task"


class _MappedDecoratedOperator(_DecoratedOperator):
    """Mapeo dinámico (task.expand): una instancia de la tarea por cada valor (producto si hay varias listas)."""
    def __init__(self, task_id, fn, fixed, mapped, **kw):
        super().__init__(task_id, fn, [], dict(fixed, **mapped), **kw)
        self.fixed = fixed
        self.mapped = mapped

    def execute(self, context):
        import itertools
        run = context["dag_run"]
        fixed = _resolve_args(dict(self.fixed), run)
        mapped = _resolve_args(dict(self.mapped), run)
        claves = list(mapped)
        for k in claves:
            if not isinstance(mapped[k], (list, tuple)):
                raise AirflowException("expand(%s=...) necesita una lista (o el resultado de una tarea que devuelva una lista)" % k)
        resultados = []
        combos = list(itertools.product(*[mapped[k] for k in claves]))
        print("  ↳ %s: %d instancias mapeadas" % (self.task_id, len(combos)))
        for i, combo in enumerate(combos):
            kw = dict(fixed)
            kw.update(dict(zip(claves, combo)))
            resultados.append(_call_with_context(self.python_callable, [], kw, dict(context, map_index=i)))
        return resultados


class _PartialTask:
    def __init__(self, deco, fixed):
        self.deco = deco
        self.fixed = fixed

    def expand(self, **mapped):
        dag = _CURRENT_DAG[-1] if _CURRENT_DAG else None
        if dag is None:
            raise AirflowException("expand() debe llamarse dentro de un DAG")
        base_id = self.deco.opts.get("task_id") or self.deco.fn.__name__
        tid, k = base_id, 1
        prefix = _CURRENT_GROUP[-1].prefix if _CURRENT_GROUP else ""
        while (prefix + tid) in dag.task_dict:
            tid = "%s__%d" % (base_id, k)
            k += 1
        opts = {kk: v for kk, v in self.deco.opts.items() if kk != "task_id"}
        return XComArg(_MappedDecoratedOperator(tid, self.deco.fn, self.fixed, mapped, **opts))


class _TaskNamespace:
    def __call__(self, fn=None, **opts):
        if callable(fn):
            return _TaskDecorator(fn, **opts)
        return _TaskDecorator(None, **opts)

    def branch(self, fn=None, **opts):
        if callable(fn):
            return _TaskDecorator(fn, branch=True, **opts)
        return _TaskDecorator(None, branch=True, **opts)

    def python(self, fn=None, **opts):
        return self(fn, **opts)

    def bash(self, fn=None, **opts):
        def wrap(f):
            def make(*a, **k):
                dag = _CURRENT_DAG[-1]
                cmd = f(*a, **k)
                return BashOperator(task_id=opts.get("task_id", f.__name__), bash_command=cmd, dag=dag)
            return make
        return wrap(fn) if callable(fn) else wrap


task = _TaskNamespace()


def dag(dag_id=None, **dag_kwargs):
    def wrap(fn):
        def make(*args, **kwargs):
            d = DAG(dag_kwargs.pop("dag_id", None) or (dag_id if isinstance(dag_id, str) else fn.__name__), **dag_kwargs)
            with d:
                fn(*args, **kwargs)
            return d
        make.__name__ = fn.__name__
        return make
    if callable(dag_id):
        fn, dag_id = dag_id, None
        return wrap(fn)
    return wrap


def task_group(group_id=None, **kw):
    def wrap(fn):
        def make(*a, **k):
            with TaskGroup(group_id if isinstance(group_id, str) else fn.__name__, **kw):
                return fn(*a, **k)
        return make
    if callable(group_id):
        fn = group_id
        group_id = None
        return wrap(fn)
    return wrap


def chain(*tasks):
    for a, b in zip(tasks, tasks[1:]):
        if isinstance(a, (list, tuple)) and isinstance(b, (list, tuple)):
            if len(a) != len(b):
                raise AirflowException("chain: las listas consecutivas deben tener el mismo tamaño")
            for x, y in zip(a, b):
                x >> y
        else:
            a >> b


def cross_downstream(from_tasks, to_tasks):
    for a in from_tasks:
        for b in to_tasks:
            a >> b


# ------------------------------------------------------------- Variables etc.
_VARIABLES = {}
_CONNECTIONS = {}


class Variable:
    @staticmethod
    def get(key, default_var=None, deserialize_json=False):
        if key not in _VARIABLES:
            if default_var is not None:
                return default_var
            raise KeyError("Variable %s no existe" % key)
        v = _VARIABLES[key]
        if deserialize_json:
            import json
            return json.loads(v)
        return v

    @staticmethod
    def set(key, value, serialize_json=False):
        if serialize_json:
            import json
            value = json.dumps(value)
        _VARIABLES[key] = value


class Connection:
    def __init__(self, conn_id, conn_type=None, host=None, login=None, password=None, schema=None, port=None, extra=None):
        self.conn_id = conn_id
        self.conn_type = conn_type
        self.host = host
        self.login = login
        self.password = password
        self.schema = schema
        self.port = port
        self.extra = extra
        _CONNECTIONS[conn_id] = self


class Asset:
    """Airflow 3: un dato (tabla, archivo, carpeta) que una tarea produce y otros DAGs esperan.
    Asset("s3://lago/ventas") o Asset(name="ventas", uri="s3://lago/ventas")."""
    def __init__(self, name=None, uri=None, group="asset", extra=None, watchers=None):
        if name is None and uri is None:
            raise AirflowException("Asset necesita name o uri")
        self.name = name if name is not None else uri
        self.uri = uri if uri is not None else name
        self.group = group
        self.extra = dict(extra or {})

    def __eq__(self, other):
        return isinstance(other, Asset) and other.uri == self.uri

    def __hash__(self):
        return hash(self.uri)

    def __or__(self, other):
        return AssetAny(self, other)

    def __and__(self, other):
        return AssetAll(self, other)

    def __repr__(self):
        return "Asset(name=%r, uri=%r)" % (self.name, self.uri)


class AssetAll(list):
    def __init__(self, *assets):
        super().__init__(assets)


class AssetAny(list):
    def __init__(self, *assets):
        super().__init__(assets)


class Dataset(Asset):
    """Nombre de Airflow 2 (2.4 a 2.11); en Airflow 3 se llama Asset."""
    def __init__(self, uri, extra=None):
        super().__init__(uri=uri, extra=extra)

    def __repr__(self):
        return "Dataset(%r)" % self.uri


def days_ago(n, hour=0):
    today = _dt.datetime.now().replace(hour=hour, minute=0, second=0, microsecond=0)
    return today - _dt.timedelta(days=n)


def reset():
    _DAG_REGISTRY.clear()
    _CURRENT_DAG.clear()
    _CURRENT_GROUP.clear()
    _VARIABLES.clear()
