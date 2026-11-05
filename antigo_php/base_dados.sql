-- =====================================================================
--  TavDex – Script de criação da base de dados (Passo 2)
--  PAP 2026/2027 · Técnico de Informática – Sistemas
--  Base de dados relacional em MySQL 8.0
--  Executar no MySQL Workbench ou no phpMyAdmin (XAMPP) ANTES de dados.sql
-- =====================================================================

DROP DATABASE IF EXISTS TavDex;
CREATE DATABASE TavDex CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE TavDex;

-- ---------------------------------------------------------------------
-- UTILIZADORES E CONTAS
-- ---------------------------------------------------------------------

-- Contas dos utilizadores (a palavra-passe é guardada encriptada com password_hash)
CREATE TABLE utilizadores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    bio VARCHAR(160) NOT NULL DEFAULT '',
    localizacao VARCHAR(40) NOT NULL DEFAULT '',
    cor SMALLINT NOT NULL DEFAULT 330,              -- cor do avatar (0 a 359)
    papel ENUM('utilizador','admin') NOT NULL DEFAULT 'utilizador',
    bloqueado BOOLEAN NOT NULL DEFAULT 0,
    notif_email BOOLEAN NOT NULL DEFAULT 0,          -- receber notificações por email
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Pedidos de recuperação de palavra-passe (o token é guardado em hash SHA-256)
CREATE TABLE recuperacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    utilizador_id INT NOT NULL,
    token_hash CHAR(64) NOT NULL,
    expira_em DATETIME NOT NULL,
    usado BOOLEAN NOT NULL DEFAULT 0,
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id) ON DELETE CASCADE
);

-- Quem segue quem
CREATE TABLE seguidores (
    seguidor_id INT NOT NULL,
    seguido_id INT NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (seguidor_id, seguido_id),
    FOREIGN KEY (seguidor_id) REFERENCES utilizadores(id) ON DELETE CASCADE,
    FOREIGN KEY (seguido_id) REFERENCES utilizadores(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- FILMES E SÉRIES
-- ---------------------------------------------------------------------

CREATE TABLE generos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(40) NOT NULL UNIQUE
);

-- Filmes e séries do catálogo
CREATE TABLE titulos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    tipo ENUM('filme','serie') NOT NULL,
    ano SMALLINT NOT NULL,
    duracao_min SMALLINT NULL,                       -- só para filmes
    idade VARCHAR(5) NOT NULL DEFAULT 'M/12',        -- classificação etária
    sinopse TEXT NOT NULL,
    realizador VARCHAR(100) NOT NULL DEFAULT '',     -- realizador ou criador
    cartaz VARCHAR(255) NULL,                        -- cartaz: ficheiro carregado ou endereço do TMDB
    fundo VARCHAR(255) NULL,                         -- imagem larga para o destaque
    tmdb_id INT NULL,                                -- número do título no TMDB (opcional)
    em_curso BOOLEAN NOT NULL DEFAULT 0,             -- só para séries
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Um título pode ter vários géneros (relação N:N)
CREATE TABLE titulo_generos (
    titulo_id INT NOT NULL,
    genero_id INT NOT NULL,
    PRIMARY KEY (titulo_id, genero_id),
    FOREIGN KEY (titulo_id) REFERENCES titulos(id) ON DELETE CASCADE,
    FOREIGN KEY (genero_id) REFERENCES generos(id) ON DELETE CASCADE
);

-- Plataformas de streaming (Netflix, Disney+, ...) para a secção "Onde ver"
CREATE TABLE plataformas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(40) NOT NULL UNIQUE,
    cor CHAR(7) NOT NULL DEFAULT '#888888',          -- cor da etiqueta, ex.: #E50914
    url VARCHAR(200) NOT NULL DEFAULT ''             -- página inicial da plataforma
);

-- Onde está disponível cada título (relação N:N)
CREATE TABLE titulo_plataformas (
    titulo_id INT NOT NULL,
    plataforma_id INT NOT NULL,
    PRIMARY KEY (titulo_id, plataforma_id),
    FOREIGN KEY (titulo_id) REFERENCES titulos(id) ON DELETE CASCADE,
    FOREIGN KEY (plataforma_id) REFERENCES plataformas(id) ON DELETE CASCADE
);

-- Temporadas das séries (gestão de séries)
CREATE TABLE temporadas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo_id INT NOT NULL,
    numero SMALLINT NOT NULL,
    ano SMALLINT NOT NULL,
    episodios SMALLINT NOT NULL,
    UNIQUE (titulo_id, numero),
    FOREIGN KEY (titulo_id) REFERENCES titulos(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- AVALIAÇÕES E LISTAS
-- ---------------------------------------------------------------------

-- Classificação de 1 a 5 estrelas e review (opcional) de cada utilizador
CREATE TABLE avaliacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    utilizador_id INT NOT NULL,
    titulo_id INT NOT NULL,
    nota TINYINT NOT NULL CHECK (nota BETWEEN 1 AND 5),
    review TEXT NULL,
    spoiler BOOLEAN NOT NULL DEFAULT 0,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    editado_em DATETIME NULL,
    UNIQUE (utilizador_id, titulo_id),               -- uma avaliação por título
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id) ON DELETE CASCADE,
    FOREIGN KEY (titulo_id) REFERENCES titulos(id) ON DELETE CASCADE
);

