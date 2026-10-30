"""Funciones de mini-Spark (imitan pyspark.sql.functions)."""
import builtins as _b
import datetime as _dt
import math as _math
import re as _re

from . import Column, _as_col, _col, _lit, _cast, _to_date, _to_ts, _java_fmt, _hashable, AnalysisException, _last_day, _trunc

_bsum, _bmin, _bmax, _babs, _bround = _b.sum, _b.min, _b.max, _b.abs, _b.round


def col(name):
    return _col(name)


column = col


def lit(v):
    if isinstance(v, Column):
        return v
    return _lit(v)


def expr(e):
    """Expresión SQL. Se evalúa con SQLite fila a fila (solo expresiones simples)."""
    def run(df, children):
        out = df.sparkSession._run_sql("SELECT %s AS __e FROM __t" % e, {"__t": df})
        return [r[0] for r in out._rows]
    c = Column("fn", e, [], run, rowwise_df=True)
    return c


def _fn(name, cols, f):
    cs = [_as_col(_col(c) if isinstance(c, str) else c) for c in cols]
    return Column("fn", "%s(%s)" % (name, ", ".join(c._name for c in cs)), cs, f)


def _null_safe(f):
    def g(*a):
        if any(x is None for x in a):
            return None
        return f(*a)
    return g


def _c(x):
    return _col(x) if isinstance(x, str) else _as_col(x)


# ----------------------------------------------------------- agregaciones
def _agg(name, c, f):
    cc = _c(c) if c is not None else None
    label = "%s(%s)" % (name, cc._name if cc is not None else "1")
    return Column("agg", label, [cc] if cc is not None else [], f)


def _nn(vals):
    return [v for v in vals if v is not None]


def sum(c):
    def f(vals):
        v = _nn(vals)
        return _bsum(v) if v else None
    return _agg("sum", c, f)


def avg(c):
    def f(vals):
        v = _nn(vals)
        return _bsum(v) / len(v) if v else None
    return _agg("avg", c, f)


mean = avg


def count(c="*"):
    if isinstance(c, str) and c == "*":
        return Column("agg", "count(1)", [], lambda vals: len(vals))
    cc = _c(c)
    name = "count(1)" if cc.kind == "lit" else "count(%s)" % cc._name
    return Column("agg", name, [cc], lambda vals: len(_nn(vals)))


def countDistinct(c, *cols):
    cs = [_c(c)] + [_c(x) for x in cols]
    if len(cs) == 1:
        return Column("agg", "count(DISTINCT %s)" % cs[0]._name, cs, lambda vals: len(set(_hashable(v) for v in _nn(vals))))
    tup = Column("fn", "struct", cs, lambda *a: None if any(x is None for x in a) else tuple(a))
    return Column("agg", "count(DISTINCT %s)" % ", ".join(x._name for x in cs), [tup], lambda vals: len(set(_nn(vals))))


count_distinct = countDistinct


def approx_count_distinct(c, rsd=None):
    a = countDistinct(c)
    a._name = "approx_count_distinct(%s)" % _c(c)._name
    return a


def sumDistinct(c):
    return _agg("sum(DISTINCT)", c, lambda vals: _bsum(set(_nn(vals))) if _nn(vals) else None)


sum_distinct = sumDistinct


def max(c):
    return _agg("max", c, lambda vals: _bmax(_nn(vals)) if _nn(vals) else None)


def min(c):
    return _agg("min", c, lambda vals: _bmin(_nn(vals)) if _nn(vals) else None)


def max_by(c, ord_c):
    tup = Column("fn", "pair", [_c(c), _c(ord_c)], lambda a, b: (b, a))
    return Column("agg", "max_by(%s, %s)" % (_c(c)._name, _c(ord_c)._name), [tup],
                  lambda vals: _bmax([v for v in vals if v[0] is not None], key=lambda t: t[0])[1] if vals else None)


def min_by(c, ord_c):
    tup = Column("fn", "pair", [_c(c), _c(ord_c)], lambda a, b: (b, a))
    return Column("agg", "min_by(%s, %s)" % (_c(c)._name, _c(ord_c)._name), [tup],
                  lambda vals: _bmin([v for v in vals if v[0] is not None], key=lambda t: t[0])[1] if vals else None)


def first(c, ignorenulls=False):
    def f(vals):
        if ignorenulls:
            v = _nn(vals)
            return v[0] if v else None
        return vals[0] if vals else None
    return _agg("first", c, f)


