"""Planes de ejecución de mini-Spark: explain() con la forma de Spark real.

mini-Spark calcula los resultados en el momento, pero cada DataFrame recuerda qué operación lo creó y de qué
DataFrames vino (su linaje). Con eso, explain() arma el plan como lo haría Catalyst:
  - plan lógico analizado: las operaciones tal como las escribiste;
  - plan lógico optimizado: filtros empujados hacia la lectura, proyecciones juntas y solo las columnas necesarias;
  - plan físico: HashAggregate parcial + Exchange (shuffle) + HashAggregate final, BroadcastHashJoin si una tabla
    es chica (spark.sql.autoBroadcastJoinThreshold, 10 MB) o tiene el hint broadcast, SortMergeJoin si no,
    Window con su Exchange y Sort, AdaptiveSparkPlan cuando AQE está activo.
Los tamaños son los de los datos de práctica, así que casi todos los joins salen broadcast: igual que pasaría en
Spark con tablas de este tamaño. Para ver un SortMergeJoin, desactiva el broadcast automático:
    spark.conf.set("spark.sql.autoBroadcastJoinThreshold", -1)
"""
import functools

_IDS = [0]


def _nid():
    _IDS[0] += 1
    return _IDS[0]


# ------------------------------------------------------------------ columnas que usa una expresión
def _refs(c, out=None):
    """Nombres de columna que lee una expresión (str, Column, WindowSpec o listas). '*' = todas."""
    out = set() if out is None else out
    if c is None:
        return out
    if isinstance(c, str):
        out.add(c.split(".")[-1].strip("`"))
        return out
    if isinstance(c, (list, tuple, set)):
        for x in c:
            _refs(x, out)
        return out
    kind = getattr(c, "kind", None)
    if kind is not None:
        if kind == "ref":
            out.add(str(c._name).split(".")[-1].strip("`"))
        elif kind == "star":
            out.add("*")
        for ch in c.children:
            _refs(ch, out)
        for v in c.kw.values():
            if hasattr(v, "kind") or isinstance(v, (list, tuple)) or hasattr(v, "_partition"):
                _refs(v, out)
        return out
    if hasattr(v := c, "_partition"):
        _refs(v._partition, out)
        _refs(v._order, out)
    return out


def _txt(c):
    if isinstance(c, str):
        return c
    if hasattr(c, "_out_name"):
        try:
            return str(c._name if c.kind != "sort" else c._out_name())
        except Exception:
            return str(c)
    return str(c)


def _sort_txt(c):
    if getattr(c, "kind", None) == "sort":
        base = _txt(c.children[0]) if c.children else str(c._name)
        asc = c.kw.get("asc", True)
        nf = c.kw.get("nulls_first", asc)
        return "%s %s NULLS %s" % (base, "ASC" if asc else "DESC", "FIRST" if nf else "LAST")
    return "%s ASC NULLS FIRST" % _txt(c)


def _has_window(c):
    if getattr(c, "kind", None) == "win":
        return c
    for ch in getattr(c, "children", []) or []:
        w = _has_window(ch)
        if w is not None:
            return w
    return None


def _conf(df, k, default):
    s = getattr(df, "_session", None)
    try:
        from . import SparkSession
        s = s or SparkSession._active
        return s.conf.get(k, default) if s is not None else default
    except Exception:
        return default


# ------------------------------------------------------------------ nodos
def plan_de(df):
    p = getattr(df, "_plan", None)
    if p is None:
        p = {"op": "rdd", "out": list(df.columns), "rows": len(df._rows), "id": _nid()}
        df._plan = p
    return p


def _nodo(op, df, hijos, **kw):
    n = {"op": op, "out": list(df.columns), "rows": len(df._rows), "hijos": hijos, "id": _nid()}
    n.update(kw)
    return n


