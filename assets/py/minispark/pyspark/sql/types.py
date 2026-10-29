"""Tipos de datos de mini-Spark (imitan pyspark.sql.types)."""
import re as _re


class DataType:
    _name = "data"

    def simpleString(self):
        return self._name

    def typeName(self):
        return self._name

    def __repr__(self):
        return self.__class__.__name__ + "()"

    def __eq__(self, other):
        return type(self) is type(other) and self.__dict__ == other.__dict__

    def __hash__(self):
        return hash(self.simpleString())


class NullType(DataType): _name = "void"
class StringType(DataType): _name = "string"
class BooleanType(DataType): _name = "boolean"
class IntegerType(DataType): _name = "int"
class LongType(DataType): _name = "bigint"
class ShortType(DataType): _name = "smallint"
class ByteType(DataType): _name = "tinyint"
class FloatType(DataType): _name = "float"
class DoubleType(DataType): _name = "double"
class DateType(DataType): _name = "date"
class TimestampType(DataType): _name = "timestamp"
class BinaryType(DataType): _name = "binary"


class DecimalType(DataType):
    def __init__(self, precision=10, scale=0):
        self.precision = precision
        self.scale = scale

    def simpleString(self):
        return "decimal(%d,%d)" % (self.precision, self.scale)

    def __repr__(self):
        return "DecimalType(%d,%d)" % (self.precision, self.scale)


class ArrayType(DataType):
    def __init__(self, elementType, containsNull=True):
        self.elementType = elementType
        self.containsNull = containsNull

    def simpleString(self):
        return "array<%s>" % self.elementType.simpleString()

    def __repr__(self):
        return "ArrayType(%r, %s)" % (self.elementType, self.containsNull)


class MapType(DataType):
    def __init__(self, keyType, valueType, valueContainsNull=True):
        self.keyType = keyType
        self.valueType = valueType

    def simpleString(self):
        return "map<%s,%s>" % (self.keyType.simpleString(), self.valueType.simpleString())


class StructField:
    def __init__(self, name, dataType, nullable=True, metadata=None):
        self.name = name
        self.dataType = dataType
        self.nullable = nullable

    def simpleString(self):
        return "%s:%s" % (self.name, self.dataType.simpleString())

    def __repr__(self):
        return "StructField('%s', %r, %s)" % (self.name, self.dataType, self.nullable)

    def __eq__(self, o):
        return isinstance(o, StructField) and (self.name, self.dataType, self.nullable) == (o.name, o.dataType, o.nullable)


class StructType(DataType):
    _name = "struct"

    def __init__(self, fields=None):
        self.fields = list(fields or [])

    def add(self, field, data_type=None, nullable=True):
        if isinstance(field, StructField):
            self.fields.append(field)
        else:
            if isinstance(data_type, str):
                data_type = _parse_type(data_type)
            self.fields.append(StructField(field, data_type, nullable))
        return self

    @property
    def names(self):
        return [f.name for f in self.fields]

    def fieldNames(self):
        return self.names

    def __iter__(self):
        return iter(self.fields)

    def __len__(self):
        return len(self.fields)

    def __getitem__(self, k):
        if isinstance(k, str):
            for f in self.fields:
                if f.name == k:
                    return f
            raise KeyError(k)
        return self.fields[k]

    def simpleString(self):
        return "struct<%s>" % ",".join(f.simpleString() for f in self.fields)

    def __repr__(self):
        return "StructType([%s])" % ", ".join(repr(f) for f in self.fields)

    def treeString(self):
        lines = ["root"]
        for f in self.fields:
            lines.append(" |-- %s: %s (nullable = %s)" % (f.name, f.dataType.simpleString(), str(f.nullable).lower()))
        return "\n".join(lines)


_SIMPLE = {
    "string": StringType, "str": StringType, "varchar": StringType, "char": StringType,
    "int": IntegerType, "integer": IntegerType, "bigint": LongType, "long": LongType,
    "smallint": ShortType, "short": ShortType, "tinyint": ByteType, "byte": ByteType,
    "double": DoubleType, "float": FloatType, "real": FloatType,
    "boolean": BooleanType, "bool": BooleanType, "date": DateType, "timestamp": TimestampType,
    "binary": BinaryType,
}


def _parse_type(s):
    if isinstance(s, DataType):
        return s
    t = s.strip().lower()
    m = _re.match(r"^(decimal|numeric)\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)$", t)
    if m:
        return DecimalType(int(m.group(2)), int(m.group(3)))
    if t in ("decimal", "numeric"):
        return DecimalType(10, 0)
    m = _re.match(r"^array\s*<(.+)>$", t)
    if m:
        return ArrayType(_parse_type(m.group(1)))
    t = _re.sub(r"\(.*\)$", "", t)
    if t in _SIMPLE:
        return _SIMPLE[t]()
    raise ValueError("Tipo desconocido: %s" % s)


def _parse_schema(s):
    """'nombre STRING, edad INT' o 'nombre: string, edad: int' -> StructType"""
    fields = []
    depth, cur, parts = 0, "", []
    for ch in s:
        if ch in "<(":
            depth += 1
        elif ch in ">)":
            depth -= 1
        if ch == "," and depth == 0:
            parts.append(cur)
            cur = ""
        else:
            cur += ch
    if cur.strip():
        parts.append(cur)
    for p in parts:
        p = p.strip()
        if ":" in p:
            name, typ = p.split(":", 1)
        else:
            bits = p.split(None, 1)
            if len(bits) != 2:
                raise ValueError("No entiendo el esquema: %r" % p)
            name, typ = bits
        nullable = True
        typ = typ.strip()
        if typ.upper().endswith("NOT NULL"):
            nullable = False
            typ = typ[:-8]
        fields.append(StructField(name.strip().strip("`"), _parse_type(typ), nullable))
    return StructType(fields)