def last(c, ignorenulls=False):
    def f(vals):
        if ignorenulls:
            v = _nn(vals)
            return v[-1] if v else None
        return vals[-1] if vals else None
    return _agg("last", c, f)


def collect_list(c):
    return _agg("collect_list", c, lambda vals: _nn(vals))


def collect_set(c):
    def f(vals):
        out = []
        for v in _nn(vals):
            if v not in out:
                out.append(v)
        return out
    return _agg("collect_set", c, f)


def _var(vals, sample=True):
    v = _nn(vals)
    n = len(v)
    if n < (2 if sample else 1):
        return None
    mu = _bsum(v) / n
    return _bsum((x - mu) ** 2 for x in v) / (n - 1 if sample else n)


def stddev(c):
    return _agg("stddev", c, lambda vals: None if _var(vals) is None else _var(vals) ** 0.5)


stddev_samp = stddev
std = stddev


def stddev_pop(c):
    return _agg("stddev_pop", c, lambda vals: None if _var(vals, False) is None else _var(vals, False) ** 0.5)


def variance(c):
    return _agg("variance", c, _var)


var_samp = variance


def percentile_approx(c, percentage, accuracy=10000):
    def f(vals):
        v = sorted(_nn(vals))
        if not v:
            return None
        def one(p):
            k = _bmax(0, int(_math.ceil(p * len(v))) - 1)
            return v[k]
        return [one(p) for p in percentage] if isinstance(percentage, (list, tuple)) else one(percentage)
    return _agg("percentile_approx", c, f)


