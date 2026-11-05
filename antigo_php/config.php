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
define('URL_SITE', 'http://localhost/tavdex-php');

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

date_default_timezone_set('Europe/Lisbon');