def construir(nombre, self, args, kwargs, res):
    """Nodo del plan para el DataFrame `res`, creado por self.<nombre>(*args)."""
    hijo = plan_de(self)
    a0 = args[0] if args else None
    if nombre in ("filter", "where"):
        return _nodo("filter", res, [hijo], cond=_txt(a0), refs=_refs(a0))
    if nombre in ("select", "selectExpr", "toDF", "drop", "withColumnRenamed", "alias", "withColumns"):
        if nombre == "select":
            exprs = []
            for c in args:
                for x in (c if isinstance(c, (list, tuple)) else [c]):
                    exprs.append(x)
            w = next((_has_window(x) for x in exprs if _has_window(x) is not None), None)
            if w is not None:
                return _ventana(res, hijo, w)
            return _nodo("project", res, [hijo], refs=_refs(exprs), sel=True)
        if nombre == "selectExpr":
            return _nodo("project", res, [hijo], refs=set(self.columns) & _palabras(" ".join(map(str, args))) or set(self.columns), sel=True)
        viejas = {args[0]} if nombre == "withColumnRenamed" and args else set()
        return _nodo("project", res, [hijo], refs=set(), viejas=viejas)
    if nombre == "withColumn":
        col = args[1] if len(args) > 1 else kwargs.get("col")
        w = _has_window(col)
        if w is not None:
            return _ventana(res, hijo, w)
        return _nodo("project", res, [hijo], refs=set(), refs_nueva=_refs(col), nueva=args[0] if args else None)
    if nombre in ("distinct", "dropDuplicates", "drop_duplicates"):
        claves = list(a0) if isinstance(a0, (list, tuple)) and a0 else list(self.columns)
        return _nodo("agg", res, [hijo], keys=claves, funcs=[] if nombre == "distinct" else ["first(...)"], refs=set(self.columns))
    if nombre in ("orderBy", "sort"):
        cols = []
        for c in args:
            cols.extend(c if isinstance(c, (list, tuple)) else [c])
        return _nodo("sort", res, [hijo], keys=[_sort_txt(c) for c in cols], refs=_refs(cols), glob=True)
    if nombre == "sortWithinPartitions":
        return _nodo("sort", res, [hijo], keys=[_sort_txt(c) for c in args], refs=_refs(list(args)), glob=False)
    if nombre == "limit":
        return _nodo("limit", res, [hijo], n=a0)
    if nombre == "repartition":
        cols = [c for c in args if not isinstance(c, int)]
        n = a0 if isinstance(a0, int) else int(_conf(self, "spark.sql.shuffle.partitions", "200"))
        return _nodo("exchange", res, [hijo], n=n, keys=[_txt(c) for c in cols])
    if nombre == "coalesce":
        return _nodo("coalesce", res, [hijo], n=a0)
    if nombre in ("union", "unionByName", "unionAll"):
        return _nodo("union", res, [hijo, plan_de(a0)])
    if nombre in ("intersect", "subtract", "exceptAll", "intersectAll"):
        return _nodo("setop", res, [hijo, plan_de(a0)], tipo={"intersect": "LeftSemi", "intersectAll": "LeftSemi"}.get(nombre, "LeftAnti"))
    if nombre == "join":
        otro = a0
        on = args[1] if len(args) > 1 else kwargs.get("on")
        how = (args[2] if len(args) > 2 else kwargs.get("how")) or "inner"
        return _join(self, otro, on, how, res)
    if nombre == "crossJoin":
        return _join(self, a0, None, "cross", res)
    if nombre == "cache" or nombre == "persist":
        return {"op": "cache", "out": list(res.columns), "rows": len(res._rows), "hijos": [hijo], "id": _nid()}
    return _nodo("project", res, [hijo], refs=set(), generico=nombre)


def _ventana(res, hijo, w):
    spec = w.kw.get("spec")
    part = [_txt(c) for c in (spec._partition if spec is not None else [])]
    orden = [_sort_txt(c) for c in (spec._order if spec is not None else [])]
    return _nodo("window", res, [hijo], fn=_txt(w), part=part, orden=orden, refs=set(hijo["out"]))


