export function isPrintEnabled() {
  return localStorage.getItem('printTickets') !== 'false'
}

export function setPrintEnabled(value) {
  localStorage.setItem('printTickets', value ? 'true' : 'false')
}

/**
 * Imprime un ticket de turno en impresora termica via window.print()
 * @param {Object} turn - Objeto turno con code, patient_name, service_name, created_at
 * @param {string} hospitalName - Nombre del hospital desde settings
 */
export function printTicket(turn, hospitalName = 'Hospital General') {
  const fecha = new Date(turn.created_at)
  const fechaStr = fecha.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
  const horaStr = fecha.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit'
  })

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Ticket ${turn.code}</title>
  <style>
    @page {
      margin: 0;
      size: 58mm auto;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Arial', 'Helvetica', sans-serif;
      width: 58mm;
      padding: 4mm 2mm;
      color: #000;
      text-align: center;
    }
    .hospital {
      font-size: 12px;
      font-weight: bold;
      margin-bottom: 4px;
      text-transform: uppercase;
    }
    .separator {
      border-top: 1px dashed #000;
      margin: 6px 0;
    }
    .code {
      font-size: 36px;
      font-weight: bold;
      letter-spacing: 2px;
      margin: 8px 0;
    }
    .label {
      font-size: 9px;
      color: #333;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .value {
      font-size: 11px;
      font-weight: bold;
      margin-bottom: 6px;
    }
    .datetime {
      font-size: 10px;
      margin-bottom: 4px;
    }
    .footer {
      font-size: 9px;
      margin-top: 8px;
      color: #555;
    }
  </style>
</head>
<body>
  <div class="hospital">${hospitalName}</div>
  <div class="separator"></div>
  <div class="label">Su turno</div>
  <div class="code">${turn.code}</div>
  <div class="separator"></div>
  <div class="label">Paciente</div>
  <div class="value">${turn.patient_name}</div>
  <div class="label">Servicio</div>
  <div class="value">${turn.service_name || ''}</div>
  <div class="datetime">${fechaStr} - ${horaStr}</div>
  <div class="separator"></div>
  <div class="footer">Gracias por su visita</div>
</body>
</html>`

  const printWindow = window.open('', '_blank', 'width=300,height=400')
  if (!printWindow) {
    alert('No se pudo abrir la ventana de impresion. Verifique que los popups esten permitidos.')
    return
  }

  printWindow.document.write(html)
  printWindow.document.close()

  printWindow.onload = () => {
    printWindow.focus()
    printWindow.print()
    printWindow.onafterprint = () => {
      printWindow.close()
    }
    // Fallback: cerrar despues de 5 segundos si onafterprint no dispara
    setTimeout(() => {
      if (!printWindow.closed) {
        printWindow.close()
      }
    }, 5000)
  }
}
