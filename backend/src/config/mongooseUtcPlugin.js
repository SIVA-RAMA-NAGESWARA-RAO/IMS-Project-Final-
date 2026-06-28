/**
 * Global Mongoose plugin — UTC Timezone Enforcement.
 *
 * Mongoose stores Date fields in UTC internally (MongoDB uses BSON UTC dates),
 * but `toJSON()` / `toObject()` may pass them through as raw Date objects,
 * leaving serialisation to the caller. This plugin guarantees every Date
 * field is emitted as an ISO 8601 UTC string in API responses.
 *
 * Usage (in db.js, before connecting):
 *   mongoose.plugin(require('./mongooseUtcPlugin'));
 */
module.exports = function utcPlugin(schema) {
  // Transform applied when calling doc.toJSON() — i.e. every `res.json(doc)`.
  schema.set('toJSON', {
    // Preserve any existing transform the schema already has.
    transform(_doc, ret) {
      // Walk all top-level keys and convert Date instances to ISO strings.
      for (const key of Object.keys(ret)) {
        if (ret[key] instanceof Date) {
          ret[key] = ret[key].toISOString(); // e.g. "2026-06-25T13:00:00.000Z"
        }
        // Handle arrays of objects (e.g. statusHistory, documents)
        if (Array.isArray(ret[key])) {
          ret[key] = ret[key].map((item) => {
            if (item && typeof item === 'object' && !(item instanceof Date)) {
              for (const subKey of Object.keys(item)) {
                if (item[subKey] instanceof Date) {
                  item[subKey] = item[subKey].toISOString();
                }
              }
            }
            return item;
          });
        }
      }

      // Normalise _id → id for frontend convenience.
      if (ret._id) {
        ret.id = ret._id.toString();
      }

      return ret;
    },
  });
};
