'use client';

import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, AlertCircle, CheckCircle2, FileSpreadsheet, Download } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

interface Team { id: string; name: string; category: string; }

interface ParsedRow {
  lastName:       string;
  firstName:      string;
  rut:            string;
  birthDate:      string;   // ISO YYYY-MM-DD
  birthDateRaw:   string;   // para mostrar en preview
  talla:          string;
  jerseyNumber:   number | undefined;
  email:          string;
  emergencyPhone: string;
  position:       string;
  categoria:      string;
  _rowNum:        number;
  _error?:        string;
}

interface Props {
  open:    boolean;
  teams:   Team[];
  onClose: () => void;
  onDone:  () => void;
}

// ── Columnas esperadas ────────────────────────────────────────────────────────
function norm(s: string) {
  return String(s)
    .replace(/^﻿/, '')               // BOM
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')      // diacríticos (hex seguro)
    .replace(/[^a-z0-9]/g, '');
}

const COL_MAP: Record<string, keyof ParsedRow> = {
  apellido:              'lastName',
  apellidos:             'lastName',
  nombre:                'firstName',
  nombres:               'firstName',
  rut:                   'rut',
  run:                   'rut',
  // fechas — todas las variantes posibles
  fechanacimiento:       'birthDate',
  fechadenacimiento:     'birthDate',
  fechadenat:            'birthDate',
  nacimiento:            'birthDate',
  fechanac:              'birthDate',
  fecnac:                'birthDate',
  fnacimiento:           'birthDate',
  fecha:                 'birthDate',
  dateofbirth:           'birthDate',
  dob:                   'birthDate',
  talla:                 'talla',
  talle:                 'talla',
  numerocamiseta:        'jerseyNumber',
  ncamiseta:             'jerseyNumber',
  camiseta:              'jerseyNumber',
  dorsal:                'jerseyNumber',
  correo:                'email',
  correoelectronico:     'email',
  email:                 'email',
  mail:                  'email',
  numerodeemergencia:    'emergencyPhone',
  telefonoemergencia:    'emergencyPhone',
  contactoemergencia:    'emergencyPhone',
  emergencia:            'emergencyPhone',
  telefono:              'emergencyPhone',
  celular:               'emergencyPhone',
  posicion:              'position',
  position:              'position',
  puesto:                'position',
  rol:                   'position',
  categoria:             'categoria',
  category:              'categoria',
  equipo:                'categoria',
  division:              'categoria',
};

// ── Conversión de fecha ───────────────────────────────────────────────────────
function excelDateToISO(raw: unknown): { iso: string; display: string } {
  if (raw == null || raw === '') return { iso: '', display: '' };

  // JS Date (cellDates: true) — usar UTC para evitar desfase por timezone
  if (raw instanceof Date) {
    if (isNaN(raw.getTime())) return { iso: '', display: '' };
    const y = raw.getUTCFullYear();
    const m = String(raw.getUTCMonth() + 1).padStart(2, '0');
    const d = String(raw.getUTCDate()).padStart(2, '0');
    return { iso: `${y}-${m}-${d}`, display: `${d}/${m}/${y}` };
  }

  // Serial numérico de Excel (días desde 1900-01-00, con bug de Excel para feb 1900)
  if (typeof raw === 'number' && raw > 59) {
    const date = new Date(Math.round((raw - 25569) * 86400 * 1000));
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    return { iso: `${y}-${m}-${d}`, display: `${d}/${m}/${y}` };
  }

  // Texto — D/M/YYYY · DD/MM/YYYY · D-M-YYYY
  const str = String(raw).trim();
  const dmyMatch = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (dmyMatch) {
    const [, d, m, yRaw] = dmyMatch;
    const y = yRaw.length === 2 ? `19${yRaw}` : yRaw;
    return {
      iso:     `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`,
      display: `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`,
    };
  }

  // ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-');
    return { iso: str, display: `${d}/${m}/${y}` };
  }

  return { iso: '', display: str };
}