def median(c):
    def f(vals):
        v = sorted(_nn(vals))
        if not v:
            return None
        n = len(v)
        return float(v[n // 2]) if n % 2 else (v[n // 2 - 1] + v[n // 2]) / 2
    return _agg("median", c, f)


def corr(a, b):
    tup = Column("fn", "pair", [_c(a), _c(b)], lambda x, y: None if x is None or y is None else (x, y))

    def f(vals):
        v = _nn(vals)
        n = len(v)
        if n < 2:
            return None
        mx = _bsum(x for x, _ in v) / n
        my = _bsum(y for _, y in v) / n
        sxy = _bsum((x - mx) * (y - my) for x, y in v)
        sx = _bsum((x - mx) ** 2 for x, _ in v) ** 0.5
        sy = _bsum((y - my) ** 2 for _, y in v) ** 0.5
        return sxy / (sx * sy) if sx and sy else None
    return Column("agg", "corr(%s, %s)" % (_c(a)._name, _c(b)._name), [tup], f)


# ------------------------------------------------------- funciones de ventana
def _winfn(name, func, args=()):
    return Column("win", name, [], None, func=func, args=list(args), spec=None)


def row_number():
    return _winfn("row_number()", "row_number")


def rank():
    return _winfn("rank()", "rank")


def dense_rank():
    return _winfn("dense_rank()", "dense_rank")


def percent_rank():
    return _winfn("percent_rank()", "percent_rank")


def cume_dist():
    return _winfn("cume_dist()", "cume_dist")


def ntile(n):
    return _winfn("ntile(%d)" % n, "ntile", [n])


def lag(c, offset=1, default=None):
    cc = _c(c)
    return _winfn("lag(%s, %d, %s)" % (cc._name, offset, default), "lag", [cc, offset, default])


def lead(c, offset=1, default=None):
    cc = _c(c)
    return _winfn("lead(%s, %d, %s)" % (cc._name, offset, default), "lead", [cc, offset, default])


def nth_value(c, n):
    raise NotImplementedError("nth_value no está disponible en el simulador")


# -------------------------------------------------------- condicionales y nulos
def when(cond, value):
    return Column("when", "CASE WHEN %s THEN %s END" % (cond._name, _as_col(value)._name), [], None, branches=[(cond, value)])


def coalesce(*cols):
    def f(*a):
        for x in a:
            if x is not None:
                return x
        return None
    return _fn("coalesce", cols, f)


def isnull(c):
    return _c(c).isNull()


def isnan(c):
    return _fn("isnan", [c], lambda x: isinstance(x, float) and x != x)


def nanvl(a, b):
    return _fn("nanvl", [a, b], lambda x, y: y if isinstance(x, float) and x != x else x)


def greatest(*cols):
    return _fn("greatest", cols, lambda *a: _bmax(_nn(a)) if _nn(a) else None)


def least(*cols):
    return _fn("least", cols, lambda *a: _bmin(_nn(a)) if _nn(a) else None)


def ifnull(a, b):
    return coalesce(a, b)


nvl = ifnull


def nullif(a, b):
    return _fn("nullif", [a, b], lambda x, y: None if x == y else x)


# ----------------------------------------------------------- matemáticas
def _round_half_up(x, d=0):
    if x is None:
        return None
    if isinstance(x, int) and d >= 0:
        return x
    m = 10 ** d
    v = _math.floor(_babs(x) * m + 0.5 + 1e-9) / m
    v = -v if x < 0 else v
    return v if d > 0 else float(v)


def round(c, scale=0):
    return _fn("round", [c], lambda x: _round_half_up(x, scale))


def bround(c, scale=0):
    return _fn("bround", [c], _null_safe(lambda x: _bround(x, scale)))


def abs(c):
    return _fn("abs", [c], _null_safe(_babs))


def sqrt(c):
    return _fn("SQRT", [c], _null_safe(lambda x: _math.sqrt(x) if x >= 0 else None))


def pow(a, b):
    return _fn("POWER", [a, b], _null_safe(lambda x, y: float(x) ** y))


power = pow


def exp(c):
    return _fn("EXP", [c], _null_safe(_math.exp))


def log(arg1, arg2=None):
    if arg2 is None:
        return _fn("ln", [arg1], _null_safe(lambda x: _math.log(x) if x > 0 else None))
    return _fn("LOG", [arg2], _null_safe(lambda x: _math.log(x, arg1) if x > 0 else None))


def log10(c):
    return _fn("LOG10", [c], _null_safe(lambda x: _math.log10(x) if x > 0 else None))


def floor(c):
    return _fn("FLOOR", [c], _null_safe(lambda x: int(_math.floor(x))))


def ceil(c):
    return _fn("CEIL", [c], _null_safe(lambda x: int(_math.ceil(x))))


def signum(c):
    return _fn("SIGNUM", [c], _null_safe(lambda x: float((x > 0) - (x < 0))))


def rand(seed=None):
    import random
    r = random.Random(seed)
    return Column("fn", "rand()", [], lambda: r.random())


def monotonically_increasing_id():
    def run(df, children):
        return list(range(len(df._rows)))
    return Column("fn", "monotonically_increasing_id()", [], run, rowwise_df=True)


# ----------------------------------------------------------------- strings
def upper(c):
    return _fn("upper", [c], _null_safe(lambda s: str(s).upper()))


def lower(c):
    return _fn("lower", [c], _null_safe(lambda s: str(s).lower()))


def initcap(c):
    return _fn("initcap", [c], _null_safe(lambda s: " ".join(w[:1].upper() + w[1:].lower() for w in str(s).split(" "))))


def trim(c):
    return _fn("trim", [c], _null_safe(lambda s: str(s).strip(" ")))


def ltrim(c):
    return _fn("ltrim", [c], _null_safe(lambda s: str(s).lstrip(" ")))


def rtrim(c):
    return _fn("rtrim", [c], _null_safe(lambda s: str(s).rstrip(" ")))


def length(c):
    return _fn("length", [c], _null_safe(lambda s: len(str(s))))


def concat(*cols):
    def f(*a):
        if any(x is None for x in a):
            return None
        if a and all(isinstance(x, list) for x in a):
            return [y for x in a for y in x]
        return "".join(_s(x) for x in a)
    return _fn("concat", cols, f)


def _s(x):
    if isinstance(x, bool):
        return "true" if x else "false"
    return str(x)


def concat_ws(sep, *cols):
    def f(*a):
        parts = []
        for x in a:
            if x is None:
                continue
            if isinstance(x, list):
                parts.extend(_s(y) for y in x if y is not None)
            else:
                parts.append(_s(x))
        return sep.join(parts)
    return _fn("concat_ws", cols, f)


def substring(c, pos, length):
    def f(s):
        s = str(s)
        start = pos - 1 if pos > 0 else len(s) + pos
        return s[_bmax(start, 0):_bmax(start, 0) + length]
    return _fn("substring", [c], _null_safe(f))


def substring_index(c, delim, count):
    def f(s):
        parts = str(s).split(delim)
        return delim.join(parts[:count]) if count > 0 else delim.join(parts[count:])
    return _fn("substring_index", [c], _null_safe(f))


def split(c, pattern, limit=-1):
    return _fn("split", [c], _null_safe(lambda s: _re.split(pattern, str(s), maxsplit=0 if limit <= 0 else limit - 1)))


def regexp_replace(c, pattern, replacement):
    rep = _re.sub(r"\$(\d)", r"\\\1", replacement)
    return _fn("regexp_replace", [c], _null_safe(lambda s: _re.sub(pattern, rep, str(s))))


def regexp_extract(c, pattern, idx=1):
    def f(s):
        m = _re.search(pattern, str(s))
        if not m:
            return ""
        return m.group(idx) or ""
    return _fn("regexp_extract", [c], _null_safe(f))


def lpad(c, n, pad):
    return _fn("lpad", [c], _null_safe(lambda s: (pad * n + str(s))[-n:] if len(str(s)) < n else str(s)[:n]))


def rpad(c, n, pad):
    return _fn("rpad", [c], _null_safe(lambda s: (str(s) + pad * n)[:n]))


def reverse(c):
    return _fn("reverse", [c], _null_safe(lambda s: s[::-1] if isinstance(s, list) else str(s)[::-1]))


def translate(c, matching, replace):
    table = {ord(a): (replace[i] if i < len(replace) else None) for i, a in enumerate(matching)}
    return _fn("translate", [c], _null_safe(lambda s: str(s).translate(table)))


def instr(c, substr):
    return _fn("instr", [c], _null_safe(lambda s: str(s).find(substr) + 1))


def locate(substr, c, pos=1):
    return _fn("locate", [c], _null_safe(lambda s: str(s).find(substr, pos - 1) + 1))


def format_number(c, d):
    return _fn("format_number", [c], _null_safe(lambda x: ("{:,.%df}" % d).format(x)))


def format_string(fmt, *cols):
    return _fn("format_string", cols, lambda *a: fmt % a)


def md5(c):
    import hashlib
    return _fn("md5", [c], _null_safe(lambda s: hashlib.md5(str(s).encode()).hexdigest()))


def sha2(c, bits=256):
    import hashlib
    return _fn("sha2", [c], _null_safe(lambda s: hashlib.new("sha%d" % bits, str(s).encode()).hexdigest()))


def hash(*cols):
    import hashlib
    return _fn("hash", cols, lambda *a: int(hashlib.md5(repr(a).encode()).hexdigest()[:7], 16))


def xxhash64(*cols):
    return hash(*cols)


# ------------------------------------------------------------------- fechas
def current_date():
    return Column("fn", "current_date()", [], lambda: _dt.date.today())


def current_timestamp():
    return Column("fn", "current_timestamp()", [], lambda: _dt.datetime.now().replace(microsecond=0))


now = current_timestamp


def to_date(c, fmt=None):
    c2 = _fn("to_date", [c], lambda v: _to_date(v, fmt))
    from . import types as T
    c2.kw["dtype"] = T.DateType()
    return c2


def to_timestamp(c, fmt=None):
    c2 = _fn("to_timestamp", [c], lambda v: _to_ts(v, fmt))
    from . import types as T
    c2.kw["dtype"] = T.TimestampType()
    return c2


def _d(f):
    def g(v):
        d = _to_ts(v) if not isinstance(v, _dt.date) or isinstance(v, _dt.datetime) else v
        if d is None:
            return None
        return f(d)
    return g


def year(c): return _fn("year", [c], _d(lambda d: d.year))
def month(c): return _fn("month", [c], _d(lambda d: d.month))
def dayofmonth(c): return _fn("dayofmonth", [c], _d(lambda d: d.day))
def dayofweek(c): return _fn("dayofweek", [c], _d(lambda d: (d.isoweekday() % 7) + 1))
def dayofyear(c): return _fn("dayofyear", [c], _d(lambda d: d.timetuple().tm_yday))
def weekofyear(c): return _fn("weekofyear", [c], _d(lambda d: d.isocalendar()[1]))
def quarter(c): return _fn("quarter", [c], _d(lambda d: (d.month - 1) // 3 + 1))
def hour(c): return _fn("hour", [c], _d(lambda d: getattr(d, "hour", 0)))
def minute(c): return _fn("minute", [c], _d(lambda d: getattr(d, "minute", 0)))
def second(c): return _fn("second", [c], _d(lambda d: getattr(d, "second", 0)))


day = dayofmonth


def date_format(c, fmt):
    return _fn("date_format", [c], lambda v: None if _to_ts(v) is None else _to_ts(v).strftime(_java_fmt(fmt)))


def datediff(end, start):
    return _fn("datediff", [end, start], lambda a, b: None if _to_date(a) is None or _to_date(b) is None else (_to_date(a) - _to_date(b)).days)


def date_add(c, days):
    return _fn("date_add", [c], lambda v: None if _to_date(v) is None else _to_date(v) + _dt.timedelta(days=days))


def date_sub(c, days):
    return _fn("date_sub", [c], lambda v: None if _to_date(v) is None else _to_date(v) - _dt.timedelta(days=days))


def add_months(c, n):
    def f(v):
        d = _to_date(v)
        if d is None:
            return None
        m = d.month - 1 + n
        y = d.year + m // 12
        m = m % 12 + 1
        import calendar
        return _dt.date(y, m, _bmin(d.day, calendar.monthrange(y, m)[1]))
    return _fn("add_months", [c], f)


def months_between(end, start, roundOff=True):
    def f(a, b):
        a, b = _to_date(a), _to_date(b)
        if a is None or b is None:
            return None
        r = (a.year - b.year) * 12 + (a.month - b.month) + (a.day - b.day) / 31
        return _bround(r, 8) if roundOff else r
    return _fn("months_between", [end, start], f)


def last_day(c):
    return _fn("last_day", [c], lambda v: None if _to_date(v) is None else _last_day(_to_date(v)))


def trunc(c, fmt):
    return _fn("trunc", [c], lambda v: None if v is None else _to_date(_trunc(v, fmt, as_date=True)))


def date_trunc(fmt, c):
    return _fn("date_trunc", [c], lambda v: None if v is None else _to_ts(_trunc(v, fmt)))


def unix_timestamp(c=None, fmt=None):
    if c is None:
        return Column("fn", "unix_timestamp()", [], lambda: int(_dt.datetime.now().timestamp()))
    return _fn("unix_timestamp", [c], lambda v: None if _to_ts(v, fmt) is None else int(_to_ts(v, fmt).replace(tzinfo=_dt.timezone.utc).timestamp()))


def from_unixtime(c, fmt="yyyy-MM-dd HH:mm:ss"):
    return _fn("from_unixtime", [c], _null_safe(lambda x: _dt.datetime.fromtimestamp(x, _dt.timezone.utc).strftime(_java_fmt(fmt))))


def make_date(y, m, d):
    return _fn("make_date", [y, m, d], _null_safe(lambda a, b, c: _dt.date(int(a), int(b), int(c))))


def sequence(start, stop, step=None):
    def f(a, b, *s):
        st = s[0] if s else (1 if b >= a else -1)
        if isinstance(a, _dt.date):
            out, cur = [], a
            delta = _dt.timedelta(days=st if isinstance(st, int) else 1)
            while cur <= b:
                out.append(cur)
                cur = cur + delta
            return out
        return list(range(a, b + (1 if st > 0 else -1), st))
    cols = [start, stop] + ([step] if step is not None else [])
    return _fn("sequence", cols, _null_safe(f))


# ------------------------------------------------------------------ arrays
def array(*cols):
    if len(cols) == 1 and isinstance(cols[0], (list, tuple)):
        cols = cols[0]
    return _fn("array", cols, lambda *a: list(a))


def size(c):
    return _fn("size", [c], lambda x: -1 if x is None else len(x))


def array_contains(c, value):
    return _fn("array_contains", [c], _null_safe(lambda a: value in a))


def array_distinct(c):
    return _fn("array_distinct", [c], _null_safe(lambda a: list(dict.fromkeys(a))))


def array_sort(c):
    return _fn("array_sort", [c], _null_safe(lambda a: sorted(a)))


sort_array = array_sort


def array_join(c, delim, null_replacement=None):
    return _fn("array_join", [c], _null_safe(lambda a: delim.join(_s(x) if x is not None else (null_replacement or "") for x in a if x is not None or null_replacement)))


def element_at(c, idx):
    def f(a):
        if isinstance(a, dict):
            return a.get(idx)
        try:
            return a[idx - 1] if idx > 0 else a[idx]
        except IndexError:
            return None
    return _fn("element_at", [c], _null_safe(f))


def explode(c):
    cc = _c(c)
    return Column("fn", "col", [cc], None, explode=True)


def explode_outer(c):
    cc = _c(c)
    return Column("fn", "col", [cc], None, explode=True, outer=True)


def posexplode(c):
    raise NotImplementedError("posexplode no está disponible en el simulador; usa explode")


def struct(*cols):
    from . import _mkrow
    cs = [_c(x) for x in (cols[0] if len(cols) == 1 and isinstance(cols[0], (list, tuple)) else cols)]
    names = [x._name for x in cs]
    return Column("fn", "struct(%s)" % ", ".join(names), cs, lambda *a: _mkrow(names, a))


def create_map(*cols):
    cs = [_c(x) for x in cols]

    def f(*a):
        return {a[i]: a[i + 1] for i in range(0, len(a), 2)}
    return Column("fn", "map(...)", cs, f)


def to_json(c):
    import json
    from . import _jsonable

    def f(v):
        if hasattr(v, "asDict"):
            v = v.asDict()
        return json.dumps(v, default=_jsonable, ensure_ascii=False, separators=(",", ":"))
    return _fn("to_json", [c], _null_safe(f))


def from_json(c, schema, options=None):
    import json
    return _fn("from_json", [c], _null_safe(lambda s: json.loads(s)))


def get_json_object(c, path):
    import json

    def f(s):
        try:
            v = json.loads(s)
            for part in path.lstrip("$").strip(".").split("."):
                if part:
                    v = v[part]
            return v if not isinstance(v, (dict, list)) else json.dumps(v)
        except (ValueError, KeyError, TypeError):
            return None
    return _fn("get_json_object", [c], _null_safe(f))


# --------------------------------------------------------------------- otros
def asc(c):
    return _c(c).asc()


def desc(c):
    return _c(c).desc()


def asc_nulls_last(c): return _c(c).asc_nulls_last()
def desc_nulls_first(c): return _c(c).desc_nulls_first()


def broadcast(df):
    return df


def input_file_name():
    return lit("simulado://archivo")


def udf(f=None, returnType=None):
    """Convierte una función Python en una función de columnas (UDF)."""
    def wrap(func):
        def make(*cols):
            c = _fn(getattr(func, "__name__", "udf"), cols, lambda *a: _cast(func(*a), returnType) if returnType is not None else func(*a))
            return c
        make.func = func
        return make
    if callable(f):
        return wrap(f)
    if f is not None and returnType is None:
        returnType = f
    return wrap


def pandas_udf(*a, **k):
    raise NotImplementedError("pandas_udf no está disponible en el simulador")


def transform(c, f):
    class _Lam:
        pass

    def g(arr):
        out = []
        for x in arr:
            from . import DataFrame
            tmp = DataFrame(["x"], [(x,)])
            out.append(f(_col("x"))._eval(tmp)[0])
        return out
    return _fn("transform", [c], _null_safe(g))


def filter(c, f):
    def g(arr):
        from . import DataFrame
        out = []
        for x in arr:
            tmp = DataFrame(["x"], [(x,)])
            if f(_col("x"))._eval(tmp)[0]:
                out.append(x)
        return out
    return _fn("filter", [c], _null_safe(g))


def aggregate(*a, **k):
    raise NotImplementedError("aggregate no está disponible en el simulador")


# ---------------------------------------------------------------- Spark 4: funciones try_ (NULL en vez de error ANSI)
def try_divide(a, b):
    a, b = _col(a), _col(b)
    return _fn("try_divide", [a, b], lambda x, y: None if x is None or y in (None, 0) else x / y)


def try_add(a, b):
    a, b = _col(a), _col(b)
    return _fn("try_add", [a, b], lambda x, y: None if x is None or y is None else x + y)


def try_multiply(a, b):
    a, b = _col(a), _col(b)
    return _fn("try_multiply", [a, b], lambda x, y: None if x is None or y is None else x * y)


def try_to_number(c, fmt=None):
    def f(x):
        if x is None:
            return None
        s = _re.sub(r"[^0-9.\-]", "", str(x).replace(",", ""))
        try:
            return float(s) if s not in ("", "-", ".") else None
        except ValueError:
            return None
    return _fn("try_to_number", [_col(c)], f)


def try_element_at(c, idx):
    def f(a):
        if a is None:
            return None
        if isinstance(a, dict):
            return a.get(idx)
        try:
            return a[idx - 1] if idx > 0 else a[idx]
        except IndexError:
            return None
    return _fn("try_element_at", [_col(c)], f)


def try_to_timestamp(c, fmt=None):
    return _fn("try_to_timestamp", [_col(c)], lambda x: None if x is None else _to_ts(x))
