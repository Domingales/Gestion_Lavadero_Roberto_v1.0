# Gestión Lavadero Roberto (v1.0)

App local para gestionar el lavadero (sin servidor). Persistencia en **IndexedDB** (evita el error de cuota de localStorage).

## Cómo usar
1. Abre `index.html` en Chrome/Edge/Firefox.
2. Ve a **Ajustes** y rellena los datos de empresa.
3. Crea **Clientes** y **Servicios**.
4. Usa **Agenda** para citas y **Albaranes / Facturas** para cobros.
5. **Exportar / Importar**:
   - Backup JSON (recomendado semanal)
   - Exportar CSV (varios ficheros)
   - Importar JSON (reemplazo)

## Notas
- Los listados guardan la “última tabla” para poder copiarla a Excel desde Exportar/Importar.
- Impresión: abre una ventana nueva y lanza `print()`.