def _join(left, right, on, how, res):
    how = str(how).lower().replace("_", "")
    tipos = {"inner": "Inner", "left": "LeftOuter", "leftouter": "LeftOuter", "right": "RightOuter", "rightouter": "RightOuter",
             "outer": "FullOuter", "full": "FullOuter", "fullouter": "FullOuter", "leftsemi": "LeftSemi", "semi": "LeftSemi",
             "leftanti": "LeftAnti", "anti": "LeftAnti", "cross": "Cross"}
    tipo = tipos.get(how, "Inner")
    lp, rp = plan_de(left), plan_de(right)
    if on is None:
        lk, rk, cond = [], [], None
    elif isinstance(on, str) or (isinstance(on, (list, tuple)) and all(isinstance(x, str) for x in on)):
        lk = rk = [on] if isinstance(on, str) else list(on)
        cond = None
    else:
        refs = _refs(on)
        lk = [c for c in refs if c in left.columns]
        rk = [c for c in refs if c in right.columns]
        cond = _txt(on)
    return {"op": "join", "out": list(res.columns), "rows": len(res._rows), "hijos": [lp, rp], "id": _nid(),
            "tipo": tipo, "lk": lk, "rk": rk, "cond": cond,
            "bl": bool(getattr(left, "_broadcast", False)), "br": bool(getattr(right, "_broadcast", False))}


def agregacion(gd, exprs, res):
    hijo = plan_de(gd._df)
    try:
        claves = gd._key_names()
    except Exception:
        claves = []
    funcs = [_txt(e) if getattr(e, "kind", None) != "agg" or not e.kw.get("alias") else "%s AS %s" % (e._name, e.kw["alias"]) for e in exprs]
    refs = _refs(gd._keys) | _refs(list(exprs))
    return _nodo("agg", res, [hijo], keys=claves, funcs=funcs, refs=refs, modo=gd._mode, pivot=bool(gd._pivot))


# ------------------------------------------------------------------ optimizador (Catalyst, versión de bolsillo)
def _copia(n):
    m = dict(n)
    m["hijos"] = [_copia(h) for h in n.get("hijos", [])]
    return m


def optimizar(n):
    n = _copia(n)
    return _juntar(_podar(_empujar(n), set(n["out"])))


def _empujar(n):
    n["hijos"] = [_empujar(h) for h in n.get("hijos", [])]
    # Filter sobre Project: el filtro baja (predicate pushdown) si solo usa columnas que ya existían debajo
    if n["op"] == "filter" and n["hijos"] and n["hijos"][0]["op"] == "project":
        p = n["hijos"][0]
        nieto = p["hijos"][0]
        refs = n.get("refs") or set()
        if refs and refs <= set(nieto["out"]) and p.get("nueva") not in refs:
            f = dict(n, hijos=[nieto], out=list(nieto["out"]))
            return dict(p, hijos=[_empujar(f)])
    return n


def _necesita(n, req):
    """Columnas que el nodo `n` le pide a cada hijo si arriba se necesitan `req` (column pruning)."""
    op = n["op"]
    hijos = n.get("hijos", [])
    if not hijos:
        return []
    hout = [set(h["out"]) for h in hijos]
    refs = set(n.get("refs") or set())
    if "*" in refs:
        return hout
    if op == "project":
        if n.get("sel"):
            r = refs
        elif n.get("nueva") is not None:
            r = (req - {n["nueva"]}) | set(n.get("refs_nueva") or set())
        else:
            r = set(req) | set(n.get("viejas") or set())
        return [(r & hout[0]) or set(hijos[0]["out"][:1])]
    if op in ("filter", "sort"):
        return [(req | refs) & hout[0]]
    if op == "agg":
        return [(refs & hout[0]) or set(hijos[0]["out"][:1])]
    if op == "window":
        r = set(n.get("part", [])) | {k.split(" ")[0] for k in n.get("orden", [])} | (req - {n["out"][-1]})
        r |= _palabras(n.get("fn", "")) & hout[0]
        return [r & hout[0]]
    if op == "join":
        claves = set(n.get("lk", [])) | set(n.get("rk", []))
        return [((req | claves) & o) or set(h["out"][:1]) for h, o in zip(hijos, hout)]
    if op in ("union", "setop"):
        return [set(h["out"]) for h in hijos]
    if op == "cache":
        return [set(hijos[0]["out"])]
    return [(req & o) or o for o in hout]


