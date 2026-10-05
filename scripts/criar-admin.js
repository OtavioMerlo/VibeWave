/* Cria ou promove um administrador.
 *
 *   npm run admin -- otaviomerloc@gmail.com
 *   npm run admin -- novo@email.com "senha com 8+ caracteres"
 *
 * Sem o segundo argumento apenas promove (ou rebaixa, com --rebaixar) uma
 * conta que já existe. A senha só é exigida quando a conta ainda não existe.
 */

const readline = require('readline');
const sequelize = require('../config/db');
const User = require('../models/Usuario');

const bcrypt = require('bcryptjs');

const MINIMO_SENHA = 8;

function perguntar(pergunta) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question(pergunta, (resposta) => {
            rl.close();
            resolve(resposta);
        });
    });
}

function falhar(mensagem) {
    console.error(`\n  Erro: ${mensagem}\n`);
    process.exit(1);
}

async function executar() {
    const argumentos = process.argv.slice(2);
    const rebaixar = argumentos.includes('--rebaixar');
    const [emailBruto, senhaBruta] = argumentos.filter((a) => !a.startsWith('--'));
    const email = String(emailBruto || '').trim().toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        falhar('informe um e-mail válido, por exemplo: npm run admin -- voce@email.com');
    }

    const existente = await User.findOne({ where: { email } });

    if (existente) {
        const novoValor = !rebaixar;
        existente.isAdmin = novoValor;
        await existente.save();

        console.log(`\n  ${existente.name} <${email}>`);
        console.log(`  isAdmin = ${novoValor ? 1 : 0} (${novoValor ? 'promovido' : 'rebaixado'})\n`);
        return;
    }

    const senha = senhaBruta || (await perguntar(`Senha para ${email} (mín. ${MINIMO_SENHA}): `));

    if (!senha || senha.length < MINIMO_SENHA) {
        falhar(`a senha precisa ter ao menos ${MINIMO_SENHA} caracteres`);
    }

    const nomeBruto = email.split('@')[0].replace(/[._-]+/g, ' ').trim() || 'Administrador';

    await User.create({
        name: nomeBruto.replace(/\b\w/g, (c) => c.toUpperCase()),
        email,
        password: await bcrypt.hash(senha, 10),
        isAdmin: true
    });

    console.log(`\n  Conta criada: ${email} (já como administrador)\n`);
}

executar()
    .then(() => sequelize.close())
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('\n  Erro:', err.message, '\n');
        sequelize.close().finally(() => process.exit(1));
    });