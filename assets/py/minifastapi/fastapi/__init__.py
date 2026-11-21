"""mini-FastAPI: lo justo de FastAPI para construir y probar una API en el navegador, sin servidor.

Rutas con @app.get/post/put/patch/delete, parámetros de ruta, de consulta (query), de encabezado (Header)
y de cuerpo (modelos de pydantic), dependencias con Depends, HTTPException, status_code, response_model y
respuestas de error con el mismo formato que FastAPI (404 "Not Found", 405, 422 con la lista de errores).
Se prueba con fastapi.testclient.TestClient, igual que en un proyecto real.
"""
import inspect as _inspect
import re as _re
import typing as _t

from pydantic import BaseModel, FieldInfo, ValidationError, validar_valor, _FALTA
from . import status

__all__ = ["FastAPI", "APIRouter", "HTTPException", "Depends", "Query", "Path", "Header", "Body", "status", "Request"]


class HTTPException(Exception):
    def __init__(self, status_code, detail=None, headers=None):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail if detail is not None else _FRASES.get(status_code, "")
        self.headers = headers or {}


_FRASES = {200: "OK", 201: "Created", 204: "No Content", 400: "Bad Request", 401: "Unauthorized", 403: "Forbidden",
           404: "Not Found", 405: "Method Not Allowed", 409: "Conflict", 422: "Unprocessable Entity",
           429: "Too Many Requests", 500: "Internal Server Error"}


class _Param(FieldInfo):
    donde = "query"

    def __init__(self, default=_FALTA, *, alias=None, **kw):
        super().__init__(default, alias=alias, **kw)


class _Query(_Param):
    donde = "query"


class _Path(_Param):
    donde = "path"


class _Header(_Param):
    donde = "header"

    def __init__(self, default=_FALTA, *, alias=None, convert_underscores=True, **kw):
        super().__init__(default, alias=alias, **kw)
        self.convert_underscores = convert_underscores


class _Body(_Param):
    donde = "body"


def Query(default=_FALTA, **kw):
    return _Query(default, **kw)


def Path(default=_FALTA, **kw):
    return _Path(default, **kw)


def Header(default=_FALTA, **kw):
    return _Header(default, **kw)


def Body(default=_FALTA, **kw):
    return _Body(default, **kw)


class _Depends:
    def __init__(self, dependency=None):
        self.dependency = dependency


def Depends(dependency=None):
    return _Depends(dependency)


class Request:
    """Lo que la ruta puede saber del pedido que llegó."""

    def __init__(self, method, path, query, headers, body):
        self.method, self.url_path, self.query_params, self.headers, self._body = method, path, query, headers, body

    def json(self):
        return self._body


class _Ruta:
    def __init__(self, metodo, plantilla, fn, status_code, response_model):
        self.metodo, self.plantilla, self.fn = metodo, plantilla, fn
        self.status_code, self.response_model = status_code, response_model
        nombres = _re.findall(r"{(\w+)(?::path)?}", plantilla)
        patron = _re.sub(r"{(\w+):path}", r"(?P<\1>.+)", plantilla)
        patron = _re.sub(r"{(\w+)}", r"(?P<\1>[^/]+)", patron)
        self.regex = _re.compile("^" + patron + "$")
        self.nombres = nombres


class _ErrorValidacion(Exception):
    def __init__(self, errores):
        self.errores = errores


class APIRouter:
    def __init__(self, prefix="", tags=None, dependencies=None):
        self.prefix = prefix
        self.rutas = []
        self.dependencias = list(dependencies or [])

    def api_route(self, path, methods, status_code=None, response_model=None, **_):
        def deco(fn):
            for m in methods:
                self.rutas.append(_Ruta(m.upper(), self.prefix + path, fn, status_code, response_model))
            return fn
        return deco

    def get(self, path, **kw):
        return self.api_route(path, ["GET"], **kw)

    def post(self, path, **kw):
        return self.api_route(path, ["POST"], **kw)

    def put(self, path, **kw):
        return self.api_route(path, ["PUT"], **kw)

    def patch(self, path, **kw):
        return self.api_route(path, ["PATCH"], **kw)

    def delete(self, path, **kw):
        return self.api_route(path, ["DELETE"], **kw)


