"""mini-pydantic: lo justo de pydantic v2 para validar modelos en el navegador.

Soporta BaseModel con anotaciones de tipo (int, float, str, bool, list[X], dict, Optional[X] / X | None,
Literal[...], modelos anidados), Field(default, gt, ge, lt, le, min_length, max_length), model_dump(),
model_dump_json(), model_validate() y ValidationError.errors() con los mismos tipos y mensajes que pydantic v2
en modo "lax" (por ejemplo, "5" se convierte a 5 en un int, pero 5 no se convierte a "5" en un str).
"""
import json as _json
import typing as _t
import types as _types

__all__ = ["BaseModel", "Field", "ValidationError"]
_FALTA = object()


class FieldInfo:
    def __init__(self, default=_FALTA, *, default_factory=None, gt=None, ge=None, lt=None, le=None,
                 min_length=None, max_length=None, description=None, alias=None):
        self.default = default
        self.default_factory = default_factory
        self.gt, self.ge, self.lt, self.le = gt, ge, lt, le
        self.min_length, self.max_length = min_length, max_length
        self.description = description
        self.alias = alias

    def requerido(self):
        return self.default is _FALTA and self.default_factory is None or self.default is Ellipsis

    def valor_por_defecto(self):
        return self.default_factory() if self.default_factory else self.default


def Field(default=_FALTA, **kw):
    return FieldInfo(default, **kw)


class ValidationError(ValueError):
    def __init__(self, errores, titulo="Model"):
        self._errores = errores
        self.title = titulo
        n = len(errores)
        lineas = [f"{n} validation error{'s' if n != 1 else ''} for {titulo}"]
        for e in errores:
            lineas.append(".".join(str(x) for x in e["loc"]))
            lineas.append(f"  {e['msg']} [type={e['type']}, input_value={e.get('input')!r}]")
        super().__init__("\n".join(lineas))

    def errors(self):
        # como pydantic: cada error trae un enlace a la explicación de su tipo (FastAPI lo quita en las respuestas)
        return [dict(e, url=f"https://errors.pydantic.dev/2.14/v/{e['type']}") for e in self._errores]

    def error_count(self):
        return len(self._errores)


def _err(tipo, loc, msg, valor, ctx=None):
    e = {"type": tipo, "loc": tuple(loc), "msg": msg, "input": valor}
    if ctx:
        e["ctx"] = ctx
    return e


def _es_none_type(t):
    return t is type(None)


def _union_args(t):
    origen = _t.get_origin(t)
    if origen is _t.Union or (hasattr(_types, "UnionType") and isinstance(t, _types.UnionType)):
        return _t.get_args(t)
    return None


def validar_valor(tipo, valor, loc, info=None):
    """Valida y convierte `valor` según `tipo`. Devuelve (valor_convertido, errores)."""
    args = _union_args(tipo)
    if args is not None:
        if valor is None and any(_es_none_type(a) for a in args):
            return None, []
        primero = None
        for a in args:
            if _es_none_type(a):
                continue
            v, errs = validar_valor(a, valor, loc, info)
            if not errs:
                return v, []
            primero = primero or errs
        return None, primero or [_err("none_required", loc, "Input should be None", valor)]
    if tipo is _t.Any or tipo is None:
        return valor, []
    origen = _t.get_origin(tipo)
    if origen is _t.Literal:
        opciones = _t.get_args(tipo)
        if valor in opciones:
            return valor, []
        txt = " or ".join(repr(o) for o in opciones) if len(opciones) <= 2 else ", ".join(repr(o) for o in opciones[:-1]) + f" or {opciones[-1]!r}"
        return None, [_err("literal_error", loc, f"Input should be {txt}", valor, {"expected": txt})]
    if origen in (list, tuple, set):
        if not isinstance(valor, (list, tuple, set)):
            return None, [_err("list_type", loc, "Input should be a valid list", valor)]
        sub = (_t.get_args(tipo) or (_t.Any,))[0]
        res, errs = [], []
        for i, x in enumerate(valor):
            v, e = validar_valor(sub, x, list(loc) + [i])
            res.append(v)
            errs += e
        return (origen(res) if origen is not list else res), errs
    if origen is dict or tipo is dict:
        if not isinstance(valor, dict):
            return None, [_err("dict_type", loc, "Input should be a valid dictionary", valor)]
        return dict(valor), []
    if isinstance(tipo, type) and issubclass(tipo, BaseModel):
        if isinstance(valor, tipo):
            return valor, []
        if not isinstance(valor, dict):
            return None, [_err("model_type", loc, f"Input should be a valid dictionary or instance of {tipo.__name__}", valor, {"class_name": tipo.__name__})]
        try:
            return tipo(**valor), []
        except ValidationError as ve:
            return None, [dict(e, loc=tuple(loc) + tuple(e["loc"])) for e in ve._errores]
    v, errs = _escalar(tipo, valor, loc)
    if errs:
        return None, errs
    return v, _restricciones(v, loc, info, valor)


