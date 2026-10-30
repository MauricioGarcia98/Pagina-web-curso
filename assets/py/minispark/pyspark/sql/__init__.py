"""
mini-Spark: un simulador educativo de la API de PySpark escrito en Python puro.

Implementa un subconjunto amplio de pyspark.sql para que puedas practicar la
sintaxis en el navegador. NO es Spark real: no hay ejecutores, ni particiones
reales, ni optimizador Catalyst. Para producción usa Spark/Databricks.
"""
import datetime as _dt
import re as _re
import sqlite3 as _sqlite3

__all__ = ["SparkSession", "DataFrame", "Column", "Row", "Window", "functions", "types"]

_CATALOG = {}        # tablas registradas (saveAsTable / tablas de ejemplo)
_TEMP_VIEWS = {}     # vistas temporales
_FILES = {}          # "sistema de archivos" virtual: ruta -> DataFrame
_RAW = {}            # tablas de ejemplo sin convertir (se convierten al primer uso)
_CACHE = {}          # tablas de ejemplo ya convertidas


def _lazy_get(name):
    """Devuelve una tabla del catálogo, convirtiendo las de ejemplo solo cuando se usan."""
    if name in _CATALOG:
        return _CATALOG[name]
    if name in _CACHE:
        return _CACHE[name]
    if name in _RAW:
        _CACHE[name] = _load_sample_tables({name: _RAW[name]})[name]
        return _CACHE[name]
    return None


def _all_table_names():
    return set(_CATALOG) | set(_RAW)


class AnalysisException(Exception):
    pass


class NumberFormatException(Exception):
    """Spark 4 con modo ANSI: un texto que no se puede convertir (error CAST_INVALID_INPUT)."""


class ArithmeticException(Exception):
    """Spark 4 con modo ANSI: división por cero (DIVIDE_BY_ZERO) o desbordamiento."""


def _ansi():
    """spark.sql.ansi.enabled: true por defecto desde Spark 4.0."""
    s = SparkSession._active if "SparkSession" in globals() else None
    v = s.conf.get("spark.sql.ansi.enabled", "true") if s is not None else "true"
    return str(v).lower() == "true"


# --------------------------------------------------------------------------- Row
class Row(tuple):
    def __new__(cls, *args, **kwargs):
        if kwargs and not args:
            r = tuple.__new__(cls, kwargs.values())
            r.__fields__ = list(kwargs.keys())
            return r
        r = tuple.__new__(cls, args)
        r.__fields__ = None
        return r

    def __getattr__(self, item):
        f = tuple.__getattribute__(self, "__fields__")
        if f and item in f:
            return self[f.index(item)]
        raise AttributeError(item)

    def __getitem__(self, item):
        if isinstance(item, str):
            f = tuple.__getattribute__(self, "__fields__")
            if f and item in f:
                return tuple.__getitem__(self, f.index(item))
            raise ValueError(item)
        return tuple.__getitem__(self, item)

    def asDict(self):
        return dict(zip(self.__fields__ or [], self))

    def __repr__(self):
        if self.__fields__:
            return "Row(" + ", ".join("%s=%r" % (k, v) for k, v in zip(self.__fields__, self)) + ")"
        return "<Row(" + ", ".join(repr(v) for v in self) + ")>"


def _mkrow(names, values):
    r = tuple.__new__(Row, values)
    r.__fields__ = list(names)
    return r


# ------------------------------------------------------------------------- tipos
def _infer_type(v):
    from . import types as T
    if v is None:
        return T.NullType()
    if isinstance(v, bool):
        return T.BooleanType()
    if isinstance(v, int):
        return T.LongType()
    if isinstance(v, float):
        return T.DoubleType()
    if isinstance(v, _dt.datetime):
        return T.TimestampType()
    if isinstance(v, _dt.date):
        return T.DateType()
    if isinstance(v, (list, tuple)):
        inner = next((x for x in v if x is not None), None)
        return T.ArrayType(_infer_type(inner) if inner is not None else T.StringType())
    if isinstance(v, dict):
        return T.MapType(T.StringType(), T.StringType())
    return T.StringType()


def _cast(v, typ, lenient=False):
    """CAST de Spark. Con el modo ANSI (Spark 4) un valor inválido es un error; con try_cast o sin ANSI, NULL."""
    r = _cast_raw(v, typ)
    if r is _CAST_FALLA:
        if lenient or not _ansi():
            return None
        from . import types as T
        tn = typ if isinstance(typ, str) else typ.simpleString()
        raise NumberFormatException("[CAST_INVALID_INPUT] The value '%s' of the type \"STRING\" cannot be cast to \"%s\" "
                                    "because it is malformed. Use `try_cast` to tolerate malformed input and return NULL instead. "
                                    "(modo ANSI de Spark 4: spark.sql.ansi.enabled=true)" % (v, str(tn).upper()))
    return r


_CAST_FALLA = object()


def _cast_raw(v, typ):
    from . import types as T
    if v is None:
        return None
    if isinstance(typ, str):
        typ = T._parse_type(typ)
    try:
        if isinstance(typ, (T.IntegerType, T.LongType, T.ShortType)):
            if isinstance(v, str):
                v = v.strip()
                if not v:
                    return _CAST_FALLA
                return int(float(v))
            return int(v)
        if isinstance(typ, (T.DoubleType, T.FloatType, T.DecimalType)):
            r = float(v)
            if isinstance(typ, T.DecimalType):
                r = round(r, typ.scale)
            return r
        if isinstance(typ, T.StringType):
            if isinstance(v, bool):
                return "true" if v else "false"
            if isinstance(v, float) and v.is_integer():
                return str(v)
            return str(v)
        if isinstance(typ, T.BooleanType):
            if isinstance(v, str):
                s = v.strip().lower()
                if s in ("true", "1", "t", "yes", "y"):
                    return True
                if s in ("false", "0", "f", "no", "n"):
                    return False
                return _CAST_FALLA
            return bool(v)
        if isinstance(typ, T.DateType):
            r = _to_date(v)
            return _CAST_FALLA if r is None and str(v).strip() else r
        if isinstance(typ, T.TimestampType):
            r = _to_ts(v)
            return _CAST_FALLA if r is None and str(v).strip() else r
    except (ValueError, TypeError):
        return _CAST_FALLA
    return v


def _to_date(v, fmt=None):
    if v is None:
        return None
    if isinstance(v, _dt.datetime):
        return v.date()
    if isinstance(v, _dt.date):
        return v
    s = str(v).strip()
    try:
        if fmt:
            return _dt.datetime.strptime(s, _java_fmt(fmt)).date()
        return _dt.date.fromisoformat(s[:10])
    except ValueError:
        return None


def _to_ts(v, fmt=None):
    if v is None:
        return None
    if isinstance(v, _dt.datetime):
        return v
    if isinstance(v, _dt.date):
        return _dt.datetime(v.year, v.month, v.day)
    s = str(v).strip().replace("T", " ")
    try:
        if fmt:
            return _dt.datetime.strptime(s, _java_fmt(fmt))
        return _dt.datetime.fromisoformat(s)
    except ValueError:
        return None


def _java_fmt(fmt):
    rep = [("yyyy", "%Y"), ("yy", "%y"), ("MMMM", "%B"), ("MMM", "%b"), ("MM", "%m"), ("dd", "%d"),
           ("HH", "%H"), ("mm", "%M"), ("ss", "%S"), ("EEEE", "%A"), ("EEE", "%a")]
    out = fmt
    for a, b in rep:
        out = out.replace(a, b)
    return out