def _palabras(s):
    import re
    return set(re.findall(r"[A-Za-z_][A-Za-z0-9_]*", s or ""))


def _podar(n, req):
    n["req"] = [c for c in n["out"] if c in req] or n["out"][:1]
    for h, r in zip(n.get("hijos", []), _necesita(n, set(n["req"]))):
        _podar(h, r)
    return n


def _juntar(n):
    """CollapseProject: un Project sobre otro Project se muestra como uno solo."""
    n["hijos"] = [_juntar(h) for h in n.get("hijos", [])]
    while n["op"] == "project" and n["hijos"] and n["hijos"][0]["op"] == "project":
        n["hijos"] = n["hijos"][0]["hijos"]
    # un Project que no cambia nada (mismas columnas que su hijo) desaparece
    if n["op"] == "project" and n["hijos"] and n.get("req") == n["hijos"][0]["out"] and not n.get("nueva"):
        return n["hijos"][0]
    return n


# ------------------------------------------------------------------ impresión
def _dibujar(n, etiquetas, hijos_de, nivel=0):
    """etiquetas(n) -> lista de líneas del nodo (la primera es el nodo; el resto, nodos encadenados debajo)."""
    filas = []
    for k, l in enumerate(etiquetas(n)):
        filas.append((nivel + k, l))
    base = nivel + len(etiquetas(n)) - 1
    for h in hijos_de(n):
        filas.extend(_dibujar(h, etiquetas, hijos_de, base + 1))
    return filas


def _texto(filas):
    out = []
    for nivel, l in filas:
        out.append(l if nivel == 0 else "   " * (nivel - 1) + "+- " + l)
    # Spark marca con ":" la rama izquierda de un join/union cuando hay otra debajo
    return "\n".join(out)


def _cols(cs):
    return "[" + ", ".join(cs) + "]"


def _rel(n, cols):
    if n["op"] == "scan":
        return "Relation spark_catalog.default.%s%s parquet" % (n["tabla"], _cols(cols))
    if n["op"] == "file":
        return "Relation [%s] %s" % (", ".join(cols), n["fmt"])
    return "LogicalRDD %s, false" % _cols(cols)


def _logico(n, analizado=True):
    op = n["op"]
    if op in ("scan", "file", "rdd"):
        if not analizado and op == "scan":
            return ["'UnresolvedRelation [%s], [], false" % n["tabla"]]
        return [_rel(n, n["out"] if analizado else n.get("req", n["out"]))]
    if op == "project":
        return ["Project %s" % _cols(n.get("req", n["out"]) if not analizado else n["out"])]
    if op == "filter":
        return ["Filter %s" % n["cond"]]
    if op == "agg":
        return ["Aggregate %s, %s" % (_cols(n["keys"]), _cols(n["keys"] + n["funcs"]))]
    if op == "sort":
        return ["Sort %s, %s" % (_cols(n["keys"]), "true" if n.get("glob", True) else "false")]
    if op == "limit":
        return ["GlobalLimit %s" % n["n"], "LocalLimit %s" % n["n"]]
    if op == "window":
        return ["Window [%s], %s, %s" % (n["fn"], _cols(n["part"]), _cols(n["orden"]))]
    if op == "join":
        cond = n["cond"] or " AND ".join("(%s = %s)" % (a, b) for a, b in zip(n["lk"], n["rk"])) or ""
        hint = " , rightHint=(strategy=broadcast)" if n.get("br") else ""
        return ["Join %s%s%s" % (n["tipo"], ", " + cond if cond else "", hint)]
    if op == "union":
        return ["Union false, false"]
    if op == "setop":
        return ["Join %s" % n["tipo"]]
    if op == "exchange":
        return ["Repartition%s %s, true" % ("ByExpression " + _cols(n["keys"]) + "," if n["keys"] else "", n["n"])]
    if op == "coalesce":
        return ["Repartition %s, false" % n["n"]]
    if op == "cache":
        return ["InMemoryRelation %s, StorageLevel(disk, memory, deserialized, 1 replicas)" % _cols(n["out"])]
    return [op]


