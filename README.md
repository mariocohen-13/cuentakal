# CuentaKal — mi tracker de calorías

App personal y local (React + TypeScript + Vite). Sin cuentas, sin servidor, sin internet.

## Arrancar

```bash
npm install        # solo la primera vez
npm run dev        # abre http://localhost:5173
```

Para usarla a diario con la versión optimizada: `npm start` (compila y sirve en http://localhost:5173).
Desde el móvil (misma wifi): abre `http://<IP-de-tu-ordenador>:5173`. Ojo: los datos del móvil
son independientes de los del ordenador (cada navegador guarda los suyos); usa la copia de seguridad para pasarlos.

## Copia de seguridad

Ajustes → **Exportar copia (.json)** descarga todos tus datos. Para restaurar: Ajustes → **Importar copia…**
(reemplaza los datos actuales; antes guarda automáticamente el estado previo en el navegador).

Los datos viven en el `localStorage` del navegador para `localhost:5173`. Si borras los datos de
navegación de ese sitio o cambias de navegador/puerto, no los verás: exporta copias de vez en cuando.

## Precisión de los datos

- **Referencia**: alimentos de la base incluida, con valores genéricos aproximados (BEDCA/USDA).
- **Dato**: alimentos o platos que tú introduces desde una etiqueta o fuente fiable.
- **Estimación**: platos del colegio (estimados por tipo de plato, ración típica de comedor) y entradas rápidas.
  Toca cualquier plato o registro para corregirlo; las correcciones de platos se recuerdan en menús futuros.

## Menú del colegio

Pega el texto con los días (Lunes, Martes…) y «Comida:» / «Cena:». Los PDF con texto se leen localmente;
las imágenes se guardan como referencia para transcribirlas (no hay OCR para no depender de internet).

## Tests

```bash
npm test           # lógica: fechas, cálculos, parser de menú, historial, persistencia
npm run build      # comprobación de tipos + compilación
```