// ── Parser Excel ──────────────────────────────────────────────────────────────
function parseExcel(buffer: ArrayBuffer): ParsedRow[] {
  const wb = XLSX.read(buffer, { type: 'array', codepage: 65001, cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: '',
    raw: true,   // fechas vienen como Date objects (cellDates:true) — locale-independiente
  });

  if (raw.length === 0) return [];

  // Mapear headers de la primera fila a campos internos
  const headers = Object.keys(raw[0]);
  const fieldMap: Record<string, keyof ParsedRow> = {};
  headers.forEach((h) => {
    const n = norm(h);
    // 1. Coincidencia exacta
    if (COL_MAP[n]) { fieldMap[h] = COL_MAP[n]; return; }
    // 2. El header normalizado CONTIENE alguna clave del mapa (ej: "fechanacimientodmmaaaa" contiene "fechanacimiento")
    for (const [key, field] of Object.entries(COL_MAP)) {
      if (n.includes(key)) { fieldMap[h] = field; return; }
    }
    // 3. Alguna clave del mapa CONTIENE el header normalizado (ej: header corto "fec" dentro de "fecha")
    for (const [key, field] of Object.entries(COL_MAP)) {
      if (key.length >= 4 && n.length >= 4 && key.includes(n)) { fieldMap[h] = field; return; }
    }
  });

  return raw.map((row, i) => {
    const get = (field: keyof ParsedRow): string => {
      const col = headers.find((h) => fieldMap[h] === field);
      return col ? String(row[col] ?? '').trim() : '';
    };
    const getNum = (field: keyof ParsedRow): number | undefined => {
      const col = headers.find((h) => fieldMap[h] === field);
      if (!col) return undefined;
      const v = parseInt(String(row[col] ?? ''));
      return isNaN(v) ? undefined : v;
    };
    const getRaw = (field: keyof ParsedRow): unknown => {
      const col = headers.find((h) => fieldMap[h] === field);
      return col ? row[col] : '';
    };

    const { iso, display } = excelDateToISO(getRaw('birthDate'));

    // Normalizar posición a mayúsculas y validar contra valores conocidos
    const rawPos = get('position').toUpperCase().trim();
    const validPositions = ['PG', 'SG', 'SF', 'PF', 'C'];
    const position = validPositions.includes(rawPos) ? rawPos : rawPos;

    const parsed: ParsedRow = {
      lastName:       get('lastName'),
      firstName:      get('firstName'),
      rut:            get('rut'),
      birthDate:      iso,
      birthDateRaw:   display,
      talla:          get('talla'),
      jerseyNumber:   getNum('jerseyNumber'),
      email:          get('email'),
      emergencyPhone: get('emergencyPhone'),
      position,
      categoria:      get('categoria'),
      _rowNum:        i + 2,
    };

    parsed._error = !parsed.lastName
      ? 'Falta apellido'
      : !parsed.firstName
      ? 'Falta nombre'
      : undefined;

    return parsed;
  });
}

// ── Generar plantilla Excel ───────────────────────────────────────────────────
function downloadTemplate() {
  const headers = [
    'Apellido',
    'Nombre',
    'RUT',
    'Fecha Nacimiento',
    'Talla',
    'N° Camiseta',
    'Correo Electronico',
    'Telefono Emergencia',
    'Posicion',
    'Categoria',
  ];

  const example = [
    'García López',
    'Juan Carlos',
    '12.345.678-9',
    '15/03/1995',
    'L',
    '10',
    'juan.garcia@email.com',
    '+56912345678',
    'PG',
    'Senior',
  ];

  const wb = XLSX.utils.book_new();

  // ── Hoja principal ────────────────────────────────────────────────────────
  const ws = XLSX.utils.aoa_to_sheet([headers, example]);

  ws['!cols'] = [
    { wch: 22 }, { wch: 20 }, { wch: 16 }, { wch: 30 },
    { wch: 8  }, { wch: 14 }, { wch: 28 }, { wch: 22 }, { wch: 26 }, { wch: 18 },
  ];

  const headerStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '1E3A5F' } },
    alignment: { horizontal: 'center' },
  };
  headers.forEach((_, idx) => {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: idx });
    if (!ws[cellRef]) return;
    ws[cellRef].s = headerStyle;
  });

  XLSX.utils.book_append_sheet(wb, ws, 'Jugadores');

  // ── Hoja de referencia ────────────────────────────────────────────────────
  const ref = XLSX.utils.aoa_to_sheet([
    ['Posiciones válidas', '', 'Tallas válidas'],
    ['PG', 'Base',               'XS'],
    ['SG', 'Escolta',            'S'],
    ['SF', 'Alero',              'M'],
    ['PF', 'Ala-Pivot',          'L'],
    ['C',  'Pivot',              'XL'],
    ['',   '',                   'XXL'],
    ['',   '',                   'XXXL'],
  ]);
  ref['!cols'] = [{ wch: 14 }, { wch: 14 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ref, 'Referencia');

  XLSX.writeFile(wb, 'plantilla_jugadores.xlsx', { bookSST: false, type: 'binary' });
}

