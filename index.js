const express = require('express');
const crypto = require('crypto');
const mysql = require('mysql2/promise');

const app = express();
app.use(express.json());

// 🔧 Configure aqui seu banco de dados:
const pool = mysql.createPool({
  host: '3.143.158.70',
  user: 'felipe.cam',
  password: 'FelcmKrolik16',
  database: 'spotify_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

function gerarCodigo() {
  return crypto.randomBytes(4).toString('hex'); // Ex: f3a8c1d2
}

app.post('/verificar', async (req, res) => {
  const { cnpj, codigoDigitado } = req.body;

  if (!cnpj) {
    return res.status(400).json({ error: 'CNPJ é obrigatório.' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM empresas WHERE cnpj = ?', [cnpj]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'CNPJ não encontrado.' });
    }

    const empresa = rows[0];

    if (!empresa.codigo_seguranca) {
      const novoCodigo = gerarCodigo();
      await pool.query('UPDATE empresas SET codigo_seguranca = ? WHERE cnpj = ?', [novoCodigo, cnpj]);

      return res.json({
        mensagem: 'Código gerado e atribuído.',
        codigo: novoCodigo
      });
    } else {
      if (!codigoDigitado) {
        return res.status(400).json({ mensagem: 'Código já atribuído. Informe o código para validação.' });
      }

      if (codigoDigitado === empresa.codigo_seguranca) {
        return res.json({ mensagem: 'Código válido. Acesso permitido.' });
      } else {
        return res.status(401).json({ mensagem: 'Código incorreto. Acesso negado.' });
      }
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
});

app.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});
