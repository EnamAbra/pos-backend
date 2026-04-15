// utils/queryAsync.js
import db from './backend/database.js';

/**
 * Promisified MySQL query helper.
 * Wraps the callback-based db.query() into a clean async/await function.
 *
 * @param {string} sql    - The SQL query string with ? placeholders
 * @param {Array}  params - Values to safely inject into the query
 * @returns {Promise}     - Resolves with query results, rejects on error
 *
 * Usage:
 *   const rows = await queryAsync('SELECT * FROM products WHERE product_id = ?', [id]);
 */
const queryAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
};

export default queryAsync;