# ------------------------------------------------------------------- expresiones
class Column:
    """Una expresión sobre columnas. Se evalúa de forma vectorizada."""

    def __init__(self, kind, name, children=(), fn=None, **kw):
        self.kind = kind          # 'ref','lit','fn','agg','win','when','star','sort'
        self._name = name
        self.children = list(children)
        self.fn = fn
        self.kw = kw

    # ---- nombres
    def _out_name(self):
        return self.kw.get("alias", self._name)

    def alias(self, name, **_):
        c = Column(self.kind, self._name, self.children, self.fn, **self.kw)
        c.kw["alias"] = name
        return c

    name = alias

    def __repr__(self):
        return "Column<'%s'>" % self._name

    def __bool__(self):
        raise ValueError("No se puede convertir una Column en bool. Usa '&' en lugar de 'and', '|' en lugar de 'or' y '~' en lugar de 'not'. "
                         "Recuerda poner paréntesis: (F.col('a') > 1) & (F.col('b') < 5)")

    __hash__ = object.__hash__

    def __iter__(self):
        raise TypeError("Column no es iterable")

    # ---- evaluación
    def _has(self, kind):
        return self.kind == kind or any(c._has(kind) for c in self.children if isinstance(c, Column))

    def _eval(self, df):
        """Devuelve una lista con un valor por fila de df."""
        k = self.kind
        if k == "ref":
            idx, path = df._resolve_path(self._name, self.kw.get("df_id"))
            if path:
                return [_get_path(r[idx], path) for r in df._rows]
            return [r[idx] for r in df._rows]
        if k == "lit":
            return [self.kw["value"]] * len(df._rows)
        if k == "fn":
            if self.kw.get("rowwise_df"):
                return self.fn(df, self.children)
            vecs = [c._eval(df) for c in self.children]
            if not vecs:
                return [self.fn() for _ in df._rows]
            return [self.fn(*vals) for vals in zip(*vecs)]
        if k == "when":
            n = len(df._rows)
            out = [None] * n
            done = [False] * n
            for cond, val in self.kw["branches"]:
                cv = cond._eval(df)
                vv = _as_col(val)._eval(df)
                for i in range(n):
                    if not done[i] and cv[i]:
                        out[i] = vv[i]
                        done[i] = True
            if "otherwise" in self.kw:
                ov = _as_col(self.kw["otherwise"])._eval(df)
                for i in range(n):
                    if not done[i]:
                        out[i] = ov[i]
            return out
        if k == "win":
            if self.kw.get("spec") is None:
                raise AnalysisException("La función de ventana '%s' necesita .over(Window.partitionBy(...).orderBy(...))" % self._name)
            return _eval_window(self, df)
        if k == "sort":
            return self.children[0]._eval(df)
        if k == "agg":
            raise AnalysisException(
                "La función de agregación '%s' debe usarse dentro de groupBy(...).agg(...), df.agg(...) o con .over(ventana)." % self._name)
        raise AnalysisException("Expresión no soportada: %s" % self._name)

    def _eval_group(self, df):
        """Evalúa en contexto de agregación: df son las filas de un grupo -> un valor."""
        k = self.kind
        if k == "agg":
            vals = self.children[0]._eval(df) if self.children else [1] * len(df._rows)
            return self.fn(vals)
        if k == "lit":
            return self.kw["value"]
        if k == "ref":
            vals = self._eval(df)
            return vals[0] if vals else None
        if k == "fn":
            if self.kw.get("rowwise_df"):
                vals = self.fn(df, self.children)
                return vals[0] if vals else None
            return self.fn(*[c._eval_group(df) for c in self.children])
        if k == "when":
            for cond, val in self.kw["branches"]:
                if cond._eval_group(df):
                    return _as_col(val)._eval_group(df)
            return _as_col(self.kw.get("otherwise"))._eval_group(df) if "otherwise" in self.kw else None
        raise AnalysisException("Expresión no válida en agregación: %s" % self._name)

    # ---- operadores
    def _bin(self, other, op, sym, reverse=False):
        o = _as_col(other)
        a, b = (o, self) if reverse else (self, o)

        def f(x, y):
            if x is None or y is None:
                return None
            if type(x) is not type(y):
                x, y = _coerce(x, y)
            try:
                return op(x, y)
            except ZeroDivisionError:
                if _ansi():
                    raise ArithmeticException("[DIVIDE_BY_ZERO] Division by zero. Use `try_divide` to tolerate divisor being 0 and return NULL instead. "
                                              "(modo ANSI de Spark 4: spark.sql.ansi.enabled=true)")
                return None
            except TypeError:
                raise AnalysisException("No se puede aplicar '%s' entre %r y %r" % (sym, x, y))
        return Column("fn", "(%s %s %s)" % (a._name, sym, b._name), [a, b], f, op=sym)

    def __add__(self, o): return self._bin(o, lambda x, y: x + y, "+")
    def __radd__(self, o): return self._bin(o, lambda x, y: x + y, "+", True)
    def __sub__(self, o): return self._bin(o, lambda x, y: x - y, "-")
    def __rsub__(self, o): return self._bin(o, lambda x, y: x - y, "-", True)
    def __mul__(self, o): return self._bin(o, lambda x, y: x * y, "*")
    def __rmul__(self, o): return self._bin(o, lambda x, y: x * y, "*", True)
    def __truediv__(self, o): return self._bin(o, lambda x, y: x / y, "/")
    def __rtruediv__(self, o): return self._bin(o, lambda x, y: x / y, "/", True)
    def __mod__(self, o): return self._bin(o, lambda x, y: x % y, "%")
    def __pow__(self, o): return self._bin(o, lambda x, y: x ** y, "**")
    def __eq__(self, o): return self._bin(o, lambda x, y: x == y, "=")
    def __ne__(self, o): return self._bin(o, lambda x, y: x != y, "!=")
    def __lt__(self, o): return self._bin(o, lambda x, y: x < y, "<")
    def __le__(self, o): return self._bin(o, lambda x, y: x <= y, "<=")
    def __gt__(self, o): return self._bin(o, lambda x, y: x > y, ">")
    def __ge__(self, o): return self._bin(o, lambda x, y: x >= y, ">=")

    def __neg__(self):
        return Column("fn", "(- %s)" % self._name, [self], lambda x: None if x is None else -x)

    def __and__(self, o):
        o = _as_col(o)

        def f(x, y):
            if x is False or y is False:
                return False
            if x is None or y is None:
                return None
            return bool(x and y)
        return Column("fn", "(%s AND %s)" % (self._name, o._name), [self, o], f, op="and")

    def __or__(self, o):
        o = _as_col(o)

        def f(x, y):
            if x is True or y is True:
                return True
            if x is None or y is None:
                return None
            return bool(x or y)
        return Column("fn", "(%s OR %s)" % (self._name, o._name), [self, o], f)

    def __invert__(self):
        return Column("fn", "(NOT %s)" % self._name, [self], lambda x: None if x is None else not x)

    __rand__ = __and__
    __ror__ = __or__

    def eqNullSafe(self, o):
        o = _as_col(o)
        return Column("fn", "(%s <=> %s)" % (self._name, o._name), [self, o], lambda x, y: x == y)

    # ---- métodos
    def isNull(self):
        return Column("fn", "(%s IS NULL)" % self._name, [self], lambda x: x is None)

    def isNotNull(self):
        return Column("fn", "(%s IS NOT NULL)" % self._name, [self], lambda x: x is not None)

    def isin(self, *vals):
        if len(vals) == 1 and isinstance(vals[0], (list, tuple, set)):
            vals = list(vals[0])
        s = list(vals)
        return Column("fn", "(%s IN (%s))" % (self._name, ", ".join(map(str, s))), [self], lambda x: None if x is None else x in s)

    def between(self, lo, hi):
        return (self >= lo) & (self <= hi)

    def like(self, pat):
        rx = _like_to_regex(pat)
        return Column("fn", "%s LIKE %s" % (self._name, pat), [self], lambda x: None if x is None else bool(rx.match(str(x))))

    def ilike(self, pat):
        rx = _like_to_regex(pat, _re.I)
        return Column("fn", "%s ILIKE %s" % (self._name, pat), [self], lambda x: None if x is None else bool(rx.match(str(x))))

    def rlike(self, pat):
        rx = _re.compile(pat)
        return Column("fn", "%s RLIKE %s" % (self._name, pat), [self], lambda x: None if x is None else bool(rx.search(str(x))))

    def contains(self, s):
        o = _as_col(s)
        return Column("fn", "contains(%s, %s)" % (self._name, o._name), [self, o],
                      lambda x, y: None if x is None or y is None else str(y) in str(x))

    def startswith(self, s):
        return Column("fn", "startswith(%s, %s)" % (self._name, s), [self], lambda x: None if x is None else str(x).startswith(s))

    def endswith(self, s):
        return Column("fn", "endswith(%s, %s)" % (self._name, s), [self], lambda x: None if x is None else str(x).endswith(s))

    def substr(self, start, length):
        return Column("fn", "substring(%s, %s, %s)" % (self._name, start, length), [self],
                      lambda x: None if x is None else str(x)[max(start - 1, 0):max(start - 1, 0) + length])

    def cast(self, typ):
        tname = typ if isinstance(typ, str) else typ.simpleString()
        return Column("fn", "CAST(%s AS %s)" % (self._name, tname.upper()), [self], lambda x: _cast(x, typ))

    astype = cast

    def try_cast(self, typ):
        tname = typ if isinstance(typ, str) else typ.simpleString()
        return Column("fn", "TRY_CAST(%s AS %s)" % (self._name, tname.upper()), [self], lambda x: _cast(x, typ, lenient=True))

    def desc(self):
        return Column("sort", self._name, [self], asc=False, nulls_first=False)

    def asc(self):
        return Column("sort", self._name, [self], asc=True, nulls_first=True)

    def desc_nulls_last(self): return Column("sort", self._name, [self], asc=False, nulls_first=False)
    def desc_nulls_first(self): return Column("sort", self._name, [self], asc=False, nulls_first=True)
    def asc_nulls_last(self): return Column("sort", self._name, [self], asc=True, nulls_first=False)
    def asc_nulls_first(self): return Column("sort", self._name, [self], asc=True, nulls_first=True)

    def when(self, cond, val):
        if self.kind != "when":
            raise AnalysisException("when() solo puede encadenarse después de F.when(...)")
        c = Column("when", self._name, [], None, branches=self.kw["branches"] + [(cond, val)])
        return c

    def otherwise(self, val):
        if self.kind != "when":
            raise AnalysisException("otherwise() solo puede usarse después de F.when(...)")
        kw = dict(self.kw)
        kw["otherwise"] = val
        return Column("when", self._name, [], None, **kw)

    def over(self, window=None):
        from .window import WindowSpec
        w = window or WindowSpec()
        if self.kind == "agg":
            return Column("win", "%s OVER (...)" % self._name, self.children, None, agg=self, spec=w)
        if self.kind == "win":
            return Column("win", self._name, self.children, None, func=self.kw.get("func"), args=self.kw.get("args"), spec=w)
        raise AnalysisException("over() solo aplica a funciones de agregación o de ventana (row_number, rank, lag...)")

    def getItem(self, key):
        return Column("fn", "%s[%s]" % (self._name, key), [self], lambda x: _get_item(x, key))

    def __getitem__(self, key):
        return self.getItem(key)

    def getField(self, name):
        return self.getItem(name)


def _get_item(x, key):
    if x is None:
        return None
    try:
        return x[key]
    except (IndexError, KeyError, TypeError):
        return None


def _coerce(x, y):
    """Conversión implícita al comparar tipos distintos, como hace Spark."""
    def conv(v, ref):
        if isinstance(v, str):
            if isinstance(ref, _dt.datetime):
                return _to_ts(v)
            if isinstance(ref, _dt.date):
                return _to_date(v)
            if isinstance(ref, bool):
                return v.strip().lower() == "true"
            if isinstance(ref, (int, float)):
                try:
                    return float(v)
                except ValueError:
                    return v
        if isinstance(v, _dt.datetime) and type(ref) is _dt.date:
            return v.date()
        return v
    return conv(x, y), conv(y, x)


def _get_path(v, path):
    for p in path:
        if v is None:
            return None
        try:
            v = v[p]
        except (KeyError, IndexError, TypeError, ValueError):
            raise AnalysisException("El campo '%s' no existe en el struct" % p)
    return v


def _like_to_regex(pat, flags=0):
    out = ""
    for ch in pat:
        if ch == "%":
            out += ".*"
        elif ch == "_":
            out += "."
        else:
            out += _re.escape(ch)
    return _re.compile("^" + out + "$", flags | _re.S)


def _lit(v):
    c = Column("lit", "NULL" if v is None else (str(v).lower() if isinstance(v, bool) else str(v)))
    c.kw["value"] = v
    return c


def _as_col(x):
    if isinstance(x, Column):
        return x
    return _lit(x)


def _col(name, df_id=None):
    if isinstance(name, Column):
        return name
    if name == "*":
        return Column("star", "*")
    c = Column("ref", name)
    if df_id is not None:
        c.kw["df_id"] = df_id
    return c


# ----------------------------------------------------------------------- ventanas
def _sort_key_fn(sort_specs, df):
    """Devuelve una función índice -> clave de orden y un comparador estable."""
    cols = []
    for s in sort_specs:
        if s.kind == "sort":
            cols.append((s.children[0]._eval(df), s.kw["asc"], s.kw["nulls_first"]))
        else:
            cols.append((s._eval(df), True, True))
    return cols


def _order_indices(idxs, cols):
    import functools

    def cmp(i, j):
        for vals, asc, nulls_first in cols:
            a, b = vals[i], vals[j]
            if a == b:
                continue
            if a is None:
                return -1 if nulls_first else 1
            if b is None:
                return 1 if nulls_first else -1
            try:
                r = -1 if a < b else 1
            except TypeError:
                r = -1 if str(a) < str(b) else 1
            return r if asc else -r
        return 0
    return sorted(idxs, key=functools.cmp_to_key(cmp))


