// =====================================================================
//  TavDex – ligação à base de dados MySQL
//  Usa a biblioteca mysql2 com "prepared statements": os valores vão
//  separados do SQL (nos "?"), por isso não há injeção de SQL.
// =====================================================================
const mysql = require('mysql2/promise');

// Pool = conjunto de ligações reutilizadas (mais rápido do que abrir
// uma ligação nova em cada pedido)
const pool = mysql.createPool({
  host: process.env.BD_HOST || 'localhost',
  port: Number(process.env.BD_PORTA) || 3306,
  user: process.env.BD_UTILIZADOR || 'root',
  password: process.env.BD_PASSWORD || '',
  database: process.env.BD_NOME || 'TavDex',
  charset: 'utf8mb4',        // acentos e emojis
  dateStrings: true,         // datas chegam como texto "2026-11-05 10:00:00"
  decimalNumbers: true,      // médias (DECIMAL) chegam como número e não como texto
  connectionLimit: 10,
});

// Devolve todas as linhas de uma consulta (array de objetos)
// Exemplo: await linhas('SELECT * FROM titulos WHERE tipo = ?', ['filme'])
async function linhas(sql, parametros = []) {
  const [resultado] = await pool.execute(sql, parametros);
  return resultado;
}

// Devolve só a primeira linha (ou null se não houver nenhuma)
// Exemplo: await linha('SELECT * FROM utilizadores WHERE id = ?', [5])
async function linha(sql, parametros = []) {
  const resultado = await linhas(sql, parametros);
  return resultado[0] || null;
}

// Para INSERT / UPDATE / DELETE: devolve { insertId, affectedRows }
// Exemplo: const r = await executar('DELETE FROM listas WHERE utilizador_id = ?', [1])
async function executar(sql, parametros = []) {
  const [resultado] = await pool.execute(sql, parametros);
  return resultado;
}

module.exports = { pool, linhas, linha, executar };
