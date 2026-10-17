export function printQrSheetDirectly(groupName: string, cardsPerPage: 6 | 8) {
  if (typeof window === 'undefined') return;

  if (process.env.NODE_ENV === 'test') {
    window.print();
    return;
  }

  const sheetElement = document.getElementById('printable-qr-sheet');
  if (!sheetElement) {
    window.print();
    return;
  }

  try {
    const existingIframe = document.getElementById('qr-print-hidden-iframe');
    if (existingIframe) {
      existingIframe.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'qr-print-hidden-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
        <head>
          <meta charset="utf-8" />
          <title>كروت الـ QR - ${groupName}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
            @page {
              size: A4 portrait;
              margin: 10mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: 'Cairo', system-ui, -apple-system, sans-serif;
              direction: rtl;
              background: #ffffff;
              color: #0f172a;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .sheet-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 12px;
              width: 100%;
            }
            .qr-print-card {
              border: 1.5px dashed #cbd5e1;
              border-radius: 12px;
              padding: 12px 14px;
              background: #ffffff;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              text-align: center;
              page-break-inside: avoid;
              break-inside: avoid;
              min-height: ${cardsPerPage === 8 ? '210px' : '250px'};
            }
            .dir-ltr {
              direction: ltr !important;
              unicode-bidi: embed;
            }
          </style>
        </head>
        <body>
          <div class="sheet-grid">
            ${sheetElement.innerHTML}
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        window.print();
      }
    }, 350);
  } catch {
    window.print();
  }
}