def _bytes(n):
    return max(1, n.get("rows", 0)) * max(1, len(n.get("req", n["out"]))) * 8


def _fisico(df, n):
    umbral = int(float(_conf(df, "spark.sql.autoBroadcastJoinThreshold", "10485760")))
    shuffle = int(_conf(df, "spark.sql.shuffle.partitions", "200"))

    def et(n, padre=None):
        op = n["op"]
        if op == "scan":
            pf = n.get("pushed", [])
            return ["FileScan parquet spark_catalog.default.%s%s Batched: true, DataFilters: %s, Format: Parquet, "
                    "Location: InMemoryFileIndex(1 paths)[dbfs:/user/hive/warehouse/%s], PartitionFilters: [], "
                    "PushedFilters: %s, ReadSchema: struct<%s>" % (
                        n["tabla"], _cols(n.get("req", n["out"])), _cols(n.get("datafilters", [])), n["tabla"],
                        _cols(pf), ",".join("%s:%s" % (c, (n.get("tipos") or {}).get(c, "string")) for c in n.get("req", n["out"])))]
        if op == "file":
            return ["FileScan %s %s Batched: false, DataFilters: [], Format: %s, Location: InMemoryFileIndex(1 paths)[%s], "
                    "PartitionFilters: [], PushedFilters: %s, ReadSchema: struct<%s>" % (
                        n["fmt"], _cols(n.get("req", n["out"])), n["fmt"].upper() if n["fmt"] != "parquet" else "Parquet",
                        n["path"], _cols(n.get("pushed", [])), ",".join(n.get("req", n["out"])))]
        if op == "rdd":
            return ["Scan ExistingRDD%s" % _cols(n.get("req", n["out"]))]
        if op == "project":
            return ["Project %s" % _cols(n.get("req", n["out"]))]
        if op == "filter":
            return ["Filter %s" % n["cond"]]
        if op == "agg":
            ks = n["keys"]
            parcial = ["partial_" + f.split(" AS ")[0] for f in n["funcs"]]
            final = [f.split(" AS ")[0] for f in n["funcs"]]
            if n.get("modo") in ("rollup", "cube"):
                return ["HashAggregate(keys=%s, functions=%s)" % (_cols(ks + ["spark_grouping_id"]), _cols(final)),
                        "Exchange hashpartitioning(%s, %d), ENSURE_REQUIREMENTS, [plan_id=%d]" % (", ".join(ks + ["spark_grouping_id"]), shuffle, n["id"]),
                        "HashAggregate(keys=%s, functions=%s)" % (_cols(ks + ["spark_grouping_id"]), _cols(parcial)),
                        "Expand [%d proyecciones], %s" % (len(ks) + 1 if n.get("modo") == "rollup" else 2 ** len(ks), _cols(ks + ["spark_grouping_id"]))]
            ex = ("Exchange hashpartitioning(%s, %d), ENSURE_REQUIREMENTS, [plan_id=%d]" % (", ".join(ks), shuffle, n["id"])) if ks \
                else "Exchange SinglePartition, ENSURE_REQUIREMENTS, [plan_id=%d]" % n["id"]
            return ["HashAggregate(keys=%s, functions=%s)" % (_cols(ks), _cols(final)), ex,
                    "HashAggregate(keys=%s, functions=%s)" % (_cols(ks), _cols(parcial))]
        if op == "sort":
            if padre is not None and padre["op"] == "limit":
                return []
            if not n.get("glob", True):
                return ["Sort %s, false, 0" % _cols(n["keys"])]
            return ["Sort %s, true, 0" % _cols(n["keys"]),
                    "Exchange rangepartitioning(%s, %d), ENSURE_REQUIREMENTS, [plan_id=%d]" % (", ".join(n["keys"]), shuffle, n["id"])]
        if op == "limit":
            h = n["hijos"][0]
            if h["op"] == "sort":
                return ["TakeOrderedAndProject(limit=%s, orderBy=%s, output=%s)" % (n["n"], _cols(h["keys"]), _cols(n.get("req", n["out"])))]
            return ["CollectLimit %s" % n["n"]]
        if op == "window":
            ex = ("Exchange hashpartitioning(%s, %d), ENSURE_REQUIREMENTS, [plan_id=%d]" % (", ".join(n["part"]), shuffle, n["id"])) if n["part"] \
                else "Exchange SinglePartition, ENSURE_REQUIREMENTS, [plan_id=%d]" % n["id"]
            return ["Window [%s], %s, %s" % (n["fn"], _cols(n["part"]), _cols(n["orden"])),
                    "Sort %s, false, 0" % _cols(["%s ASC NULLS FIRST" % p for p in n["part"]] + n["orden"]), ex]
        if op == "join":
            if n["tipo"] == "Cross" or not (n["lk"] or n["rk"]):
                return ["BroadcastNestedLoopJoin BuildRight, %s" % n["tipo"]]
            return ["%s %s, %s, %s%s" % (n["estrategia"], _cols(n["lk"]), _cols(n["rk"]), n["tipo"],
                                         ", BuildRight, false" if n["estrategia"] == "BroadcastHashJoin" and n.get("build") == "R"
                                         else ", BuildLeft, false" if n["estrategia"] == "BroadcastHashJoin" else "")]
        if op == "union":
            return ["Union"]
        if op == "setop":
            return ["BroadcastHashJoin %s, %s, %s, BuildRight, false" % (_cols(n["out"]), _cols(n["out"]), n["tipo"])]
        if op == "exchange":
            if n["keys"]:
                return ["Exchange hashpartitioning(%s, %d), REPARTITION_BY_NUM, [plan_id=%d]" % (", ".join(n["keys"]), n["n"], n["id"])]
            return ["Exchange RoundRobinPartitioning(%d), REPARTITION_BY_NUM, [plan_id=%d]" % (n["n"], n["id"])]
        if op == "coalesce":
            return ["Coalesce %s" % n["n"]]
        if op == "cache":
            return ["InMemoryTableScan %s" % _cols(n.get("req", n["out"])),
                    "InMemoryRelation %s, StorageLevel(disk, memory, deserialized, 1 replicas)" % _cols(n["out"])]
        return [op]

    # decidir la estrategia de cada join y empujar filtros a la lectura
    def preparar(n):
        for h in n.get("hijos", []):
            preparar(h)
        if n["op"] == "join":
            l, r = n["hijos"]
            if n.get("br") or (not n.get("bl") and umbral >= 0 and _bytes(r) <= umbral and n["tipo"] not in ("RightOuter", "FullOuter")):
                n["estrategia"], n["build"] = "BroadcastHashJoin", "R"
            elif n.get("bl") or (umbral >= 0 and _bytes(l) <= umbral and n["tipo"] in ("Inner", "RightOuter")):
                n["estrategia"], n["build"] = "BroadcastHashJoin", "L"
            else:
                n["estrategia"] = "SortMergeJoin"
        if n["op"] == "filter" and n["hijos"] and n["hijos"][0]["op"] in ("scan", "file"):
            s = n["hijos"][0]
            s["pushed"] = ["IsNotNull(%s)" % c for c in sorted(n.get("refs") or [])] + [_pushed(n["cond"])]
            s["datafilters"] = ["isnotnull(%s)" % c for c in sorted(n.get("refs") or [])] + [n["cond"]]
            n["cond"] = "(%s AND %s)" % (" AND ".join("isnotnull(%s)" % c for c in sorted(n.get("refs") or [])), n["cond"]) if n.get("refs") else n["cond"]

    preparar(n)

    def hijos_de(n):
        hs = n.get("hijos", [])
        if n["op"] == "limit" and hs and hs[0]["op"] == "sort":
            return hs[0]["hijos"]
        if n["op"] == "join" and n.get("estrategia") == "BroadcastHashJoin" and len(hs) == 2:
            lado = 1 if n.get("build") == "R" else 0
            hs = list(hs)
            hs[lado] = {"op": "_bx", "hijos": [hs[lado]], "out": hs[lado]["out"], "id": _nid(), "keys": n["rk"] if lado else n["lk"]}
            return hs
        if n["op"] == "join" and n.get("estrategia") == "SortMergeJoin":
            return [{"op": "_sx", "hijos": [h], "out": h["out"], "id": _nid(), "keys": k} for h, k in zip(hs, (n["lk"], n["rk"]))]
        return hs

    def et2(n):
        if n["op"] == "_bx":
            return ["BroadcastExchange HashedRelationBroadcastMode(List(%s),false), [plan_id=%d]" % (", ".join(n["keys"]), n["id"])]
        if n["op"] == "_sx":
            return ["Sort %s, false, 0" % _cols(["%s ASC NULLS FIRST" % k for k in n["keys"]]),
                    "Exchange hashpartitioning(%s, %d), ENSURE_REQUIREMENTS, [plan_id=%d]" % (", ".join(n["keys"]), shuffle, n["id"])]
        return et(n)

    filas = _dibujar(n, et2, hijos_de)
    filas = [(lv, l) for lv, l in filas if l]
    hay_exchange = any("Exchange" in l for _, l in filas)
    if hay_exchange and str(_conf(df, "spark.sql.adaptive.enabled", "true")).lower() == "true":
        filas = [(0, "AdaptiveSparkPlan isFinalPlan=false")] + [(lv + 1, l) for lv, l in filas]
    return _texto(filas)