def _eval_window(col, df):
    spec = col.kw["spec"]
    n = len(df._rows)
    part_vecs = [_as_col(p)._eval(df) for p in spec._partition]
    groups = {}
    for i in range(n):
        key = tuple(_hashable(v[i]) for v in part_vecs)
        groups.setdefault(key, []).append(i)
    order_cols = _sort_key_fn([_sortable(o) for o in spec._order], df) if spec._order else []
    out = [None] * n
    agg = col.kw.get("agg")
    func = col.kw.get("func")
    args = col.kw.get("args") or []
    for idxs in groups.values():
        ordered = _order_indices(idxs, order_cols) if order_cols else list(idxs)
        okeys = [tuple(_hashable(c[0][i]) for c in order_cols) for i in ordered]
        if func is not None:
            if func in ("row_number", "rank", "dense_rank", "percent_rank", "ntile", "cume_dist"):
                rank = dense = 0
                prev = object()
                m = len(ordered)
                for pos, i in enumerate(ordered):
                    if okeys[pos] != prev:
                        rank = pos + 1
                        dense += 1
                        prev = okeys[pos]
                    if func == "row_number":
                        out[i] = pos + 1
                    elif func == "rank":
                        out[i] = rank
                    elif func == "dense_rank":
                        out[i] = dense
                    elif func == "percent_rank":
                        out[i] = 0.0 if m == 1 else (rank - 1) / (m - 1)
                    elif func == "ntile":
                        k = args[0]
                        out[i] = pos * k // m + 1
                    elif func == "cume_dist":
                        last = max(p for p in range(m) if okeys[p] == okeys[pos])
                        out[i] = (last + 1) / m
            elif func in ("lag", "lead"):
                vals = args[0]._eval(df)
                off = args[1] if len(args) > 1 else 1
                default = args[2] if len(args) > 2 else None
                for pos, i in enumerate(ordered):
                    j = pos - off if func == "lag" else pos + off
                    out[i] = vals[ordered[j]] if 0 <= j < len(ordered) else default
            elif func in ("first_value", "last_value"):
                vals = args[0]._eval(df)
                for pos, i in enumerate(ordered):
                    if func == "first_value":
                        out[i] = vals[ordered[0]]
                    else:
                        out[i] = vals[ordered[pos]] if spec._order and spec._frame is None else vals[ordered[-1]]
            continue
        # agregación sobre ventana
        vals = agg.children[0]._eval(df) if agg.children else [1] * n
        frame = spec._frame
        m = len(ordered)
        for pos, i in enumerate(ordered):
            if frame is not None:
                kind, lo, hi = frame
                if kind == "rows":
                    a = 0 if lo is None else max(0, pos + lo)
                    b = m - 1 if hi is None else min(m - 1, pos + hi)
                    sel = ordered[a:b + 1]
                else:  # rangeBetween sobre valores del orden (solo un campo numérico)
                    ov = order_cols[0][0]
                    cur = ov[i]
                    sel = [j for j in ordered if (lo is None or ov[j] >= cur + lo) and (hi is None or ov[j] <= cur + hi)]
            elif spec._order:
                # por defecto: RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW (incluye empates)
                last = pos
                while last + 1 < m and okeys[last + 1] == okeys[pos]:
                    last += 1
                sel = ordered[:last + 1]
            else:
                sel = ordered
            out[i] = agg.fn([vals[j] for j in sel])
    return out


def _sortable(o):
    if isinstance(o, Column):
        return o
    return _col(o)


def _hashable(v):
    if isinstance(v, list):
        return tuple(_hashable(x) for x in v)
    if isinstance(v, dict):
        return tuple(sorted(v.items()))
    return v


# ---------------------------------------------------------------------- DataFrame
class _Field:
    __slots__ = ("name", "quals")

    def __init__(self, name, quals=()):
        self.name = name
        self.quals = set(quals)


_df_counter = [0]


