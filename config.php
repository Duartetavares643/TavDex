<?php
// =====================================================================
//  TavDex – Configuração
//  Alterar estes valores de acordo com o servidor (XAMPP por omissão)
// =====================================================================

define('BD_HOST', 'localhost');
define('BD_NOME', 'TavDex');
define('BD_UTILIZADOR', 'root');
define('BD_PASSWORD', '');           // no XAMPP a password do root está vazia

// Endereço do site (usado nos emails de recuperação de palavra-passe)
define('URL_SITE', 'http://localhost/tavdex');

// Em desenvolvimento (XAMPP) não há servidor de email configurado.
// Com MODO_DEV = true, o link de recuperação aparece no ecrã em vez de ser enviado.
// No servidor final mudar para false.
define('MODO_DEV', true);

// Email que aparece como remetente nos emails do site
define('EMAIL_SITE', 'nao-responder@tavdex.pt');

// Imagens reais dos filmes e séries (cartazes e fundos) através da API do TMDB.
// 1. Cria uma conta gratuita em https://www.themoviedb.org
// 2. Em Definições > API, pede uma chave (uso não comercial) e copia a "API Key" (v3)
// 3. Cola-a aqui. Sem chave, o site usa cartazes desenhados.
define('TMDB_CHAVE', getenv('TAVDEX_TMDB_CHAVE') ?: '');   // ex.: '1a2b3c4d5e...'
define('TMDB_API', getenv('TAVDEX_TMDB_API') ?: 'https://api.themoviedb.org/3');   // (getenv só é usado nos testes)
define('TMDB_IMG', 'https://image.tmdb.org/t/p/');

// Login com o Google (opcional). Sem estes dois valores o botão avisa que não está configurado.
// Como obter: ver o LEIA-ME.md, secção "Login com o Google".
// O "URI de redirecionamento" a registar na Google é URL_SITE + '/google.php'
// (ex.: http://localhost/tavdex/google.php).
define('GOOGLE_CLIENT_ID', getenv('TAVDEX_GOOGLE_ID') ?: '');
define('GOOGLE_CLIENT_SECRET', getenv('TAVDEX_GOOGLE_SEGREDO') ?: '');

// Verificações que usam a internet (se falharem, não bloqueiam o registo):
//  VERIFICAR_FUGAS: a palavra-passe apareceu em fugas de dados? (Have I Been Pwned)
//  VERIFICAR_DNS:   o domínio do email existe e recebe emails?
define('VERIFICAR_FUGAS', true);
define('VERIFICAR_DNS', true);

date_default_timezone_set('Europe/Lisbon');
