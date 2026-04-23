import pool from './database.js';

/**
 * Unified async query helper for node-postgres (pg).
 *
 * PostgreSQL uses numbered placeholders ($1, $2, ...) instead of ?.
 * All controllers must use $N in their SQL strings.
 *
 * SELECT / WITH … SELECT → returns array of row objects
 * INSERT (with RETURNING) → returns { insertId, affectedRows, rows }
 * UPDATE / DELETE         → returns { affectedRows, changes, rows }
 */
const queryAsync = async (sql, params = []) => {
  const result = await pool.query(sql, params);

  const upperSql = sql.trimStart().toUpperCase();
  const isWrite = upperSql.startsWith('INSERT') ||
                  upperSql.startsWith('UPDATE') ||
                  upperSql.startsWith('DELETE');

  if (!isWrite) return result.rows;

  return {
    // For INSERT … RETURNING pk_col, rows[0] holds the returned row.
    // Object.values picks the first column regardless of its name.
    insertId:     result.rows[0] ? Object.values(result.rows[0])[0] : null,
    affectedRows: result.rowCount,
    changes:      result.rowCount,
    rows:         result.rows,
  };
};

export default queryAsync;