class DataFrame:
    def __init__(self, fields, rows, session=None, schema_types=None):
        _df_counter[0] += 1
        self._id = _df_counter[0]
        self._fields = [_Field(f.name, f.quals) if isinstance(f, _Field) else _Field(f) for f in fields]
        for f in self._fields:
            f.quals.add(self._id)
        self._rows = [tuple(r) for r in rows]
        self._session = session
        self._types = schema_types
        self._partitions = 8
        self._cached = False

    # ---- utilidades internas
    def _resolve(self, name, df_id=None):
        qual = None
        if df_id is None and "." in name and name not in [f.name for f in self._fields]:
            qual, name = name.split(".", 1)
        name = name.strip("`")
        matches = [i for i, f in enumerate(self._fields) if f.name == name and
                   (df_id is None or df_id in f.quals) and (qual is None or qual in f.quals)]
        if not matches:
            matches_ci = [i for i, f in enumerate(self._fields) if f.name.lower() == name.lower() and
                          (df_id is None or df_id in f.quals) and (qual is None or qual in f.quals)]
            matches = matches_ci
        if not matches:
            raise AnalysisException("[UNRESOLVED_COLUMN] No se encuentra la columna '%s'. Columnas disponibles: %s"
                                    % ((qual + "." if qual else "") + name, [f.name for f in self._fields]))
        if len(matches) > 1:
            raise AnalysisException("[AMBIGUOUS_REFERENCE] La columna '%s' es ambigua (aparece %d veces). "
                                    "Usa df1['%s'] / df1.alias('a') + F.col('a.%s') o renómbrala antes del join."
                                    % (name, len(matches), name, name))
        return matches[0]

    def _resolve_path(self, name, df_id=None):
        """Como _resolve, pero acepta 'struct.campo' y devuelve (índice, [campos])."""
        try:
            return self._resolve(name, df_id), []
        except AnalysisException:
            if "." not in name:
                raise
            parts = name.split(".")
            for k in range(len(parts) - 1, 0, -1):
                try:
                    idx = self._resolve(".".join(parts[:k]), df_id)
                except AnalysisException:
                    continue
                return idx, parts[k:]
            raise

    def _new(self, fields, rows, types=None):
        df = DataFrame(fields, rows, self._session, types)
        df._partitions = self._partitions
        return df

    def _expand(self, cols):
        out = []
        for c in cols:
            if isinstance(c, (list, tuple)):
                out.extend(self._expand(c))
            elif isinstance(c, str):
                if c == "*":
                    out.extend(Column("ref", f.name, df_id=None, idx=i) for i, f in enumerate(self._fields))
                elif c.endswith(".*"):
                    q = c[:-2]
                    quals = [Column("ref", f.name, idx=i) for i, f in enumerate(self._fields) if q in f.quals]
                    if not quals and q in self.columns:
                        i = self.columns.index(q)
                        sample = next((r[i] for r in self._rows if r[i] is not None), None)
                        names = list(getattr(sample, "__fields__", None) or (sample.keys() if isinstance(sample, dict) else []))
                        quals = [_col("%s.%s" % (q, n)) for n in names]
                    out.extend(quals)
                else:
                    out.append(_col(c))
            elif isinstance(c, Column) and c.kind == "star":
                out.extend(Column("ref", f.name, idx=i) for i, f in enumerate(self._fields))
            else:
                out.append(c)
        return out

    def _eval_col(self, c):
        if c.kind == "ref" and "idx" in c.kw:
            i = c.kw["idx"]
            return [r[i] for r in self._rows]
        if c.kind == "fn" and c.kw.get("explode"):
            return None
        return c._eval(self)

    def __getitem__(self, item):
        if isinstance(item, str):
            self._resolve(item)
            return _col(item, self._id)
        if isinstance(item, Column):
            return self.filter(item)
        if isinstance(item, int):
            return _col(self._fields[item].name, self._id)
        if isinstance(item, (list, tuple)):
            return self.select(*item)
        raise TypeError(item)

    def __getattr__(self, item):
        if item.startswith("_"):
            raise AttributeError(item)
        if any(f.name == item for f in self._fields):
            return self[item]
        raise AttributeError("'DataFrame' no tiene el atributo '%s'" % item)

    # ---- propiedades
    @property
    def sparkSession(self):
        return self._session or SparkSession._active or SparkSession.builder.getOrCreate()

    @property
    def columns(self):
        return [f.name for f in self._fields]

    @property
    def schema(self):
        from . import types as T
        fields = []
        for i, f in enumerate(self._fields):
            fields.append(T.StructField(f.name, self._col_type(i), True))
        return T.StructType(fields)

    def _col_type(self, i):
        from . import types as T
        if self._types and i < len(self._types) and self._types[i] is not None:
            return self._types[i]
        for r in self._rows:
            if r[i] is not None:
                t = _infer_type(r[i])
                if isinstance(t, T.LongType) and isinstance(r[i], int):
                    return t
                return t
        return T.StringType()

    @property
    def dtypes(self):
        return [(f.name, self._col_type(i).simpleString()) for i, f in enumerate(self._fields)]

    @property
    def write(self):
        return DataFrameWriter(self)

    @property
    def na(self):
        return _NA(self)

    @property
    def rdd(self):
        return _RDD(self)

    @property
    def isStreaming(self):
        return False

    # ---- transformaciones
    def select(self, *cols):
        cols = self._expand(cols)
        explode_cols = [c for c in cols if isinstance(c, Column) and c.kw.get("explode")]
        if any(c._has("agg") and c.kind != "win" and not _only_in_window(c) for c in cols):
            return self.agg(*cols)
        fields, vecs, types = [], [], []
        for c in cols:
            if c.kind == "ref" and "idx" in c.kw:
                f = self._fields[c.kw["idx"]]
                fields.append(_Field(f.name, f.quals))
                types.append(self._types[c.kw["idx"]] if self._types else None)
                vecs.append(self._eval_col(c))
            elif c.kind == "ref":
                i, path = self._resolve_path(c._name, c.kw.get("df_id"))
                f = self._fields[i]
                aliased = "alias" in c.kw
                if path:
                    fields.append(_Field(c.kw["alias"] if aliased else path[-1]))
                    types.append(None)
                    vecs.append([_get_path(r[i], path) for r in self._rows])
                    continue
                fields.append(_Field(c.kw["alias"] if aliased else f.name, () if aliased else f.quals))
                types.append(self._types[i] if self._types and not aliased else None)
                vecs.append([r[i] for r in self._rows])
            elif c.kw.get("explode"):
                fields.append(_Field(c.kw.get("alias", "col")))
                types.append(None)
                vecs.append(c.children[0]._eval(self))
            else:
                fields.append(_Field(c._out_name()))
                types.append(c.kw.get("dtype"))
                vecs.append(c._eval(self))
        n = len(self._rows)
        rows = [tuple(v[i] for v in vecs) for i in range(n)]
        if explode_cols:
            pos = [k for k, c in enumerate(cols) if c.kw.get("explode")][0]
            outer = cols[pos].kw.get("outer")
            new_rows = []
            for r in rows:
                arr = r[pos]
                if isinstance(arr, dict):
                    arr = list(arr.items())
                if not arr:
                    if outer:
                        new_rows.append(r[:pos] + (None,) + r[pos + 1:])
                    continue
                for x in arr:
                    new_rows.append(r[:pos] + (x,) + r[pos + 1:])
            rows = new_rows
        return self._new(fields, rows, types)

    def selectExpr(self, *exprs):
        return self.sparkSession._sql_on(self, "SELECT %s FROM __t" % ", ".join(exprs))

    def filter(self, cond):
        if isinstance(cond, str):
            return self.sparkSession._sql_on(self, "SELECT * FROM __t WHERE %s" % cond, keep_types=True)
        if cond._has("agg"):
            raise AnalysisException("No se pueden usar agregaciones en filter/where. Agrupa primero y filtra después (equivale a HAVING).")
        vals = cond._eval(self)
        rows = [r for r, v in zip(self._rows, vals) if v]
        df = self._new(self._fields, rows, self._types)
        df._fields = [_Field(f.name, f.quals) for f in self._fields]
        df._id = self._id  # mantiene referencias df["col"] válidas
        return df

    where = filter

    def withColumn(self, name, col):
        if not isinstance(col, Column):
            raise TypeError("withColumn espera una Column. ¿Olvidaste F.lit(%r)?" % (col,))
        if col.kw.get("explode"):
            cols = [_col(c) for c in self.columns if c != name]
            return self.select(*(cols + [col.alias(name)]))
        if col._has("agg") and not _only_in_window(col):
            raise AnalysisException("withColumn no admite agregaciones sin ventana. Usa groupBy().agg() o .over(Window...)")
        vals = col._eval(self)
        names = self.columns
        if name in names:
            i = names.index(name)
            rows = [r[:i] + (v,) + r[i + 1:] for r, v in zip(self._rows, vals)]
            types = list(self._types) if self._types else None
            if types:
                types[i] = col.kw.get("dtype")
            df = self._new([_Field(f.name, f.quals) for f in self._fields], rows, types)
        else:
            rows = [r + (v,) for r, v in zip(self._rows, vals)]
            types = (list(self._types) + [col.kw.get("dtype")]) if self._types else None
            df = self._new([_Field(f.name, f.quals) for f in self._fields] + [_Field(name)], rows, types)
        df._id = self._id
        for f in df._fields:
            f.quals.add(self._id)
        return df

    def withColumns(self, mapping):
        df = self
        for k, v in mapping.items():
            df = df.withColumn(k, v)
        return df

    def withColumnRenamed(self, old, new):
        fields = [_Field(new if f.name == old else f.name, f.quals) for f in self._fields]
        df = self._new(fields, self._rows, self._types)
        return df

    def withColumnsRenamed(self, mapping):
        df = self
        for k, v in mapping.items():
            df = df.withColumnRenamed(k, v)
        return df

    def toDF(self, *names):
        if len(names) != len(self._fields):
            raise AnalysisException("toDF esperaba %d nombres" % len(self._fields))
        return self._new(list(names), self._rows, self._types)

    def drop(self, *cols):
        idxs = set()
        for c in cols:
            if isinstance(c, Column):
                try:
                    idxs.add(self._resolve(c._name, c.kw.get("df_id")))
                except AnalysisException:
                    pass
            else:
                idxs.update(i for i, f in enumerate(self._fields) if f.name == c)
        keep = [i for i in range(len(self._fields)) if i not in idxs]
        return self._new([self._fields[i] for i in keep], [tuple(r[i] for i in keep) for r in self._rows],
                         [self._types[i] for i in keep] if self._types else None)

    def alias(self, name):
        df = self._new([_Field(f.name, set(f.quals) | {name}) for f in self._fields], self._rows, self._types)
        df._id = self._id
        return df

    def distinct(self):
        seen, rows = set(), []
        for r in self._rows:
            k = tuple(_hashable(v) for v in r)
            if k not in seen:
                seen.add(k)
                rows.append(r)
        return self._new(self._fields, rows, self._types)

    def dropDuplicates(self, subset=None):
        if not subset:
            return self.distinct()
        if isinstance(subset, str):
            subset = [subset]
        idx = [self._resolve(c) for c in subset]
        seen, rows = set(), []
        for r in self._rows:
            k = tuple(_hashable(r[i]) for i in idx)
            if k not in seen:
                seen.add(k)
                rows.append(r)
        return self._new(self._fields, rows, self._types)

    drop_duplicates = dropDuplicates

    def orderBy(self, *cols, ascending=None):
        cols = [c for c in self._expand(cols)]
        if ascending is not None:
            asc = ascending if isinstance(ascending, list) else [ascending] * len(cols)
            cols = [c.asc() if a else c.desc() for c, a in zip(cols, asc)]
        specs = _sort_key_fn(cols, self)
        order = _order_indices(range(len(self._rows)), specs)
        df = self._new(self._fields, [self._rows[i] for i in order], self._types)
        df._id = self._id
        return df

    sort = orderBy

    def sortWithinPartitions(self, *cols, **kw):
        return self.orderBy(*cols, **kw)

    def limit(self, n):
        return self._new(self._fields, self._rows[:n], self._types)

    def offset(self, n):
        return self._new(self._fields, self._rows[n:], self._types)

    def groupBy(self, *cols):
        return GroupedData(self, self._expand(cols))

    groupby = groupBy

    def rollup(self, *cols):
        return GroupedData(self, self._expand(cols), mode="rollup")

    def cube(self, *cols):
        return GroupedData(self, self._expand(cols), mode="cube")

    def agg(self, *exprs):
        return GroupedData(self, []).agg(*exprs)

    def join(self, other, on=None, how="inner"):
        how = (how or "inner").lower().replace("_", "")
        aliases = {"inner": "inner", "left": "left", "leftouter": "left", "right": "right", "rightouter": "right",
                   "outer": "full", "full": "full", "fullouter": "full", "leftsemi": "semi", "semi": "semi",
                   "leftanti": "anti", "anti": "anti", "cross": "cross"}
        if how not in aliases:
            raise AnalysisException("Tipo de join no soportado: %s" % how)
        how = aliases[how]
        nl, nr = len(self._fields), len(other._fields)
        using = None
        if on is None:
            pairs = None
        elif isinstance(on, str):
            using = [on]
        elif isinstance(on, (list, tuple)) and all(isinstance(x, str) for x in on):
            using = list(on)
        elif isinstance(on, (list, tuple)):
            cond = on[0]
            for x in on[1:]:
                cond = cond & x
            on = cond
        combined_fields = [_Field(f.name, f.quals) for f in self._fields] + [_Field(f.name, f.quals) for f in other._fields]
        tmp = DataFrame(combined_fields, [], self._session)

        if using is not None:
            li = [self._resolve(c) for c in using]
            ri = [other._resolve(c) for c in using]
            index = {}
            for j, r in enumerate(other._rows):
                k = tuple(r[i] for i in ri)
                if None in k:
                    continue
                index.setdefault(k, []).append(j)

            def matches(lrow):
                k = tuple(lrow[i] for i in li)
                return [] if None in k else index.get(k, [])
        elif on is None:
            def matches(lrow):
                return range(len(other._rows))
        else:
            cond = on

            def matches_all():
                res = {}
                # evaluación por bloques: producto cartesiano filtrado
                eq = _equi_keys(cond, self, other)
                if eq:
                    lk, rk = eq
                    lv = [c._eval(self) for c in lk]
                    rv = [c._eval(other) for c in rk]
                    idx = {}
                    for j in range(len(other._rows)):
                        k = tuple(v[j] for v in rv)
                        if None not in k:
                            idx.setdefault(k, []).append(j)
                    cand = {i: idx.get(tuple(v[i] for v in lv), []) for i in range(len(self._rows))}
                else:
                    cand = {i: range(len(other._rows)) for i in range(len(self._rows))}
                pairs_rows = []
                pairs_idx = []
                for i, js in cand.items():
                    for j in js:
                        pairs_rows.append(self._rows[i] + other._rows[j])
                        pairs_idx.append((i, j))
                tmp._rows = pairs_rows
                ok = cond._eval(tmp) if pairs_rows else []
                for (i, j), v in zip(pairs_idx, ok):
                    if v:
                        res.setdefault(i, []).append(j)
                return res
            precomputed = matches_all()

            def matches(lrow, _i=[0]):
                return precomputed.get(lrow, [])

        rows = []
        matched_right = set()
        null_r = (None,) * nr
        null_l = (None,) * nl
        for i, lr in enumerate(self._rows):
            js = matches(i if (using is None and on is not None) else lr)
            js = list(js)
            if how == "semi":
                if js:
                    rows.append(lr)
                continue
            if how == "anti":
                if not js:
                    rows.append(lr)
                continue
            for j in js:
                rows.append(lr + other._rows[j])
                matched_right.add(j)
            if not js and how in ("left", "full"):
                rows.append(lr + null_r)
        if how in ("right", "full"):
            for j, rr in enumerate(other._rows):
                if j not in matched_right:
                    rows.append(null_l + rr)
        if how in ("semi", "anti"):
            return self._new(self._fields, rows, self._types)

        fields = combined_fields
        types = None
        if using is not None:
            # las columnas del USING aparecen una sola vez (coalesce para outer joins)
            li = [self._resolve(c) for c in using]
            ri = [other._resolve(c) for c in using]
            drop_r = set(nl + i for i in ri)
            new_rows = []
            for r in rows:
                key = []
                for a, b in zip(li, ri):
                    key.append(r[a] if r[a] is not None else r[nl + b])
                rest = [r[k] for k in range(nl + nr) if k not in drop_r and k not in li]
                new_rows.append(tuple(key) + tuple(rest))
            keep_fields = [fields[k] for k in range(nl + nr) if k not in drop_r and k not in li]
            key_fields = [_Field(self._fields[a].name, self._fields[a].quals | other._fields[b].quals) for a, b in zip(li, ri)]
            fields = key_fields + keep_fields
            rows = new_rows
        return self._new(fields, rows, types)

    def crossJoin(self, other):
        return self.join(other, how="cross")

    def union(self, other):
        if len(self._fields) != len(other._fields):
            raise AnalysisException("union requiere el mismo número de columnas (%d vs %d)" % (len(self._fields), len(other._fields)))
        return self._new(self._fields, self._rows + other._rows, self._types)

    unionAll = union

    def unionByName(self, other, allowMissingColumns=False):
        names = self.columns
        oth = other.columns
        missing = [c for c in names if c not in oth]
        if missing and not allowMissingColumns:
            raise AnalysisException("unionByName: faltan columnas en el segundo DataFrame: %s" % missing)
        extra = [c for c in oth if c not in names]
        if extra and not allowMissingColumns:
            raise AnalysisException("unionByName: columnas extra en el segundo DataFrame: %s" % extra)
        allnames = names + extra
        rows = [r + (None,) * len(extra) for r in self._rows]
        for r in other._rows:
            d = dict(zip(oth, r))
            rows.append(tuple(d.get(c) for c in allnames))
        return self._new(allnames, rows)

    def intersect(self, other):
        s = set(other._rows)
        return self._new(self._fields, [r for r in self.distinct()._rows if r in s])

    def subtract(self, other):
        s = set(other._rows)
        return self._new(self._fields, [r for r in self.distinct()._rows if r not in s])

    exceptAll = subtract

    def fillna(self, value, subset=None):
        return self.na.fill(value, subset)

    def dropna(self, how="any", thresh=None, subset=None):
        return self.na.drop(how, thresh, subset)

    def replace(self, to_replace, value=None, subset=None):
        return self.na.replace(to_replace, value, subset)

    def sample(self, withReplacement=None, fraction=None, seed=None):
        import random
        if isinstance(withReplacement, float):
            fraction, withReplacement = withReplacement, False
        rnd = random.Random(seed if seed is not None else 42)
        return self._new(self._fields, [r for r in self._rows if rnd.random() < fraction], self._types)

    def randomSplit(self, weights, seed=None):
        import random
        rnd = random.Random(seed if seed is not None else 42)
        total = sum(weights)
        cuts = []
        acc = 0
        for w in weights:
            acc += w / total
            cuts.append(acc)
        parts = [[] for _ in weights]
        for r in self._rows:
            x = rnd.random()
            for k, c in enumerate(cuts):
                if x <= c:
                    parts[k].append(r)
                    break
        return [self._new(self._fields, p, self._types) for p in parts]

    # ---- particiones y caché (simuladas)
    def repartition(self, n=None, *cols):
        df = self._new(self._fields, self._rows, self._types)
        if isinstance(n, int):
            df._partitions = n
        else:
            df._partitions = 200
        return df

    def coalesce(self, n):
        df = self._new(self._fields, self._rows, self._types)
        df._partitions = min(n, self._partitions)
        return df

    def cache(self):
        self._cached = True
        return self

    def persist(self, *a):
        return self.cache()

    def unpersist(self, *a):
        self._cached = False
        return self

    def checkpoint(self, *a):
        return self

    def localCheckpoint(self, *a):
        return self

    def hint(self, *a):
        return self

    def explain(self, extended=False, mode=None):
        print("== Physical Plan (simulado por mini-Spark) ==")
        print("*(1) Project %s" % self.columns)
        print("+- *(1) Scan ExistingRDD [%d filas, %d particiones]" % (len(self._rows), self._partitions))
        print("(En Spark real verías Exchange (shuffle), BroadcastHashJoin, SortMergeJoin, etc.)")

    def createOrReplaceTempView(self, name):
        _TEMP_VIEWS[name.lower()] = self

    createTempView = createOrReplaceTempView
    registerTempTable = createOrReplaceTempView

    def createOrReplaceGlobalTempView(self, name):
        _TEMP_VIEWS["global_temp." + name.lower()] = self

    # ---- acciones
    def count(self):
        return len(self._rows)

    def collect(self):
        names = self.columns
        return [_mkrow(names, r) for r in self._rows]

    def take(self, n):
        return self.limit(n).collect()

    def head(self, n=None):
        if n is None:
            r = self.take(1)
            return r[0] if r else None
        return self.take(n)

    def first(self):
        return self.head()

    def tail(self, n):
        names = self.columns
        return [_mkrow(names, r) for r in self._rows[-n:]]

    def isEmpty(self):
        return len(self._rows) == 0

    def toLocalIterator(self):
        return iter(self.collect())

    def foreach(self, f):
        for r in self.collect():
            f(r)

    def toPandas(self):
        try:
            import pandas as pd
        except ImportError:
            raise ImportError("pandas no está cargado en este simulador; usa .collect() o .show()")
        return pd.DataFrame(self._rows, columns=self.columns)

    def toJSON(self):
        import json
        return _RDDList([json.dumps(dict(zip(self.columns, [_jsonable(v) for v in r])), ensure_ascii=False) for r in self._rows])

    def printSchema(self):
        print(self.schema.treeString())

    def describe(self, *cols):
        cols = list(cols) or [c for i, c in enumerate(self.columns)]
        stats = ["count", "mean", "stddev", "min", "max"]
        out = []
        for s in stats:
            row = [s]
            for c in cols:
                vals = [v for v in self.select(c)._rows for v in v if v is not None]
                nums = [v for v in vals if isinstance(v, (int, float)) and not isinstance(v, bool)]
                if s == "count":
                    row.append(str(len(vals)))
                elif s == "mean":
                    row.append(str(sum(nums) / len(nums)) if nums and len(nums) == len(vals) else None)
                elif s == "stddev":
                    if nums and len(nums) == len(vals) and len(nums) > 1:
                        mu = sum(nums) / len(nums)
                        row.append(str((sum((x - mu) ** 2 for x in nums) / (len(nums) - 1)) ** 0.5))
                    else:
                        row.append(None)
                elif s == "min":
                    row.append(str(min(vals)) if vals else None)
                else:
                    row.append(str(max(vals)) if vals else None)
            out.append(tuple(row))
        return self._new(["summary"] + cols, out)

    summary = describe

    def show(self, n=20, truncate=True, vertical=False):
        print(self._show_string(n, truncate, vertical))

    def _show_string(self, n=20, truncate=True, vertical=False):
        names = self.columns
        rows = self._rows[:n]
        tl = 20 if truncate is True else (truncate if isinstance(truncate, int) and truncate > 1 else 10 ** 9)

        def fmt(v):
            s = _fmt_value(v)
            if len(s) > tl:
                s = s[:tl - 3] + "..."
            return s
        cells = [[fmt(v) for v in r] for r in rows]
        if vertical:
            lines = []
            w = max([len(x) for x in names] + [0])
            for k, r in enumerate(cells):
                lines.append("-RECORD %d" % k + "-" * 20)
                for name, v in zip(names, r):
                    lines.append(" %s | %s" % (name.ljust(w), v))
            return "\n".join(lines) if lines else "(0 filas)"
        widths = [max([len(h)] + [len(r[i]) for r in cells] + [3]) for i, h in enumerate(names)]
        sep = "+" + "+".join("-" * w for w in widths) + "+"
        out = [sep, "|" + "|".join(h.rjust(w) for h, w in zip(names, widths)) + "|", sep]
        for r in cells:
            out.append("|" + "|".join(v.rjust(w) for v, w in zip(r, widths)) + "|")
        out.append(sep)
        if len(self._rows) > n:
            out.append("only showing top %d row%s" % (n, "s" if n != 1 else ""))
        return "\n".join(out)

    def __repr__(self):
        return "DataFrame[%s]" % ", ".join("%s: %s" % d for d in self.dtypes)

    # ---- compatibilidad
    def transform(self, func, *args, **kwargs):
        return func(self, *args, **kwargs)

    def to(self, schema):
        return self.select(*[F_col(f.name).cast(f.dataType) for f in schema.fields])

    def unpivot(self, ids, values, variableColumnName, valueColumnName):
        ids = [ids] if isinstance(ids, str) else list(ids)
        values = [values] if isinstance(values, str) else list(values)
        ii = [self._resolve(c) for c in ids]
        vi = [self._resolve(c) for c in values]
        rows = []
        for r in self._rows:
            for name, k in zip(values, vi):
                rows.append(tuple(r[i] for i in ii) + (name, r[k]))
        return self._new(ids + [variableColumnName, valueColumnName], rows)

    melt = unpivot