-- Listas pessoais: favoritos, para ver e vistos
CREATE TABLE listas (
    utilizador_id INT NOT NULL,
    titulo_id INT NOT NULL,
    tipo ENUM('favorito','ver','visto') NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (utilizador_id, titulo_id, tipo),
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id) ON DELETE CASCADE,
    FOREIGN KEY (titulo_id) REFERENCES titulos(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- PROJETOS CINEMATOGRÁFICOS
-- ---------------------------------------------------------------------

CREATE TABLE projetos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dono_id INT NOT NULL,
    titulo VARCHAR(100) NOT NULL,
    sinopse TEXT NOT NULL,
    tipo ENUM('Filme','Série','Curta-metragem','Documentário','Videoclipe') NOT NULL,
    genero VARCHAR(60) NOT NULL DEFAULT '',
    estado ENUM('Ideia','Recrutamento','Pré-produção','Em produção','Concluído') NOT NULL DEFAULT 'Ideia',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (dono_id) REFERENCES utilizadores(id) ON DELETE CASCADE
);

-- Equipa do projeto (realizador, produtor, argumentista, atores, ...)
-- Pode ser um utilizador do TavDex ou apenas um nome
CREATE TABLE projeto_equipa (
    id INT AUTO_INCREMENT PRIMARY KEY,
    projeto_id INT NOT NULL,
    funcao VARCHAR(60) NOT NULL,
    utilizador_id INT NULL,
    nome VARCHAR(60) NOT NULL DEFAULT '',
    FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE,
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id) ON DELETE SET NULL
);

-- Funções que o projeto procura (vagas abertas a candidaturas)
CREATE TABLE projeto_vagas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    projeto_id INT NOT NULL,
    funcao VARCHAR(60) NOT NULL,
    descricao VARCHAR(200) NOT NULL DEFAULT '',
    aberta BOOLEAN NOT NULL DEFAULT 1,
    FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE
);

-- Candidaturas a uma vaga de um projeto
CREATE TABLE candidaturas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vaga_id INT NOT NULL,
    utilizador_id INT NOT NULL,
    mensagem VARCHAR(500) NOT NULL DEFAULT '',
    estado ENUM('pendente','aceite','rejeitada') NOT NULL DEFAULT 'pendente',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (vaga_id, utilizador_id),
    FOREIGN KEY (vaga_id) REFERENCES projeto_vagas(id) ON DELETE CASCADE,
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id) ON DELETE CASCADE
);

-- Avaliações e reviews dos projetos
CREATE TABLE projeto_avaliacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    projeto_id INT NOT NULL,
    utilizador_id INT NOT NULL,
    nota TINYINT NOT NULL CHECK (nota BETWEEN 1 AND 5),
    review VARCHAR(1000) NOT NULL DEFAULT '',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (projeto_id, utilizador_id),
    FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE,
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- COMUNIDADE
-- ---------------------------------------------------------------------

-- Publicações do feed (podem estar ligadas a um projeto)
CREATE TABLE publicacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    utilizador_id INT NOT NULL,
    texto VARCHAR(1000) NOT NULL,
    projeto_id INT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id) ON DELETE CASCADE,
    FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE
);

-- Comentários e respostas (pai_id aponta para o comentário respondido)
CREATE TABLE comentarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    publicacao_id INT NOT NULL,
    utilizador_id INT NOT NULL,
    pai_id INT NULL,
    texto VARCHAR(1000) NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (publicacao_id) REFERENCES publicacoes(id) ON DELETE CASCADE,
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id) ON DELETE CASCADE,
    FOREIGN KEY (pai_id) REFERENCES comentarios(id) ON DELETE CASCADE
);

-- Chat da comunidade: para_id NULL = sala geral; caso contrário, mensagem privada
CREATE TABLE mensagens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    de_id INT NOT NULL,
    para_id INT NULL,
    texto VARCHAR(1000) NOT NULL,
    editada BOOLEAN NOT NULL DEFAULT 0,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (de_id) REFERENCES utilizadores(id) ON DELETE CASCADE,
    FOREIGN KEY (para_id) REFERENCES utilizadores(id) ON DELETE CASCADE
);

-- Notificações de cada utilizador
CREATE TABLE notificacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    utilizador_id INT NOT NULL,
    tipo ENUM('seguidor','comentario','candidatura','mensagem','projeto','sistema') NOT NULL,
    texto VARCHAR(255) NOT NULL,
    link VARCHAR(200) NOT NULL DEFAULT '',
    lida BOOLEAN NOT NULL DEFAULT 0,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id) ON DELETE CASCADE
);

-- Tipos de notificação que cada utilizador silenciou
CREATE TABLE notif_silenciadas (
    utilizador_id INT NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    PRIMARY KEY (utilizador_id, tipo),
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id) ON DELETE CASCADE
);

-- Denúncias de conteúdos, analisadas pelos administradores
CREATE TABLE denuncias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    utilizador_id INT NOT NULL,
    tipo ENUM('publicacao','comentario','review','mensagem') NOT NULL,
    alvo_id INT NOT NULL,
    motivo VARCHAR(40) NOT NULL,
    estado ENUM('pendente','resolvida','ignorada') NOT NULL DEFAULT 'pendente',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id) ON DELETE CASCADE
);

-- Índices para tornar as pesquisas mais rápidas
CREATE INDEX idx_titulos_nome ON titulos (nome);
CREATE INDEX idx_titulos_tipo_ano ON titulos (tipo, ano);
CREATE INDEX idx_avaliacoes_titulo ON avaliacoes (titulo_id);
CREATE INDEX idx_mensagens_conversa ON mensagens (de_id, para_id);
CREATE INDEX idx_notificacoes_utilizador ON notificacoes (utilizador_id, lida);
