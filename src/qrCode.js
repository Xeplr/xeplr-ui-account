import qrcode from 'qrcode-generator';

/**
 * A QR code as rows of dark (true) / light (false) cells — for the
 * authenticator app to scan (an otpauth:// link). Pure: any view draws it
 * (SVG rects on the web, views on a phone). Error correction M, the size the
 * text needs.
 */
export function qrMatrix(text) {
  var q = qrcode(0, 'M');
  q.addData(String(text || ''));
  q.make();
  var n = q.getModuleCount();
  var rows = [];
  for (var r = 0; r < n; r++) {
    var row = [];
    for (var c = 0; c < n; c++) row.push(q.isDark(r, c));
    rows.push(row);
  }
  return rows;
}

/** "JBSWY3DPEHPK3PXP…" → "JBSW Y3DP EHPK …": easier to type into an app by hand. */
export function groupSecret(secret) {
  return String(secret || '').replace(/(.{4})/g, '$1 ').trim();
}