def F_col(name):
    return _col(name)


def _only_in_window(c):
    """True si todas las agregaciones de la expresión están dentro de una ventana."""
    if c.kind == "win":
        return True
    if c.kind == "agg":
        return False
    return all(_only_in_window(ch) for ch in c.children if isinstance(ch, Column)) and \
        all(_only_in_window(_as_col(v)) and _only_in_window(cnd) for cnd, v in c.kw.get("branches", []))


def _equi_keys(cond, left, right):
    """Detecta condiciones col_izq == col_der (posiblemente con AND) para usar hash join."""
    lk, rk = [], []

    def belongs(col, df):
        if col.kind != "ref":
            return False
        try:
            df._resolve(col._name, col.kw.get("df_id"))
            return True
        except AnalysisException:
            return False

    def walk(c):
        op = c.kw.get("op") if c.kind == "fn" else None
        if op == "and":
            return walk(c.children[0]) and walk(c.children[1])
        if op == "=" and c.children[0].kind == "ref" and c.children[1].kind == "ref":
            a, b = c.children
            if belongs(a, left) and belongs(b, right):
                lk.append(a)
                rk.append(b)
                return True
            if belongs(b, left) and belongs(a, right):
                lk.append(b)
                rk.append(a)
                return True
        return False

    try:
        ok = walk(cond)
    except Exception:
        return None
    return (lk, rk) if ok and lk else None


def _fmt_value(v):
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, float):
        if v != v:
            return "NaN"
        r = repr(v)
        if "e" in r:
            return r
        return r
    if isinstance(v, (list, tuple)):
        return "[" + ", ".join(_fmt_value(x) for x in v) + "]"
    if isinstance(v, dict):
        return "{" + ", ".join("%s -> %s" % (_fmt_value(k), _fmt_value(x)) for k, x in v.items()) + "}"
    if isinstance(v, Row):
        return "{" + ", ".join(_fmt_value(x) for x in v) + "}"
    return str(v)


def _jsonable(v):
    if isinstance(v, (_dt.date, _dt.datetime)):
        return v.isoformat(sep=" ") if isinstance(v, _dt.datetime) else v.isoformat()
    return v