def _pushed(cond):
    import re
    m = re.match(r"^\((\w+) (=|>|<|>=|<=) (.+)\)$", cond or "")
    if m:
        nombre = {"=": "EqualTo", ">": "GreaterThan", "<": "LessThan", ">=": "GreaterThanOrEqual", "<=": "LessThanOrEqual"}[m.group(2)]
        return "%s(%s,%s)" % (nombre, m.group(1), m.group(3))
    return cond


def explain(df, extended=False, mode=None):
    if isinstance(extended, str):
        mode, extended = extended, False
    mode = (mode or ("extended" if extended else "simple")).lower()
    p = plan_de(df)
    opt = optimizar(p)
    fis = _fisico(df, _copia(opt))
    if mode == "simple":
        print("== Physical Plan ==\n" + fis + "\n")
        return
    hijos = lambda n: n.get("hijos", [])
    analizado = _texto(_dibujar(p, lambda n: _logico(n, True), hijos))
    parseado = _texto(_dibujar(p, lambda n: _logico(n, False) if n["op"] == "scan" else _logico(n, True), hijos))
    optimizado = _texto(_dibujar(opt, lambda n: _logico_opt(n), hijos))
    if mode == "formatted":
        print("== Physical Plan ==\n" + fis + "\n\n(mini-Spark: el modo formatted muestra el mismo árbol; en Spark real "
              "agrega una sección numerada por operador con sus columnas y argumentos)\n")
        return
    if mode == "cost":
        print("== Optimized Logical Plan ==\n" + optimizado + "\n(estadísticas estimadas: sizeInBytes=%d B, rowCount=%d)\n\n== Physical Plan ==\n%s\n"
              % (_bytes(opt), opt.get("rows", 0), fis))
        return
    print("== Parsed Logical Plan ==\n%s\n\n== Analyzed Logical Plan ==\n%s\n%s\n\n== Optimized Logical Plan ==\n%s\n\n== Physical Plan ==\n%s\n"
          % (parseado, ", ".join(p["out"]), analizado, optimizado, fis))


