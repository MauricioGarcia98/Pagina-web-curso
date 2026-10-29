"""Inserta diagramas en las lecciones a partir de tools/piezas/diagramas*.txt.

Formato de cada bloque:

    @@ id-unico | modulo/archivo | fin=## Título de la sección
    ```diagrama
    …
    ```

- fin=TEXTO: el diagrama va al final de la sección cuyo título empieza con TEXTO
  (antes del siguiente título, ejercicio o recuadro del estándar).
- antes=TEXTO: el diagrama va justo antes de la primera línea que empieza con TEXTO.
- Es idempotente: cada diagrama queda marcado con <!-- dg:id --> y se reemplaza si ya existe.
"""
import re
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent / 'content'


def main():
    texto = Path(sys.argv[1]).read_text()
    for bloque in re.split(r'^@@ ', texto, flags=re.M)[1:]:
        cabecera, _, cuerpo = bloque.partition('\n')
        ident, archivo, donde = [x.strip() for x in cabecera.split('|')]
        cuerpo = cuerpo.strip()
        assert cuerpo.startswith('```diagrama'), ident
        path = RAIZ / f'{archivo}.md'
        s = path.read_text()
        marca = f'<!-- dg:{ident} -->'
        s = re.sub(r'\n?' + re.escape(marca) + r'\n```diagrama\n[\s\S]*?\n```\n', '\n', s)
        nuevo = f'{marca}\n{cuerpo}\n'
        clave, _, valor = donde.partition('=')
        lineas = s.split('\n')
        if clave == 'antes':
            idx = next((i for i, l in enumerate(lineas) if l.startswith(valor)), None)
        else:
            ini = next((i for i, l in enumerate(lineas) if l.startswith(valor)), None)
            if ini is None:
                sys.exit(f'{ident}: no encontré la sección "{valor}" en {archivo}')
            nivel = len(valor) - len(valor.lstrip('#'))
            idx = len(lineas)
            en_codigo = False
            for i in range(ini + 1, len(lineas)):
                l = lineas[i]
                if l.startswith('```'):
                    en_codigo = not en_codigo
                if en_codigo or l.startswith('```'):
                    continue
                m = re.match(r'^(#+) ', l)
                if (m and len(m.group(1)) <= nivel) or l.startswith(':::ejercicio') or l.startswith('<!-- estandar:'):
                    idx = i
                    break
        if idx is None:
            sys.exit(f'{ident}: no encontré "{valor}" en {archivo}')
        lineas[idx:idx] = nuevo.rstrip('\n').split('\n') + ['']
        path.write_text('\n'.join(lineas))
        print(f'✔ {ident} → {archivo}')


if __name__ == '__main__':
    main()