# ---------------------------------------------------------------------- GroupedData
class GroupedData:
    def __init__(self, df, keys, mode="group"):
        self._df = df
        self._keys = keys
        self._mode = mode
        self._pivot = None

    def _key_names(self):
        names = []
        for k in self._keys:
            names.append(k.kw.get("alias") or (k._name.split(".")[-1] if k.kind == "ref" else k._out_name()))
        return names

    def _groups(self):
        df = self._df
        vecs = [df._eval_col(k) for k in self._keys]
        groups = {}
        order = []
        for i in range(len(df._rows)):
            key = tuple(_hashable(v[i]) for v in vecs)
            if key not in groups:
                groups[key] = []
                order.append(key)
            groups[key].append(i)
        if not self._keys and not groups:
            groups[()] = []
            order.append(())
        return order, groups

    def agg(self, *exprs):
        if len(exprs) == 1 and isinstance(exprs[0], dict):
            from . import functions as F
            exprs = [getattr(F, fn if fn != "mean" else "avg")(c).alias("%s(%s)" % (fn, c)) for c, fn in exprs[0].items()]
        exprs = [e for e in exprs]
        for e in exprs:
            if not isinstance(e, Column):
                raise TypeError("agg espera expresiones como F.sum('col'), no %r" % (e,))
        df = self._df
        names = self._key_names() + [e._out_name() for e in exprs]
        if self._mode in ("rollup", "cube"):
            return self._rollup(exprs, names)
        order, groups = self._groups()
        if self._pivot:
            return self._do_pivot(exprs, order, groups)
        rows = []
        for key in order:
            sub = df._new(df._fields, [df._rows[i] for i in groups[key]], df._types)
            sub._id = df._id
            rows.append(tuple(key) + tuple(e._eval_group(sub) for e in exprs))
        out = df._new(names, rows)
        return out

    def _rollup(self, exprs, names):
        import itertools
        df = self._df
        nk = len(self._keys)
        vecs = [df._eval_col(k) for k in self._keys]
        if self._mode == "rollup":
            sets = [tuple(range(i)) for i in range(nk, -1, -1)]
        else:
            sets = []
            for r in range(nk, -1, -1):
                sets.extend(itertools.combinations(range(nk), r))
        rows = []
        for s in sets:
            groups, order = {}, []
            for i in range(len(df._rows)):
                key = tuple(_hashable(vecs[k][i]) if k in s else None for k in range(nk))
                if key not in groups:
                    groups[key] = []
                    order.append(key)
                groups[key].append(i)
            for key in order:
                sub = df._new(df._fields, [df._rows[i] for i in groups[key]], df._types)
                rows.append(key + tuple(e._eval_group(sub) for e in exprs))
        return df._new(names, rows)

    def pivot(self, col, values=None):
        self._pivot = (col, values)
        return self

    def _do_pivot(self, exprs, order, groups):
        df = self._df
        col, values = self._pivot
        pv = _col(col)._eval(df)
        if values is None:
            values = sorted(set(v for v in pv if v is not None), key=lambda x: (str(type(x)), x))
        names = self._key_names()
        for v in values:
            for e in exprs:
                names.append(str(v) if len(exprs) == 1 else "%s_%s" % (v, e._out_name()))
        rows = []
        for key in order:
            idxs = groups[key]
            row = list(key)
            for v in values:
                sub_rows = [df._rows[i] for i in idxs if pv[i] == v]
                sub = df._new(df._fields, sub_rows, df._types)
                for e in exprs:
                    row.append(e._eval_group(sub) if sub_rows else None)
            rows.append(tuple(row))
        return df._new(names, rows)

    def count(self):
        from . import functions as F
        return self.agg(F.count(F.lit(1)).alias("count"))

    def _simple(self, fn, cols):
        from . import functions as F
        if not cols:
            cols = [f for i, f in enumerate(self._df.columns) if isinstance(next((r[i] for r in self._df._rows if r[i] is not None), None), (int, float))]
        return self.agg(*[getattr(F, fn)(c).alias("%s(%s)" % (fn, c)) for c in cols])

    def sum(self, *cols): return self._simple("sum", cols)
    def avg(self, *cols): return self._simple("avg", cols)
    mean = avg
    def max(self, *cols): return self._simple("max", cols)
    def min(self, *cols): return self._simple("min", cols)

    def applyInPandas(self, *a, **k):
        raise NotImplementedError("applyInPandas no está disponible en el simulador")


# ----------------------------------------------------------------------- NA helpers
class _NA:
    def __init__(self, df):
        self.df = df

    def fill(self, value, subset=None):
        df = self.df
        if isinstance(subset, str):
            subset = [subset]
        if isinstance(value, dict):
            mapping = value
        else:
            names = subset or df.columns
            mapping = {}
            for i, c in enumerate(df.columns):
                if c not in names:
                    continue
                sample = next((r[i] for r in df._rows if r[i] is not None), None)
                if isinstance(value, bool):
                    if isinstance(sample, bool) or sample is None:
                        mapping[c] = value
                elif isinstance(value, (int, float)):
                    if isinstance(sample, (int, float)) and not isinstance(sample, bool):
                        mapping[c] = value
                    elif sample is None and subset:
                        mapping[c] = value
                elif isinstance(value, str):
                    if isinstance(sample, str) or (sample is None and subset):
                        mapping[c] = value
        idx = {df.columns.index(k): v for k, v in mapping.items() if k in df.columns}
        rows = [tuple(idx[i] if (i in idx and v is None) else v for i, v in enumerate(r)) for r in df._rows]
        return df._new(df._fields, rows, df._types)

    def drop(self, how="any", thresh=None, subset=None):
        df = self.df
        if isinstance(subset, str):
            subset = [subset]
        idx = [df.columns.index(c) for c in (subset or df.columns)]
        rows = []
        for r in df._rows:
            nn = sum(1 for i in idx if r[i] is not None)
            if thresh is not None:
                ok = nn >= thresh
            elif how == "all":
                ok = nn > 0
            else:
                ok = nn == len(idx)
            if ok:
                rows.append(r)
        return df._new(df._fields, rows, df._types)

    def replace(self, to_replace, value=None, subset=None):
        df = self.df
        if isinstance(to_replace, dict):
            mapping = to_replace
        elif isinstance(to_replace, (list, tuple)):
            vals = value if isinstance(value, (list, tuple)) else [value] * len(to_replace)
            mapping = dict(zip(to_replace, vals))
        else:
            mapping = {to_replace: value}
        if isinstance(subset, str):
            subset = [subset]
        idx = set(df.columns.index(c) for c in (subset or df.columns))
        rows = [tuple(mapping.get(v, v) if (i in idx and not isinstance(v, (list, dict)) and v in mapping) else v
                      for i, v in enumerate(r)) for r in df._rows]
        return df._new(df._fields, rows, df._types)


# ---------------------------------------------------------------------------- RDD
class _RDDList(list):
    def collect(self):
        return list(self)

    def take(self, n):
        return list(self[:n])


class _RDD:
    def __init__(self, df):
        self.df = df

    def getNumPartitions(self):
        return self.df._partitions

    def collect(self):
        return self.df.collect()

    def map(self, f):
        return _PyRDD([f(r) for r in self.df.collect()])

    def flatMap(self, f):
        return _PyRDD([x for r in self.df.collect() for x in f(r)])

    def filter(self, f):
        return _PyRDD([r for r in self.df.collect() if f(r)])

    def count(self):
        return self.df.count()

    def toDF(self, schema=None):
        return self.df