def _logico_opt(n):
    op = n["op"]
    if op in ("scan", "file", "rdd"):
        return [_rel(n, n["out"])]
    if op == "project":
        return ["Project %s" % _cols(n.get("req", n["out"]))]
    if op == "filter":
        refs = sorted(n.get("refs") or [])
        return ["Filter %s" % (("(%s AND %s)" % (" AND ".join("isnotnull(%s)" % c for c in refs), n["cond"])) if refs else n["cond"])]
    return _logico(n, True)


# ------------------------------------------------------------------ instalación sobre las clases
OPS = ["filter", "where", "select", "selectExpr", "toDF", "drop", "withColumnRenamed", "alias", "withColumn", "withColumns",
       "distinct", "dropDuplicates", "drop_duplicates", "orderBy", "sort", "sortWithinPartitions", "limit", "repartition",
       "coalesce", "union", "unionByName", "unionAll", "intersect", "subtract", "exceptAll", "intersectAll", "join", "crossJoin"]


def instalar(DataFrame, GroupedData, SparkSession, DataFrameReader):
    for nombre in OPS:
        orig = getattr(DataFrame, nombre, None)
        if orig is None or getattr(orig, "_con_plan", False):
            continue

        def envolver(orig, nombre):
            @functools.wraps(orig)
            def f(self, *args, **kwargs):
                res = orig(self, *args, **kwargs)
                if isinstance(res, DataFrame) and res is not self:
                    try:
                        res._plan = construir(nombre, self, args, kwargs, res)
                    except Exception:
                        pass
                return res
            f._con_plan = True
            return f
        setattr(DataFrame, nombre, envolver(orig, nombre))

    orig_cache = DataFrame.cache

    def cache(self):
        res = orig_cache(self)
        if getattr(self, "_plan", {}).get("op") != "cache":
            self._plan = {"op": "cache", "out": list(self.columns), "rows": len(self._rows), "hijos": [plan_de(self)], "id": _nid()}
        return res
    DataFrame.cache = cache
    DataFrame.persist = lambda self, *a: self.cache()
    DataFrame.explain = lambda self, extended=False, mode=None: explain(self, extended, mode)

    orig_agg = GroupedData.agg

    def agg(self, *exprs):
        res = orig_agg(self, *exprs)
        try:
            ex = exprs
            if len(exprs) == 1 and isinstance(exprs[0], dict):
                ex = ()
            res._plan = agregacion(self, list(ex), res)
        except Exception:
            pass
        return res
    GroupedData.agg = agg

    orig_table = SparkSession.table

    def table(self, name):
        res = orig_table(self, name)
        key = name.lower().split(".")[-1]
        if getattr(res, "_plan", None) is None or res._plan.get("op") == "project" and res._plan.get("generico") is None:
            res._plan = {"op": "scan", "tabla": key, "out": list(res.columns), "rows": len(res._rows), "hijos": [], "id": _nid(), "tipos": _tipos(res)}
        return res
    SparkSession.table = table

    orig_load = DataFrameReader._read if hasattr(DataFrameReader, "_read") else None
    if orig_load is not None:
        def _read(self, path):
            res = orig_load(self, path)
            try:
                res._plan = {"op": "file", "fmt": getattr(self, "_fmt", "parquet") or "parquet", "path": str(path),
                             "out": list(res.columns), "rows": len(res._rows), "hijos": [], "id": _nid()}
            except Exception:
                pass
            return res
        DataFrameReader._read = _read


def _tipos(df):
    try:
        return dict(df.dtypes)
    except Exception:
        return {}


def marcar_broadcast(df):
    """F.broadcast(df): el mismo DataFrame con el hint de broadcast (la tabla se copia entera a cada executor)."""
    out = df._new(df._fields, df._rows, df._types)
    out._broadcast = True
    out._plan = plan_de(df)
    return out
