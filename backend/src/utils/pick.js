/**
 * Pick only allowed keys from an object.
 * Used for mass assignment protection — prevents clients from
 * setting fields they should not control (e.g. role, id).
 */
function pick(obj, keys) {
  const result = {};
  for (const key of keys) {
    if (obj[key] !== undefined) result[key] = obj[key];
  }
  return result;
}

module.exports = pick;