class _PyRDD:
    """RDD mínimo en memoria para practicar map/filter/reduceByKey."""

    def __init__(self, data, n=8):
        self._data = list(data)
        self._n = n

    def map(self, f): return _PyRDD([f(x) for x in self._data], self._n)
    def flatMap(self, f): return _PyRDD([y for x in self._data for y in f(x)], self._n)
    def filter(self, f): return _PyRDD([x for x in self._data if f(x)], self._n)
    def distinct(self): return _PyRDD(list(dict.fromkeys(self._data)), self._n)
    def collect(self): return list(self._data)
    def count(self): return len(self._data)
    def take(self, n): return self._data[:n]
    def first(self): return self._data[0]
    def sum(self): return sum(self._data)
    def max(self): return max(self._data)
    def min(self): return min(self._data)
    def mean(self): return sum(self._data) / len(self._data)
    def getNumPartitions(self): return self._n
    def repartition(self, n): return _PyRDD(self._data, n)
    def coalesce(self, n): return _PyRDD(self._data, min(n, self._n))
    def cache(self): return self
    def persist(self, *a): return self
    def keys(self): return _PyRDD([k for k, _ in self._data], self._n)
    def values(self): return _PyRDD([v for _, v in self._data], self._n)
    def mapValues(self, f): return _PyRDD([(k, f(v)) for k, v in self._data], self._n)
    def countByValue(self):
        out = {}
        for x in self._data:
            out[x] = out.get(x, 0) + 1
        return out

    def countByKey(self):
        out = {}
        for k, _ in self._data:
            out[k] = out.get(k, 0) + 1
        return out

    def reduce(self, f):
        import functools
        return functools.reduce(f, self._data)

    def fold(self, zero, f):
        import functools
        return functools.reduce(f, self._data, zero)

    def reduceByKey(self, f):
        out = {}
        for k, v in self._data:
            out[k] = f(out[k], v) if k in out else v
        return _PyRDD(list(out.items()), self._n)

    def groupByKey(self):
        out = {}
        for k, v in self._data:
            out.setdefault(k, []).append(v)
        return _PyRDD(list(out.items()), self._n)

    def sortBy(self, f, ascending=True):
        return _PyRDD(sorted(self._data, key=f, reverse=not ascending), self._n)

    def sortByKey(self, ascending=True):
        return _PyRDD(sorted(self._data, key=lambda kv: kv[0], reverse=not ascending), self._n)

    def join(self, other):
        idx = {}
        for k, v in other._data:
            idx.setdefault(k, []).append(v)
        return _PyRDD([(k, (v, w)) for k, v in self._data for w in idx.get(k, [])], self._n)

    def union(self, other):
        return _PyRDD(self._data + other._data, self._n + other._n)

    def zipWithIndex(self):
        return _PyRDD([(x, i) for i, x in enumerate(self._data)], self._n)

    def glom(self):
        n = self._n
        size = max(1, -(-len(self._data) // n))
        return _PyRDD([self._data[i:i + size] for i in range(0, len(self._data), size)], n)

    def toDF(self, schema=None):
        return SparkSession._active.createDataFrame(self._data, schema)


class _SparkContext:
    def __init__(self, session):
        self.session = session
        self.appName = session._app
        self.master = "local[*]"
        self.defaultParallelism = 8
        self.version = SparkSession.version

    def parallelize(self, data, numSlices=None):
        return _PyRDD(data, numSlices or 8)

    def textFile(self, path, *a):
        if path in _FILES and isinstance(_FILES[path], str):
            return _PyRDD(_FILES[path].splitlines())
        raise AnalysisException("Ruta no encontrada en el sistema de archivos simulado: %s" % path)

    def setLogLevel(self, level):
        pass

    def broadcast(self, value):
        class _B:
            def __init__(self, v):
                self.value = v
        return _B(value)

    def accumulator(self, value):
        class _A:
            def __init__(self, v):
                self.value = v

            def add(self, x):
                self.value += x

            def __iadd__(self, x):
                self.value += x
                return self
        return _A(value)


# ------------------------------------------------------------------- reader/writer
class DataFrameReader:
    def __init__(self, session):
        self._s = session
        self._fmt = "parquet"
        self._opts = {}
        self._schema = None

    def format(self, f):
        self._fmt = f
        return self

    def option(self, k, v):
        self._opts[k] = v
        return self

    def options(self, **kw):
        self._opts.update(kw)
        return self

    def schema(self, s):
        self._schema = s
        return self

    def load(self, path=None):
        if path is None:
            raise AnalysisException("load() necesita una ruta")
        return self._read(path)

    def _read(self, path):
        p = path.rstrip("/")
        df = _FILES.get(p)
        if df is None:
            base = p.split("/")[-1]
            name = base.split(".")[0]
            if _lazy_get(name.lower()) is not None:
                df = _lazy_get(name.lower())
        if df is None:
            raise AnalysisException("[PATH_NOT_FOUND] La ruta no existe: %s. Rutas disponibles: %s"
                                    % (path, sorted(set(list(_FILES.keys()) + ["/datos/%s.csv" % k for k in _all_table_names()]))))
        if isinstance(df, str):
            return self._parse_csv_text(df)
        if self._fmt == "csv" and not _truthy(self._opts.get("inferSchema")) and self._schema is None:
            # como Spark: sin inferSchema todas las columnas son string
            out = df.select(*[F_col(c).cast("string").alias(c) for c in df.columns])
        else:
            out = df._new(df._fields, df._rows, df._types)
        if self._fmt == "csv" and not _truthy(self._opts.get("header")) and self._schema is None:
            out = out.toDF(*["_c%d" % i for i in range(len(out.columns))])
        if self._schema is not None:
            from . import types as T
            sch = T._parse_schema(self._schema) if isinstance(self._schema, str) else self._schema
            out = out.select(*[F_col(c).cast(f.dataType).alias(f.name) for c, f in zip(out.columns, sch.fields)])
        return out

    def _parse_csv_text(self, text):
        import csv
        import io
        sep = self._opts.get("sep", self._opts.get("delimiter", ","))
        reader = list(csv.reader(io.StringIO(text), delimiter=sep))
        header = _truthy(self._opts.get("header"))
        names = reader[0] if header else ["_c%d" % i for i in range(len(reader[0]))]
        data = reader[1:] if header else reader
        rows = [tuple(v if v != "" else None for v in r) for r in data]
        df = self._s.createDataFrame(rows, names)
        if _truthy(self._opts.get("inferSchema")):
            from . import types as T
            casts = []
            for i, c in enumerate(names):
                vals = [r[i] for r in rows if r[i] is not None]
                t = "string"
                if vals and all(_re.fullmatch(r"-?\d+", v) for v in vals):
                    t = "int"
                elif vals and all(_re.fullmatch(r"-?\d+(\.\d+)?", v) for v in vals):
                    t = "double"
                casts.append(F_col(c).cast(t).alias(c))
            df = df.select(*casts)
        return df

    def csv(self, path, header=None, inferSchema=None, sep=None, schema=None):
        self._fmt = "csv"
        if header is not None:
            self._opts["header"] = header
        if inferSchema is not None:
            self._opts["inferSchema"] = inferSchema
        if sep is not None:
            self._opts["sep"] = sep
        if schema is not None:
            self._schema = schema
        return self._read(path)

    def parquet(self, path):
        self._fmt = "parquet"
        return self._read(path)

    def json(self, path, **kw):
        self._fmt = "json"
        return self._read(path)

    def table(self, name):
        return self._s.table(name)


def _truthy(v):
    return v is True or (isinstance(v, str) and v.lower() == "true")


class DataFrameWriter:
    def __init__(self, df):
        self._df = df
        self._mode = "errorifexists"
        self._fmt = "parquet"
        self._parts = []
        self._opts = {}

    def mode(self, m):
        self._mode = m.lower()
        return self

    def format(self, f):
        self._fmt = f
        return self

    def option(self, k, v):
        self._opts[k] = v
        return self

    def options(self, **kw):
        self._opts.update(kw)
        return self

    def partitionBy(self, *cols):
        self._parts = list(cols)
        return self

    def bucketBy(self, n, *cols):
        return self

    def sortBy(self, *cols):
        return self

    def _store(self, store, key, label):
        exists = key in store
        if exists and self._mode in ("error", "errorifexists"):
            raise AnalysisException("[%s_ALREADY_EXISTS] %s ya existe. Usa .mode('overwrite') o .mode('append')." % (label, key))
        if exists and self._mode == "ignore":
            return
        if exists and self._mode == "append":
            old = store[key]
            store[key] = old.unionByName(self._df)
        else:
            store[key] = self._df._new(self._df._fields, self._df._rows, self._df._types)
        msg = "✔ Escritos %d registros en %s (formato %s, modo %s" % (self._df.count(), key, self._fmt, self._mode)
        if self._parts:
            msg += ", particionado por %s" % ", ".join(self._parts)
        print(msg + ")")

    def save(self, path=None):
        self._store(_FILES, path.rstrip("/"), "PATH")

    def parquet(self, path, mode=None, partitionBy=None):
        if mode:
            self._mode = mode
        if partitionBy:
            self._parts = [partitionBy] if isinstance(partitionBy, str) else partitionBy
        self._fmt = "parquet"
        self.save(path)

    def csv(self, path, mode=None, header=None):
        if mode:
            self._mode = mode
        self._fmt = "csv"
        self.save(path)

    def json(self, path, mode=None):
        if mode:
            self._mode = mode
        self._fmt = "json"
        self.save(path)

    def saveAsTable(self, name):
        self._store(_CATALOG, name.lower(), "TABLE_OR_VIEW")

    def insertInto(self, name, overwrite=False):
        self._mode = "overwrite" if overwrite else "append"
        self._store(_CATALOG, name.lower(), "TABLE_OR_VIEW")


# --------------------------------------------------------------------- SparkSession
class _Builder:
    def __init__(self):
        self._app = "mini-spark"
        self._conf = {}

    def appName(self, n):
        self._app = n
        return self

    def master(self, m):
        return self

    def config(self, k=None, v=None, **kw):
        if k:
            self._conf[k] = v
        return self

    def enableHiveSupport(self):
        return self

    def getOrCreate(self):
        if SparkSession._active is None:
            SparkSession._active = SparkSession(self._app)
        SparkSession._active.conf._d.update(self._conf)
        return SparkSession._active


class _Conf:
    def __init__(self):
        self._d = {"spark.sql.shuffle.partitions": "200", "spark.sql.adaptive.enabled": "true",
                   "spark.sql.autoBroadcastJoinThreshold": "10485760"}

    def set(self, k, v):
        self._d[k] = str(v)

    def get(self, k, default=None):
        return self._d.get(k, default)


class _Catalog:
    def listTables(self, db=None):
        return [_mkrow(["name", "isTemporary"], (k, False)) for k in sorted(_all_table_names())] + \
               [_mkrow(["name", "isTemporary"], (k, True)) for k in sorted(_TEMP_VIEWS)]

    def tableExists(self, name, db=None):
        return name.lower() in _all_table_names() or name.lower() in _TEMP_VIEWS

    def dropTempView(self, name):
        return _TEMP_VIEWS.pop(name.lower(), None) is not None

    def cacheTable(self, name):
        pass

    def clearCache(self):
        pass

    def currentDatabase(self):
        return "default"


class SparkSession:
    _active = None
    version = "4.2.1 (mini-Spark simulado)"

    class _BuilderDesc:
        def __get__(self, obj, cls):
            return _Builder()

    builder = _BuilderDesc()

    def __init__(self, app="mini-spark"):
        self._app = app
        self.conf = _Conf()
        self.catalog = _Catalog()
        self.sparkContext = _SparkContext(self)

    @classmethod
    def getActiveSession(cls):
        return cls._active

    @property
    def read(self):
        return DataFrameReader(self)

    def stop(self):
        pass

    def newSession(self):
        return self

    def range(self, start, end=None, step=1, numPartitions=None):
        if end is None:
            start, end = 0, start
        return DataFrame(["id"], [(i,) for i in range(start, end, step)], self)

    def createDataFrame(self, data, schema=None, samplingRatio=None, verifySchema=True):
        from . import types as T
        if hasattr(data, "to_dict") and hasattr(data, "columns"):  # pandas
            cols = [str(c) for c in data.columns]
            rows = [tuple(None if (isinstance(v, float) and v != v) else v for v in r) for r in data.itertuples(index=False)]
            return DataFrame(cols, rows, self)
        if isinstance(data, _PyRDD):
            data = data.collect()
        data = list(data)
        types = None
        if isinstance(schema, str):
            if ":" in schema or " " in schema.strip() or "," in schema:
                schema = T._parse_schema(schema)
            else:
                schema = [schema]
        if isinstance(schema, (T.DataType,)) and not isinstance(schema, T.StructType):
            schema = T.StructType([T.StructField("value", schema)])
            data = [(x,) for x in data]
        if isinstance(schema, T.StructType):
            names = [f.name for f in schema.fields]
            types = [f.dataType for f in schema.fields]
        elif isinstance(schema, (list, tuple)):
            names = list(schema)
        else:
            names = None
        rows = []
        for r in data:
            if isinstance(r, Row) and r.__fields__:
                if names is None:
                    names = list(r.__fields__)
                rows.append(tuple(r[n] for n in names) if set(names) <= set(r.__fields__) else tuple(r))
            elif isinstance(r, dict):
                if names is None:
                    names = list(r.keys())
                rows.append(tuple(r.get(n) for n in names))
            elif isinstance(r, (list, tuple)):
                rows.append(tuple(r))
            else:
                rows.append((r,))
        if names is None:
            names = ["_%d" % (i + 1) for i in range(len(rows[0]) if rows else 0)]
        if rows and len(rows[0]) != len(names):
            raise AnalysisException("El esquema tiene %d columnas pero los datos tienen %d" % (len(names), len(rows[0])))
        if types:
            for k, t in enumerate(types):
                for r in rows:
                    v = r[k]
                    if v is None:
                        if verifySchema and isinstance(schema, T.StructType) and not schema.fields[k].nullable:
                            raise AnalysisException("El campo '%s' no admite NULL" % names[k])
                        continue
                    if isinstance(t, (T.IntegerType, T.LongType)) and not isinstance(v, int):
                        raise TypeError("El campo %s: %s no acepta el valor %r de tipo %s" % (names[k], t.simpleString(), v, type(v).__name__))
                    if isinstance(t, T.StringType) and not isinstance(v, str):
                        raise TypeError("El campo %s: string no acepta el valor %r de tipo %s" % (names[k], v, type(v).__name__))
        return DataFrame(names, rows, self, types)

    def table(self, name):
        key = name.lower()
        if key.startswith("default."):
            key = key[8:]
        if key in _TEMP_VIEWS:
            return _TEMP_VIEWS[key]
        df = _lazy_get(key)
        if df is not None:
            return df._new(df._fields, df._rows, df._types)
        raise AnalysisException("[TABLE_OR_VIEW_NOT_FOUND] La tabla o vista '%s' no existe. Disponibles: %s"
                                % (name, sorted(_all_table_names() | set(_TEMP_VIEWS))))

    # ---- SQL vía sqlite3
    def sql(self, query, **kwargs):
        if kwargs:
            query = query.format(**kwargs)
        q = query.strip().rstrip(";")
        m = _re.match(r"(?is)^create\s+(or\s+replace\s+)?(temp(orary)?\s+)?(view|table)\s+(if\s+not\s+exists\s+)?([\w.]+)\s+as\s+(.*)$", q)
        if m:
            name, body = m.group(6), m.group(7)
            df = self.sql(body)
            if m.group(4).lower() == "view":
                df.createOrReplaceTempView(name)
            else:
                _CATALOG[name.lower()] = df
            return DataFrame([], [], self)
        m = _re.match(r"(?is)^(show\s+tables)$", q)
        if m:
            return self.createDataFrame([(k, k in _TEMP_VIEWS) for k in sorted(_all_table_names() | set(_TEMP_VIEWS))], ["tableName", "isTemporary"])
        m = _re.match(r"(?is)^(describe|desc)\s+(table\s+)?([\w.]+)$", q)
        if m:
            df = self.table(m.group(3))
            return self.createDataFrame([(c, t, None) for c, t in df.dtypes], ["col_name", "data_type", "comment"])
        return self._run_sql(q)

    def _run_sql(self, q, extra=None):
        conn = _sqlite3.connect(":memory:")
        _register_functions(conn)
        names = _all_table_names() | set(_TEMP_VIEWS) | set(extra or {})
        # tablas referenciadas: cargamos solo las que aparecen en la consulta
        ql = q.lower()
        for name in names:
            nm = name.replace("global_temp.", "")
            if _re.search(r"\b%s\b" % _re.escape(nm), ql):
                df = (extra or {}).get(name) or _TEMP_VIEWS.get(name) or _lazy_get(name)
                if df is not None:
                    _load_sqlite(conn, nm, df)
        q2 = _translate_sql(q)
        del _SQL_ERR[:]
        try:
            cur = conn.execute(q2)
        except _sqlite3.Error as e:
            if _SQL_ERR:
                raise _SQL_ERR[-1]
            msg = str(e)
            if "no such table" in msg:
                msg += ". ¿Registraste la vista con df.createOrReplaceTempView('nombre')?"
            raise AnalysisException("[SQL] " + msg)
        names = [d[0] for d in cur.description] if cur.description else []
        try:
            rows = cur.fetchall()
        except _sqlite3.Error as e:
            if _SQL_ERR:
                raise _SQL_ERR[-1]
            raise AnalysisException("[SQL] " + str(e))
        conn.close()
        return DataFrame(names, rows, self)

    def _sql_on(self, df, q, keep_types=False):
        out = self._run_sql(q, {"__t": df})
        if keep_types and out.columns == df.columns:
            out._types = df._types
            out._rows = [tuple(_restore(v, t) for v, t in zip(r, [df._col_type(i) for i in range(len(df._fields))])) for r in out._rows]
        return out



def _restore(v, t):
    from . import types as T
    if v is None:
        return None
    if isinstance(t, T.DateType) and isinstance(v, str):
        return _to_date(v)
    if isinstance(t, T.TimestampType) and isinstance(v, str):
        return _to_ts(v)
    if isinstance(t, T.BooleanType) and isinstance(v, int):
        return bool(v)
    return v


def _load_sqlite(conn, name, df):
    cols = ", ".join('"%s"' % c for c in df.columns)
    conn.execute('CREATE TABLE "%s" (%s)' % (name, cols))
    ph = ", ".join("?" * len(df.columns))

    def conv(v):
        if isinstance(v, (_dt.date, _dt.datetime)):
            return v.isoformat(sep=" ") if isinstance(v, _dt.datetime) else v.isoformat()
        if isinstance(v, (list, dict, tuple)):
            return str(v)
        return v
    conn.executemany('INSERT INTO "%s" VALUES (%s)' % (name, ph), [tuple(conv(v) for v in r) for r in df._rows])


def _translate_casts(q):
    """CAST(x AS t) y TRY_CAST(x AS t) -> funciones que respetan el modo ANSI de Spark 4."""
    out, i = [], 0
    pat = _re.compile(r"(?i)\b(try_cast|cast)\s*\(")
    while True:
        m = pat.search(q, i)
        if not m:
            out.append(q[i:])
            break
        out.append(q[i:m.start()])
        j, prof, ini = m.end(), 1, m.end()
        while j < len(q) and prof:
            if q[j] == "(":
                prof += 1
            elif q[j] == ")":
                prof -= 1
            j += 1
        dentro = q[ini:j - 1]
        partes = list(_re.finditer(r"(?i)\s+as\s+", dentro))
        if not partes:
            out.append(q[m.start():j])
        else:
            k = partes[-1]
            expr, tipo = dentro[:k.start()], dentro[k.end():].strip()
            out.append("_scast(%s, '%s', %d)" % (_translate_casts(expr), tipo.replace("'", ""), 1 if m.group(1).lower() == "try_cast" else 0))
        i = j
    return "".join(out)


def _translate_sql(q):
    """Traduce algunas funciones de Spark SQL a SQLite."""
    q = _translate_casts(q)
    rep = [
        (r"(?i)\byear\s*\(", "_year("), (r"(?i)\bmonth\s*\(", "_month("), (r"(?i)\bday(ofmonth)?\s*\(", "_day("),
        (r"(?i)\bdate_format\s*\(", "_date_format("), (r"(?i)\bdatediff\s*\(", "_datediff("),
        (r"(?i)\bdate_add\s*\(", "_date_add("), (r"(?i)\bdate_sub\s*\(", "_date_sub("),
        (r"(?i)\bto_date\s*\(", "date("), (r"(?i)\bcurrent_date\s*\(\s*\)", "date('now')"),
        (r"(?i)\bnvl\s*\(", "ifnull("), (r"(?i)\bconcat\s*\(", "_concat("), (r"(?i)\bsize\s*\(", "_size("),
        (r"(?i)\bdate_trunc\s*\(", "_date_trunc("), (r"(?i)\bint\s*\(", "_int("),
        (r"(?i)\blast_day\s*\(", "_last_day("), (r"(?i)\btrunc\s*\(", "_date_trunc_r("),
        (r"(?i)\bRLIKE\b", "REGEXP"),
    ]
    for a, b in rep:
        q = _re.sub(a, b, q)
    return q


_SQL_ERR = []


def _register_functions(conn):
    def d(v):
        return _to_date(v)

    def scast(v, tipo, lenient):
        try:
            r = _cast(v, tipo, lenient=bool(lenient))
        except Exception as e:  # noqa: BLE001 - se re-lanza fuera de SQLite con su mensaje
            _SQL_ERR.append(e)
            raise
        if isinstance(r, bool):
            return int(r)
        if isinstance(r, (_dt.date, _dt.datetime)):
            return r.isoformat(" ") if isinstance(r, _dt.datetime) else r.isoformat()
        return r
    conn.create_function("_scast", 3, scast)
    conn.create_function("try_divide", 2, lambda a, b: None if a is None or b in (None, 0) else a / b)
    conn.create_function("_year", 1, lambda v: d(v).year if d(v) else None)
    conn.create_function("_month", 1, lambda v: d(v).month if d(v) else None)
    conn.create_function("_day", 1, lambda v: d(v).day if d(v) else None)
    conn.create_function("_date_format", 2, lambda v, f: (_to_ts(v).strftime(_java_fmt(f)) if _to_ts(v) else None))
    conn.create_function("_datediff", 2, lambda a, b: (d(a) - d(b)).days if d(a) and d(b) else None)
    conn.create_function("_date_add", 2, lambda a, n: (d(a) + _dt.timedelta(days=n)).isoformat() if d(a) else None)
    conn.create_function("_date_sub", 2, lambda a, n: (d(a) - _dt.timedelta(days=n)).isoformat() if d(a) else None)
    conn.create_function("_concat", -1, lambda *a: None if any(x is None for x in a) else "".join(str(x) for x in a))
    conn.create_function("_size", 1, lambda v: None if v is None else len(str(v).split(",")))
    conn.create_function("_int", 1, lambda v: None if v is None else int(float(v)))
    conn.create_function("_date_trunc", 2, lambda unit, v: _trunc(v, unit))
    conn.create_function("_date_trunc_r", 2, lambda v, unit: _trunc(v, unit, as_date=True))
    conn.create_function("_last_day", 1, lambda v: _last_day(d(v)).isoformat() if d(v) else None)
    conn.create_function("REGEXP", 2, lambda pat, s: None if s is None else 1 if _re.search(pat, str(s)) else 0)
    conn.create_function("initcap", 1, lambda s: None if s is None else str(s).title())
    conn.create_function("sqrt", 1, lambda x: None if x is None else x ** 0.5)
    conn.create_function("power", 2, lambda x, y: None if x is None or y is None else x ** y)
    conn.create_function("pow", 2, lambda x, y: None if x is None or y is None else x ** y)
    conn.create_function("floor", 1, lambda x: None if x is None else int(x // 1))
    conn.create_function("ceil", 1, lambda x: None if x is None else -int((-x) // 1))
    conn.create_function("split_part", 3, lambda s, sep, i: None if s is None else (str(s).split(sep) + [""] * i)[i - 1])


def _last_day(dd):
    import calendar
    return dd.replace(day=calendar.monthrange(dd.year, dd.month)[1])


def _trunc(v, unit, as_date=False):
    t = _to_ts(v)
    if t is None:
        return None
    u = str(unit).lower()
    if u in ("year", "yyyy", "yy"):
        t = t.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    elif u in ("quarter",):
        t = t.replace(month=(t.month - 1) // 3 * 3 + 1, day=1, hour=0, minute=0, second=0, microsecond=0)
    elif u in ("month", "mon", "mm"):
        t = t.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    elif u == "week":
        t = (t - _dt.timedelta(days=t.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    elif u == "day" or u == "dd":
        t = t.replace(hour=0, minute=0, second=0, microsecond=0)
    elif u == "hour":
        t = t.replace(minute=0, second=0, microsecond=0)
    if as_date:
        return t.date().isoformat()
    return t.isoformat(sep=" ")


from . import functions  # noqa: E402
from . import types  # noqa: E402
from .window import Window, WindowSpec  # noqa: E402,F401


def _load_sample_tables(tables):
    """Carga las tablas de ejemplo (dict nombre -> {columns, rows}) en el catálogo.
    Las columnas fecha_* se convierten a date/timestamp como haría Spark."""
    from . import types as T
    out = {}
    for name, t in tables.items():
        cols = t["columns"]
        rows = [list(r) for r in t["rows"]]
        types = []
        for i, c in enumerate(cols):
            sample = next((r[i] for r in rows if r[i] is not None), None)
            if c.startswith("fecha") and isinstance(sample, str):
                if len(sample) > 10:
                    for r in rows:
                        r[i] = _to_ts(r[i])
                    types.append(T.TimestampType())
                else:
                    for r in rows:
                        r[i] = _to_date(r[i])
                    types.append(T.DateType())
            elif isinstance(sample, float) or any(isinstance(r[i], float) for r in rows[:200]):
                for r in rows:
                    if r[i] is not None:
                        r[i] = float(r[i])
                types.append(T.DoubleType())
            elif isinstance(sample, int):
                types.append(T.IntegerType())
            else:
                types.append(T.StringType())
        out[name] = DataFrame(cols, [tuple(r) for r in rows], None, types)
    return out