// ── Componente ────────────────────────────────────────────────────────────────
export function ImportPlayersModal({ open, teams, onClose, onDone }: Props) {
  const fileRef               = useRef<HTMLInputElement>(null);
  const [rows, setRows]       = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [teamId, setTeamId]   = useState('');
  const [loading, setLoading] = useState(false);

  const validRows   = rows.filter((r) => !r._error);
  const invalidRows = rows.filter((r) => r._error);

  function handleFile(file: File) {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('El archivo debe ser Excel (.xlsx o .xls)');
      return;
    }
    setFileName(file.name);
    setRows([]);
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      const parsed = parseExcel(buffer);
      if (parsed.length === 0) {
        toast.error('No se encontraron datos. Verificá que el archivo tenga la estructura correcta.');
      } else {
        setRows(parsed);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function handleSubmit() {
    if (validRows.length === 0) return;
    setLoading(true);
    try {
      const VALID_POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'];
      const payload = {
        teamId: teamId || undefined,
        players: validRows.map((r) => ({
          firstName:      r.firstName,
          lastName:       r.lastName,
          rut:            r.rut || undefined,
          jerseyNumber:   r.jerseyNumber,
          birthDate:      r.birthDate || undefined,
          email:          r.email || undefined,
          emergencyPhone: r.emergencyPhone || undefined,
          clothingSize:   r.talla || undefined,
          // solo enviar posición si es un valor válido para la API
          position:       VALID_POSITIONS.includes(r.position?.toUpperCase()) ? r.position.toUpperCase() as any : undefined,
          categoria:      r.categoria || undefined,
        })),
      };
      const res = await api.post('/players/import', payload);
      const { created, updated, skipped, errors } = res.data.data as { created: number; updated: number; skipped: number; errors: string[] };

      if (errors?.length) console.error('Errores de importación:', errors);

      const total = (created ?? 0) + (updated ?? 0);
      if (total > 0) {
        const parts = [];
        if (created) parts.push(`${created} creado${created !== 1 ? 's' : ''}`);
        if (updated) parts.push(`${updated} actualizado${updated !== 1 ? 's' : ''}`);
        if (errors?.length) parts.push(`${errors.length} con error`);
        toast.success(parts.join(' · '));
        if (errors?.length) {
          toast.error(`Errores: ${errors.slice(0, 3).join(' | ')}${errors.length > 3 ? ` (+${errors.length - 3} más)` : ''}`, { duration: 8000 });
        }
      } else {
        toast.error(
          errors?.length
            ? `No se procesó ningún jugador: ${errors.slice(0, 2).join(' | ')}`
            : 'No se pudo procesar ningún jugador',
          { duration: 8000 }
        );
        return;
      }
      setRows([]);
      setFileName('');
      onDone();
    } catch (err: any) {
      const data = err.response?.data;
      const msg =
        data?.error?.details
        ?? data?.error?.message
        ?? data?.message
        ?? err.message
        ?? 'Error al importar';
      console.error('Error importación:', err.response?.status, data);
      toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg).slice(0, 200), { duration: 8000 });
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setRows([]);
    setFileName('');
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Importar jugadores desde Excel</DialogTitle>
          <DialogDescription>
            El archivo debe ser <span className="font-medium text-secondary">.xlsx o .xls</span>.
            Las fechas deben estar en formato{' '}
            <span className="font-medium text-secondary">DD/MM/AAAA</span> o como fecha de Excel.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-2 space-y-4 overflow-y-auto flex-1 pt-2">

          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition',
              fileName
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary hover:bg-primary/5'
            )}
          >
            <FileSpreadsheet size={32} className={cn('mx-auto mb-2', fileName ? 'text-primary' : 'text-muted-foreground')} />
            {fileName ? (
              <p className="text-sm font-semibold text-primary">{fileName}</p>
            ) : (
              <>
                <p className="text-sm font-medium text-secondary">Arrastra el archivo aquí o haz clic para seleccionar</p>
                <p className="text-xs text-muted-foreground mt-1">Solo archivos Excel (.xlsx · .xls)</p>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>

          {/* Descarga plantilla */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={downloadTemplate}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
            >
              <Download size={13} />
              Descargar plantilla Excel
            </button>
            <span className="text-xs text-muted-foreground">
              · Completá la plantilla y subila con los datos reales.
            </span>
          </div>

          {/* Selector de equipo */}
          {rows.length > 0 && (
            <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg border border-border">
              <label className="text-sm font-medium text-secondary whitespace-nowrap">Asignar al equipo:</label>
              <select
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="flex-1 px-3 py-1.5 border border-border rounded-lg bg-surface text-secondary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">— Sin equipo por ahora —</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.category})</option>
                ))}
              </select>
            </div>
          )}

          {/* Badges resumen */}
          {rows.length > 0 && (
            <div className="flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-success/10 text-success font-medium">
                <CheckCircle2 size={13} /> {validRows.length} listo{validRows.length !== 1 ? 's' : ''} para importar
              </span>
              {invalidRows.length > 0 && (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-danger/10 text-danger font-medium">
                  <AlertCircle size={13} /> {invalidRows.length} con error (se omitirán)
                </span>
              )}
            </div>
          )}

          {/* Tabla de previsualización */}
          {rows.length > 0 && (
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto max-h-64">
                <table className="w-full text-xs">
                  <thead className="bg-muted border-b border-border sticky top-0 z-10">
                    <tr>
                      {['Fila', '', 'Apellido', 'Nombre', 'RUT', 'Nacimiento', 'Talla', '#', 'Correo', 'Posición', 'Categoría', 'Emergencia', 'Error'].map((h) => (
                        <th key={h} className="text-left px-3 py-2 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row._rowNum} className={cn('border-b border-border last:border-0', row._error ? 'bg-danger/5' : 'hover:bg-muted/30')}>
                        <td className="px-3 py-2 text-muted-foreground">{row._rowNum}</td>
                        <td className="px-3 py-2">
                          {row._error
                            ? <AlertCircle size={12} className="text-danger" />
                            : <CheckCircle2 size={12} className="text-success" />}
                        </td>
                        <td className="px-3 py-2 font-medium text-secondary">{row.lastName}</td>
                        <td className="px-3 py-2 text-secondary">{row.firstName}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.rut || '—'}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.birthDateRaw || '—'}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.talla || '—'}</td>
                        <td className="px-3 py-2 text-center text-muted-foreground">{row.jerseyNumber ?? '—'}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.email || '—'}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.position || '—'}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.categoria || '—'}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.emergencyPhone || '—'}</td>
                        <td className="px-3 py-2 text-danger font-medium">{row._error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Nota columnas esperadas */}
          <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 leading-relaxed">
            <span className="font-medium text-secondary">Columnas esperadas:</span>{' '}
            Apellido · Nombre · RUT · Fecha Nacimiento · Talla · N° Camiseta · Correo Electronico · Telefono Emergencia · Posicion · Categoria
            <br />
            Los nombres de columna son flexibles; el sistema los detecta automáticamente con o sin tildes.
          </div>

        </div>

        <DialogFooter className="px-6 py-4 border-t border-border">
          <button type="button" onClick={handleClose} className="px-4 py-2 text-sm font-medium text-secondary border border-border rounded-lg hover:bg-muted transition">
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || validRows.length === 0}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-primary hover:bg-primary-600 text-white rounded-lg transition disabled:opacity-50"
          >
            {loading
              ? <Loader2 size={15} className="animate-spin" />
              : <Upload size={15} />}
            {validRows.length > 0
              ? `Importar ${validRows.length} jugador${validRows.length !== 1 ? 'es' : ''}`
              : 'Importar'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
