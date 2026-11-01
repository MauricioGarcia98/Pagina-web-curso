"""requests (versión del curso).

Imita la librería requests, pero sin salir a internet: los pedidos a https://api.tiendaandina.dev
los responde la API de práctica que corre dentro del navegador (assets/js/api-practica.js). Así se
practica todo lo de una API real (códigos de estado, JSON, tokens, paginación, 429 y reintentos).
Cualquier otra URL da ConnectionError, como en una computadora sin red.
"""
import json as _json
import time as _time

try:
    from js import ApiTienda as _api
except Exception:  # fuera del navegador
    _api = None

__version__ = "2.32.3-curso"

# como si el entorno (o una Connection de Airflow) ya tuviera el secreto de la API de práctica
import os as _os
_os.environ.setdefault("TIENDA_SECRETO", "s3cr3t0-de-practica")

# time.sleep también avanza el reloj de la API: así "esperar" funciona aunque el navegador no se detenga
if _api is not None and not getattr(_time.sleep, "_curso", False):
    _sleep_real = _time.sleep

    def _sleep(segundos):
        _api.avanzar(segundos)
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


_REASONS = {200: "OK", 201: "Created", 204: "No Content", 400: "Bad Request", 401: "Unauthorized",
            403: "Forbidden", 404: "Not Found", 405: "Method Not Allowed", 429: "Too Many Requests",
            500: "Internal Server Error", 503: "Service Unavailable"}


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


def request(method, url, params=None, headers=None, json=None, data=None, timeout=None, **kw):
    url = _armar_url(str(url), params)
    if _api is None or not _api.esDeLaApi(url):
        raise ConnectionError(
            f"No se pudo conectar a {url}: los ejercicios del curso corren sin internet. "
            "Usa la API de práctica: https://api.tiendaandina.dev/v1")
    body = None
    hs = dict(headers or {})
    if json is not None:
        body = _json.dumps(json)
        hs.setdefault("Content-Type", "application/json")
    elif data is not None:
        body = data if isinstance(data, str) else "&".join(f"{k}={v}" for k, v in dict(data).items())
    r = _api.request(method.upper(), url, hs, body)
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
