// Lightweight recursive sanitizer for request bodies/query/params.
// Strips <script>/<style> blocks, inline event handlers, and javascript:
// URIs from string values. Deliberately does NOT HTML-entity-escape
// every character — that would corrupt legitimate data (passwords,
// names with apostrophes, job descriptions with "&"). Escaping for
// display belongs at render time; React already does that by default.
const sanitizeValue = (value) => {
  if (typeof value === 'string') {
    return value
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
      .replace(/javascript:/gi, '');
  }
  if (Array.isArray(value)) return value.map(sanitizeValue);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value)) out[key] = sanitizeValue(value[key]);
    return out;
  }
  return value;
};

const sanitizeInput = (req, res, next) => {
  if (req.body) req.body = sanitizeValue(req.body);
  if (req.query) req.query = sanitizeValue(req.query);
  if (req.params) req.params = sanitizeValue(req.params);
  next();
};

module.exports = { sanitizeInput };