class FastAPI(APIRouter):
    def __init__(self, title="FastAPI", version="0.1.0", description="", dependencies=None, **_):
        super().__init__(dependencies=dependencies)
        self.title, self.version, self.description = title, version, description

    def include_router(self, router, prefix="", **_):
        for r in router.rutas:
            nueva = _Ruta(r.metodo, prefix + r.plantilla, r.fn, r.status_code, r.response_model)
            nueva.dependencias_extra = router.dependencias
            self.rutas.append(nueva)

    # ------------------------------------------------------------------ atender un pedido (lo usa TestClient)
    def _atender(self, metodo, ruta, query, headers, body):
        headers = {k.lower(): v for k, v in (headers or {}).items()}
        coincide_ruta = False
        for r in self.rutas:
            m = r.regex.match(ruta)
            if not m:
                continue
            coincide_ruta = True
            if r.metodo != metodo:
                continue
            pedido = Request(metodo, ruta, query, headers, body)
            try:
                for d in self.dependencias + getattr(r, "dependencias_extra", []):
                    self._llamar(d.dependency, m.groupdict(), pedido, {})
                resultado = self._llamar(r.fn, m.groupdict(), pedido, {})
            except _ErrorValidacion as e:
                return 422, {"detail": e.errores}, {}
            except HTTPException as e:
                return e.status_code, {"detail": e.detail}, dict(e.headers)
            from .responses import JSONResponse
            if isinstance(resultado, JSONResponse):
                return resultado.status_code, resultado.content, dict(resultado.headers)
            codigo = r.status_code or (200 if metodo != "DELETE" or resultado is not None else 200)
            return codigo, self._salida(resultado, r.response_model), {}
        if coincide_ruta:
            return 405, {"detail": "Method Not Allowed"}, {}
        return 404, {"detail": "Not Found"}, {}

    def _salida(self, valor, modelo):
        if modelo is not None:
            args = _t.get_args(modelo)
            if _t.get_origin(modelo) is list and args and isinstance(args[0], type) and issubclass(args[0], BaseModel):
                return [_a_modelo(args[0], x).model_dump() for x in valor]
            if isinstance(modelo, type) and issubclass(modelo, BaseModel):
                return _a_modelo(modelo, valor).model_dump()
        return _jsonable(valor)

    def _llamar(self, fn, params_ruta, pedido, cache):
        if fn in cache:
            return cache[fn]
        kwargs, errores = {}, []
        firma = _inspect.signature(fn)
        try:
            pistas = _t.get_type_hints(fn)
        except Exception:
            pistas = {}
        cuerpos = [n for n, p in firma.parameters.items()
                   if isinstance(pistas.get(n), type) and issubclass(pistas[n], BaseModel) or isinstance(p.default, _Body)]
        for nombre, p in firma.parameters.items():
            tipo = pistas.get(nombre, str if p.annotation is _inspect.Parameter.empty else p.annotation)
            defecto = p.default
            if tipo is Request:
                kwargs[nombre] = pedido
                continue
            if isinstance(defecto, _Depends):
                kwargs[nombre] = self._llamar(defecto.dependency or tipo, params_ruta, pedido, cache)
                continue
            info = defecto if isinstance(defecto, FieldInfo) else FieldInfo(_FALTA if defecto is _inspect.Parameter.empty else defecto)
            if nombre in params_ruta:
                v, e = validar_valor(tipo, params_ruta[nombre], ["path", nombre], info)
            elif nombre in cuerpos:
                if isinstance(tipo, type) and issubclass(tipo, BaseModel):
                    datos = pedido._body if len(cuerpos) == 1 else (pedido._body or {}).get(nombre, _FALTA)
                    if datos is None or datos is _FALTA:
                        v, e = None, ([{"type": "missing", "loc": ("body",), "msg": "Field required", "input": None}] if info.requerido() else [])
                        v = None if e else info.valor_por_defecto()
                    else:
                        v, e = validar_valor(tipo, datos, ["body"], info)
                else:
                    datos = (pedido._body or {}).get(nombre, _FALTA) if isinstance(pedido._body, dict) else _FALTA
                    if datos is _FALTA:
                        v, e = (None, [{"type": "missing", "loc": ("body", nombre), "msg": "Field required", "input": None}]) if info.requerido() else (info.valor_por_defecto(), [])
                    else:
                        v, e = validar_valor(tipo, datos, ["body", nombre], info)
            else:
                donde = getattr(info, "donde", "query")
                if donde == "header":
                    clave = info.alias or (nombre.replace("_", "-") if getattr(info, "convert_underscores", True) else nombre)
                    fuente = pedido.headers
                    clave = clave.lower()
                else:
                    clave = info.alias or nombre
                    fuente = pedido.query_params
                if clave in fuente:
                    crudo = fuente[clave]
                    origen = _t.get_origin(tipo)
                    if origen is list and not isinstance(crudo, list):
                        crudo = [crudo]
                    elif origen is not list and isinstance(crudo, list):
                        crudo = crudo[-1]
                    v, e = validar_valor(tipo, crudo, [donde, clave], info)
                elif info.requerido():
                    v, e = None, [{"type": "missing", "loc": (donde, clave), "msg": "Field required", "input": None}]
                else:
                    v, e = info.valor_por_defecto(), []
            errores += e
            kwargs[nombre] = v
        if errores:
            raise _ErrorValidacion([dict(x, loc=list(x["loc"])) for x in errores])
        resultado = fn(**kwargs)
        cache[fn] = resultado
        return resultado


def _a_modelo(modelo, valor):
    if isinstance(valor, modelo):
        return valor
    if isinstance(valor, BaseModel):
        valor = valor.model_dump()
    if isinstance(valor, dict):
        datos = {k: valor[k] for k in modelo.model_fields if k in valor}
        return modelo(**datos)
    return modelo.model_validate(valor)


def _jsonable(v):
    if isinstance(v, BaseModel):
        return v.model_dump()
    if isinstance(v, (list, tuple)):
        return [_jsonable(x) for x in v]
    if isinstance(v, dict):
        return {str(k): _jsonable(x) for k, x in v.items()}
    if hasattr(v, "isoformat"):
        return v.isoformat()
    return v
