import db from './database.js';

/**
 * Unified async query helper built on the `sqlite` promise wrapper.
 *
 * SELECT  → returns array of row objects  (db.all)
 * INSERT  → returns { insertId, affectedRows }  (db.run → lastID / changes)
 * UPDATE/DELETE → returns { affectedRows, changes }
 *
 * All controllers already use `await queryAsync(...)` so no changes needed there.
 */
const queryAsync = async (sql, params = []) => {
  const type = sql.trimStart().slice(0, 6).toUpperCase();

  if (type === 'SELECT') {
    return db.all(sql, params);
  }

  const result = await db.run(sql, params);
  return {
    insertId:     result.lastID,
    affectedRows: result.changes,
    changes:      result.changes,
  };
};

export default queryAsync;
