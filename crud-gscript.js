function doGet(e) {
  const SHEET_ID = "ID_DA_PLANILHA_AQUI";
  const sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();

  const query = (e.parameter.query || "").toLowerCase().trim();
  const timezone = Session.getScriptTimeZone();

  // Se não tiver query, retorna tudo (modo "listar todos")
  if (!query) {
    const records = data.map(row => {
      const entry = {};
      headers.forEach((header, i) => {
        let value = row[i] || "";

        // Formata datas
        if (header === "purchase_data" || header === "expires_in") {
          if (value instanceof Date) {
            value = Utilities.formatDate(value, timezone, "dd/MM/yyyy");
          }
        }

        entry[header] = value;
      });
      return entry;
    });

    return ContentService
      .createTextOutput(JSON.stringify(records))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Busca por domínio ou ID
  const dominioIdx = headers.indexOf("dominio");
  const idIdx = headers.indexOf("id");
  const seloIdx = headers.indexOf("selo");
  const purchaseIdx = headers.indexOf("purchase_data");
  const expiresIdx = headers.indexOf("expires_in");

  const cleanQuery = query.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');

  const match = data.find(r => {
    const dom = (r[dominioIdx] || "").toLowerCase().replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
    const id = (r[idIdx] || "").toLowerCase();
    return dom === cleanQuery || id === cleanQuery;
  });

  if (!match) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "not_found" }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Formata datas
  const formatDate = (val) => (val instanceof Date)
    ? Utilities.formatDate(val, timezone, "dd/MM/yyyy")
    : val;

  const result = {
    dominio: match[dominioIdx],
    id: match[idIdx],
    selo: match[seloIdx],
    purchase_data: formatDate(match[purchaseIdx]),
    expires_in: formatDate(match[expiresIdx])
  };

  return ContentService
    .createTextOutput(JSON.stringify({ status: "success", result }))
    .setMimeType(ContentService.MimeType.JSON);
}


function doPost(e) {
  const SHEET_ID = "ID_DA_PLANILHA_AQUI";
  const sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
  const data = JSON.parse(e.postData.contents);

  const headers = [
    "id",
    "dominio",
    "selo",
    "purchase_data",
    "expires_in"
  ];

  const hasContent = Object.keys(data).some(k => {
    const val = data[k];
    return val && val.toString().trim() !== "";
  });

  if (!hasContent) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: "error", message: "Formulário vazio." }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // Gera um ID único
  let nextId = gerarID(8);
  const existingIDs = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues().flat();
  while (existingIDs.includes(nextId)) {
    nextId = gerarID(8);
  }

  // Cria a nova linha
  const newRow = headers.map(h => {
    if (h === "id") return nextId;
    const value = data[h];
    if (Array.isArray(value)) return value.join(" | ");
    return value ? value : "";
  });

  sheet.appendRow(newRow);

  return ContentService
    .createTextOutput(JSON.stringify({ result: "success", id: nextId }))
    .setMimeType(ContentService.MimeType.JSON);
}

function gerarID(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'CA-';
  for (let i = 0; i < length; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}