def _escalar(tipo, valor, loc):
    if tipo is bool:
        if isinstance(valor, bool):
            return valor, []
        if isinstance(valor, int) and valor in (0, 1):
            return bool(valor), []
        if isinstance(valor, str) and valor.strip().lower() in ("true", "1", "yes", "on", "t", "y", "false", "0", "no", "off", "f", "n"):
            return valor.strip().lower() in ("true", "1", "yes", "on", "t", "y"), []
        return None, [_err("bool_parsing" if isinstance(valor, str) else "bool_type", loc, "Input should be a valid boolean" + (", unable to interpret input" if isinstance(valor, str) else ""), valor)]
    if tipo is int:
        if isinstance(valor, bool):
            return int(valor), []
        if isinstance(valor, int):
            return valor, []
        if isinstance(valor, float):
            if valor.is_integer():
                return int(valor), []
            return None, [_err("int_from_float", loc, "Input should be a valid integer, got a number with a fractional part", valor)]
        if isinstance(valor, str):
            try:
                return int(valor.strip()), []
            except ValueError:
                return None, [_err("int_parsing", loc, "Input should be a valid integer, unable to parse string as an integer", valor)]
        return None, [_err("int_type", loc, "Input should be a valid integer", valor)]
    if tipo is float:
        if isinstance(valor, (int, float)) and not isinstance(valor, bool):
            return float(valor), []
        if isinstance(valor, str):
            try:
                return float(valor.strip()), []
            except ValueError:
                return None, [_err("float_parsing", loc, "Input should be a valid number, unable to parse string as a number", valor)]
        return None, [_err("float_type", loc, "Input should be a valid number", valor)]
    if tipo is str:
        if isinstance(valor, str):
            return valor, []
        return None, [_err("string_type", loc, "Input should be a valid string", valor)]
    if isinstance(tipo, type):
        if isinstance(valor, tipo):
            return valor, []
        return None, [_err("is_instance_of", loc, f"Input should be an instance of {tipo.__name__}", valor, {"class": tipo.__name__})]
    return valor, []


def _restricciones(v, loc, info, original=None):
    if info is None or v is None:
        return []
    errs = []
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        if info.gt is not None and not v > info.gt:
            errs.append(_err("greater_than", loc, f"Input should be greater than {info.gt}", original, {"gt": type(v)(info.gt)}))
        if info.ge is not None and not v >= info.ge:
            errs.append(_err("greater_than_equal", loc, f"Input should be greater than or equal to {info.ge}", original, {"ge": type(v)(info.ge)}))
        if info.lt is not None and not v < info.lt:
            errs.append(_err("less_than", loc, f"Input should be less than {info.lt}", original, {"lt": type(v)(info.lt)}))
        if info.le is not None and not v <= info.le:
            errs.append(_err("less_than_equal", loc, f"Input should be less than or equal to {info.le}", original, {"le": type(v)(info.le)}))
    if isinstance(v, (str, list)):
        unidad = "characters" if isinstance(v, str) else "items"
        tipo = "string" if isinstance(v, str) else "list"
        if info.min_length is not None and len(v) < info.min_length:
            n = info.min_length
            errs.append(_err(f"{tipo}_too_short", loc, f"{tipo.capitalize()} should have at least {n} {unidad[:-1] if n == 1 else unidad}", original, {"min_length": n}))
        if info.max_length is not None and len(v) > info.max_length:
            n = info.max_length
            errs.append(_err(f"{tipo}_too_long", loc, f"{tipo.capitalize()} should have at most {n} {unidad[:-1] if n == 1 else unidad}", original, {"max_length": n}))
    return errs


class BaseModel:
    model_config = {}

    def __init_subclass__(cls, **kw):
        super().__init_subclass__(**kw)
        campos = {}
        for base in reversed(cls.__mro__[1:]):
            campos.update(getattr(base, "model_fields", {}) or {})
        try:
            hints = _t.get_type_hints(cls)
        except Exception:
            hints = dict(getattr(cls, "__annotations__", {}))
        for nombre, tipo in hints.items():
            if nombre.startswith("_") or nombre == "model_config" or _t.get_origin(tipo) is _t.ClassVar:
                continue
            defecto = cls.__dict__.get(nombre, _FALTA)
            info = defecto if isinstance(defecto, FieldInfo) else FieldInfo(defecto)
            info.annotation = tipo
            campos[nombre] = info
        cls.model_fields = campos

    def __init__(self, **datos):
        errores = []
        for nombre, info in type(self).model_fields.items():
            clave = info.alias or nombre
            if clave in datos:
                v, errs = validar_valor(info.annotation, datos[clave], [nombre], info)
                errores += errs
                object.__setattr__(self, nombre, v)
            elif info.requerido():
                errores.append(_err("missing", [clave], "Field required", datos))
            else:
                object.__setattr__(self, nombre, info.valor_por_defecto())
        if errores:
            raise ValidationError(errores, type(self).__name__)

    @classmethod
    def model_validate(cls, obj):
        if isinstance(obj, cls):
            return obj
        if not isinstance(obj, dict):
            raise ValidationError([_err("model_type", [], f"Input should be a valid dictionary or instance of {cls.__name__}", obj)], cls.__name__)
        return cls(**obj)

    @classmethod
    def model_validate_json(cls, texto):
        return cls.model_validate(_json.loads(texto))

    def model_dump(self, exclude=None, include=None, exclude_none=False):
        out = {}
        for nombre in type(self).model_fields:
            if include is not None and nombre not in include:
                continue
            if exclude is not None and nombre in exclude:
                continue
            v = _volcar(getattr(self, nombre))
            if exclude_none and v is None:
                continue
            out[nombre] = v
        return out

    def model_dump_json(self, **kw):
        return _json.dumps(self.model_dump(**kw), ensure_ascii=False)

    def __eq__(self, otro):
        return type(self) is type(otro) and self.model_dump() == otro.model_dump()

    def __repr__(self):
        return f"{type(self).__name__}(" + ", ".join(f"{k}={getattr(self, k)!r}" for k in type(self).model_fields) + ")"


def _volcar(v):
    if isinstance(v, BaseModel):
        return v.model_dump()
    if isinstance(v, (list, tuple)):
        return [_volcar(x) for x in v]
    if isinstance(v, dict):
        return {k: _volcar(x) for k, x in v.items()}
    return v
