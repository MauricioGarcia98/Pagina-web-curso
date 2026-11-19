"""requests (versión del curso).

Imita la librería requests, pero sin salir a internet: los pedidos a https://api.tiendaandina.dev
a https://api.pedalia.example (la API de Pedalia, assets/js/api-pedalia.js) y a
https://api.pagoya.example (la pasarela de Mercado Vecino, assets/js/mercado-vecino.js) los responden APIs que
corren dentro del navegador (assets/js/api-practica.js). Así se
practica todo lo de una API real (códigos de estado, JSON, tokens, paginación, 429 y reintentos).
Cualquier otra URL da ConnectionError, como en una computadora sin red.
"""
import json as _json
import time as _time

try:
    from js import ApiTienda as _api
except Exception:  # fuera del navegador
    _api = None
try:
    from js import ApiPedalia as _pedalia
except Exception:
    _pedalia = None
try:
    from js import PagoYa as _pagoya
except Exception:
    _pagoya = None
try:
    from js import RutaSurApi as _rutasur
except Exception:
    _rutasur = None
try:
    from js import CuentasClarasApi as _cuentas
except Exception:
    _cuentas = None

__version__ = "2.32.3-curso"

# como si el entorno (o una Connection de Airflow) ya tuviera el secreto de la API de práctica
import os as _os
_os.environ.setdefault("TIENDA_SECRETO", "s3cr3t0-de-practica")

# time.sleep también avanza el reloj de la API: así "esperar" funciona aunque el navegador no se detenga
if _api is not None and not getattr(_time.sleep, "_curso", False):
    _sleep_real = _time.sleep

    def _sleep(segundos):
        _api.avanzar(segundos)
        if _pedalia is not None:
            _pedalia.avanzar(segundos)
        if _pagoya is not None:
            _pagoya.avanzar(segundos)
        if _rutasur is not None:
            _rutasur.avanzar(segundos)
        if _cuentas is not None:
            _cuentas.avanzar(segundos)
        _sleep_real(min(float(segundos), 0.01))

    _sleep._curso = True
    _time.sleep = _sleep


class RequestException(IOError):
    def __init__(self, *args, response=None, request=None):
        super().__init__(*args)
        self.response = response
        self.request = request


class HTTPError(RequestException):
    pass


class ConnectionError(RequestException):
    pass


class Timeout(RequestException):
    pass


class JSONDecodeError(ValueError):
    pass


class exceptions:  # para escribir requests.exceptions.HTTPError, como en la librería real
    RequestException = RequestException
    HTTPError = HTTPError
    ConnectionError = ConnectionError
    Timeout = Timeout
    JSONDecodeError = JSONDecodeError


class CaseInsensitiveDict(dict):
    def __init__(self, data=None):
        super().__init__()
        for k, v in (data or {}).items():
            self[k] = v

    def __setitem__(self, k, v):
        super().__setitem__(str(k).lower(), v)

    def __getitem__(self, k):
        return super().__getitem__(str(k).lower())

    def get(self, k, default=None):
        return super().get(str(k).lower(), default)

    def __contains__(self, k):
        return super().__contains__(str(k).lower())


_REASONS = {200: "OK", 201: "Created", 204: "No Content", 304: "Not Modified", 400: "Bad Request", 401: "Unauthorized",
            403: "Forbidden", 404: "Not Found", 405: "Method Not Allowed", 410: "Gone", 429: "Too Many Requests",
            500: "Internal Server Error", 502: "Bad Gateway", 503: "Service Unavailable"}


class Response:
    def __init__(self, status, headers, text, url, method):
        self.status_code = int(status)
        self.headers = CaseInsensitiveDict(headers)
        self.text = text or ""
        self.content = self.text.encode("utf-8")
        self.url = url
        self.reason = _REASONS.get(self.status_code, "")
        self.request = type("PreparedRequest", (), {"method": method, "url": url})()
        self.encoding = "utf-8"

    @property
    def ok(self):
        return self.status_code < 400

    def json(self, **kw):
        try:
            return _json.loads(self.text, **kw)
        except ValueError as e:
            raise JSONDecodeError(f"la respuesta no es JSON: {e}") from None

    def raise_for_status(self):
        if self.status_code >= 400:
            kind = "Client Error" if self.status_code < 500 else "Server Error"
            raise HTTPError(f"{self.status_code} {kind}: {self.reason} for url: {self.url}", response=self)

    def __repr__(self):
        return f"<Response [{self.status_code}]>"


def _armar_url(url, params):
    if not params:
        return url
    from urllib.parse import urlencode
    sep = "&" if "?" in url else "?"
    return url + sep + urlencode(params, doseq=True)


def request(method, url, params=None, headers=None, json=None, data=None, timeout=None, auth=None, **kw):
    url = _armar_url(str(url), params)
    destino = None
    if _pagoya is not None and _pagoya.esDeLaApi(url):
        destino = _pagoya
    elif _rutasur is not None and _rutasur.esDeLaApi(url):
        destino = _rutasur
    elif _cuentas is not None and _cuentas.esDeLaApi(url):
        destino = _cuentas
    elif _pedalia is not None and _pedalia.esDeLaApi(url):
        destino = _pedalia
    elif _api is not None and _api.esDeLaApi(url):
        destino = _api
    if destino is None:
        raise ConnectionError(
            f"No se pudo conectar a {url}: los ejercicios del curso corren sin internet. "
            "Usa la API de práctica (https://api.tiendaandina.dev/v1), la de Pedalia (https://api.pedalia.example) o la de PagoYa (https://api.pagoya.example).")
    body = None
    hs = dict(headers or {})
    if auth is not None:
        import base64 as _b64
        usuario, clave = auth
        hs["Authorization"] = "Basic " + _b64.b64encode(f"{usuario}:{clave}".encode()).decode()
    if json is not None:
        body = _json.dumps(json)
        hs.setdefault("Content-Type", "application/json")
    elif data is not None:
        from urllib.parse import urlencode as _urlencode
        body = data if isinstance(data, str) else _urlencode(dict(data))
        hs.setdefault("Content-Type", "application/x-www-form-urlencoded")
    r = destino.request(method.upper(), url, hs, body)
    if r is None:
        raise ConnectionError(f"No se pudo conectar a {url}")
    r = r.to_py() if hasattr(r, "to_py") else r
    return Response(r["status"], dict(r["headers"]), r["body"], url, method.upper())


def get(url, params=None, **kw):
    return request("GET", url, params=params, **kw)


def post(url, data=None, json=None, **kw):
    return request("POST", url, data=data, json=json, **kw)


def put(url, data=None, json=None, **kw):
    return request("PUT", url, data=data, json=json, **kw)


def patch(url, data=None, json=None, **kw):
    return request("PATCH", url, data=data, json=json, **kw)


def delete(url, **kw):
    return request("DELETE", url, **kw)


class Session:
    """Guarda cabeceras (por ejemplo el token) para todos los pedidos."""

    def __init__(self):
        self.headers = CaseInsensitiveDict({"User-Agent": "python-requests/2.32.3"})

    def request(self, method, url, headers=None, **kw):
        h = dict(self.headers)
        h.update(headers or {})
        return request(method, url, headers=h, **kw)

    def get(self, url, **kw):
        return self.request("GET", url, **kw)

    def post(self, url, **kw):
        return self.request("POST", url, **kw)

    def close(self):
        pass

    def __enter__(self):
        return self

    def __exit__(self, *a):
        self.close()
