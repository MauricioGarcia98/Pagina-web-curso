"""Respuestas con código y encabezados propios, como fastapi.responses.JSONResponse."""


class JSONResponse:
    def __init__(self, content=None, status_code=200, headers=None):
        self.content = content
        self.status_code = status_code
        self.headers = dict(headers or {})
