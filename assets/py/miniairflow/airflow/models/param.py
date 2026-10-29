class Param:
    def __init__(self, default=None, type=None, **kw):
        self.default = default
        self.type = type
        self.value = default
