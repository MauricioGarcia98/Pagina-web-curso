"""TestClient: le hace pedidos a la app sin levantar un servidor, igual que fastapi.testclient.TestClient."""
import json as _json
from urllib.parse import urlsplit, parse_qsl


class Response:
    def __init__(self, status_code, contenido, headers):
        self.status_code = status_code
        self._contenido = contenido
        self.headers = {k.lower(): str(v) for k, v in headers.items()}
        self.headers.setdefault("content-type", "application/json")
        self.text = _json.dumps(contenido, ensure_ascii=False)

    def json(self):
        return _json.loads(self.text)

    @property
    def is_success(self):
        return 200 <= self.status_code < 300

    def __repr__(self):
        return f"<Response [{self.status_code}]>"


class TestClient:
    __test__ = False  # que pytest no la confunda con una clase de tests

    def __init__(self, app, headers=None):
        self.app = app
        self.headers = dict(headers or {})

    def request(self, method, url, params=None, json=None, headers=None):
        partes = urlsplit(url)
        query = {}
        for k, v in parse_qsl(partes.query, keep_blank_values=True):
            query.setdefault(k, []).append(v)
        for k, v in (params or {}).items():
            if v is None:
                continue
            valores = v if isinstance(v, (list, tuple)) else [v]
            query.setdefault(k, []).extend("true" if x is True else "false" if x is False else str(x) for x in valores)
        query = {k: (v[0] if len(v) == 1 else v) for k, v in query.items()}
        hs = {**self.headers, **(headers or {})}
        cuerpo = _json.loads(_json.dumps(json)) if json is not None else None  # como viaja por la red: solo JSON
        codigo, contenido, extra = self.app._atender(method.upper(), partes.path or "/", query, hs, cuerpo)
        return Response(codigo, contenido, extra)

    def get(self, url, **kw):
        return self.request("GET", url, **kw)

    def post(self, url, **kw):
        return self.request("POST", url, **kw)

    def put(self, url, **kw):
        return self.request("PUT", url, **kw)

    def patch(self, url, **kw):
        return self.request("PATCH", url, **kw)

    def delete(self, url, **kw):
        return self.request("DELETE", url, **kw)
