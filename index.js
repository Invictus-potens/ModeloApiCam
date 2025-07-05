const express = require('express');
const crypto = require('crypto');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(express.json());

// 📦 Conexão com o banco de dados SQLite
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Erro ao conectar ao SQLite:', err.message);
  } else {
    console.log('✅ Conectado ao banco de dados SQLite');
  }
});

// 🏗️ Criação da tabela (se não existir)
db.run(`
  CREATE TABLE IF NOT EXISTS empresas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    cnpj TEXT NOT NULL UNIQUE,
    codigo_seguranca TEXT
  )
`);

function gerarCodigo() {
  const codigo = crypto.randomBytes(4).toString('hex');
  console.log(`🔐 Código gerado: ${codigo}`);
  return codigo;
}

app.get('/verificar', (req, res) => {
  const { cnpj, codigoDigitado } = req.body;
  console.log(`📥 Requisição recebida: cnpj=${cnpj}, codigoDigitado=${codigoDigitado || 'N/A'}`);

  if (!cnpj) {
    console.warn('⚠️ CNPJ não informado');
    return res.status(400).json({ error: 'CNPJ é obrigatório.' });
  }

  db.get('SELECT * FROM empresas WHERE cnpj = ?', [cnpj], (err, empresa) => {
    if (err) {
      console.error('💥 Erro na consulta:', err.message);
      return res.status(500).json({ error: 'Erro no banco de dados.' });
    }

    if (!empresa) {
      console.warn(`❌ CNPJ não encontrado: ${cnpj}`);
      return res.status(404).json({ error: 'CNPJ não encontrado.' });
    }

    console.log(`🏢 Empresa encontrada: ${empresa.nome} | CNPJ: ${empresa.cnpj}`);

    if (!empresa.codigo_seguranca) {
      const novoCodigo = gerarCodigo();
      db.run('UPDATE empresas SET codigo_seguranca = ? WHERE cnpj = ?', [novoCodigo, cnpj], function (err2) {
        if (err2) {
          console.error('💥 Erro ao atualizar código:', err2.message);
          return res.status(500).json({ error: 'Erro ao salvar o código.' });
        }

        console.log(`✅ Código atribuído à empresa ${empresa.nome} (CNPJ: ${cnpj})`);
        return res.json({
          mensagem: 'Código gerado e atribuído.',
          codigo: novoCodigo
        });
      });
    } else {
      console.log(`🔐 Empresa já possui código: ${empresa.codigo_seguranca}`);

      if (!codigoDigitado) {
        console.warn('⚠️ Código não informado na verificação');
        return res.status(400).json({ mensagem: 'Código já atribuído. Informe o código para validação.' });
      }

      if (codigoDigitado === empresa.codigo_seguranca) {
        console.log('✅ Código validado com sucesso!');
        return res.json({ mensagem: 'Código válido. Acesso permitido.' });
      } else {
        console.warn(`❌ Código incorreto. Esperado: ${empresa.codigo_seguranca}, recebido: ${codigoDigitado}`);
        return res.status(401).json({ mensagem: 'Código incorreto. Acesso negado.' });
      }
    }
  });
});

app.listen(3000, () => {
  console.log('🚀 Servidor rodando em http://localhost:3000');
});
