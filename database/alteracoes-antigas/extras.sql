-- =====================================================================
--  TavDex – Alterações à base de dados (Fases 2 a 6)
--  Executar UMA vez, DEPOIS de 01_criar_bd.sql e 02_inserir_dados.sql.
--  Se der erro "Duplicate column" é porque já foi executado: para repetir,
--  volta a correr 01_criar_bd.sql e 02_inserir_dados.sql primeiro.
-- =====================================================================
USE TavDex;

-- ---------------------------------------------------------------------
-- CONTAS E SEGURANÇA (Fase 2)
-- ---------------------------------------------------------------------

-- Email da conta Google ligada (pode ser diferente do email da conta)
ALTER TABLE utilizadores ADD COLUMN google_email VARCHAR(120) NULL AFTER google_id;

-- Sessões ativas por dispositivo. A sessão do Express guarda um token
-- aleatório; aqui fica só o hash SHA-256 desse token. Apagar a linha
-- = terminar a sessão nesse dispositivo.
-- (A tabela antiga só tinha sessões temporárias, por isso pode ser apagada.
--  As sessões do Express passam a ficar na tabela sessoes_express, criada
--  automaticamente pela biblioteca express-mysql-session.)
DROP TABLE IF EXISTS sessoes;
CREATE TABLE sessoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    utilizador_id INT NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    dispositivo VARCHAR(200) NOT NULL DEFAULT '',  -- navegador / sistema (User-Agent)
    ip VARCHAR(45) NOT NULL DEFAULT '',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ultimo_acesso TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id) ON DELETE CASCADE
);

-- Registo de eventos de segurança (aparece em Definições > Atividade recente)
CREATE TABLE IF NOT EXISTS atividade_conta (
    id INT AUTO_INCREMENT PRIMARY KEY,
    utilizador_id INT NOT NULL,
    tipo VARCHAR(30) NOT NULL,                     -- ex.: login, login_falhado, palavra_passe
    ip VARCHAR(45) NOT NULL DEFAULT '',
    dispositivo VARCHAR(200) NOT NULL DEFAULT '',
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id) ON DELETE CASCADE,
    INDEX idx_atividade (utilizador_id, criado_em)
);

-- Contar falhas de login por IP também é rápido
CREATE INDEX idx_tentativas_ip ON tentativas_login (ip, criado_em);

-- ---------------------------------------------------------------------
-- PROJETOS (Fase 3)
-- ---------------------------------------------------------------------

-- Quem acompanha cada projeto (recebe notificações das novidades)
CREATE TABLE IF NOT EXISTS projeto_seguidores (
    projeto_id INT NOT NULL,
    utilizador_id INT NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (projeto_id, utilizador_id),
    FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE,
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id) ON DELETE CASCADE
);

-- Os comentários passam a poder pertencer a uma publicação OU a um projeto
ALTER TABLE comentarios
    MODIFY publicacao_id INT NULL,
    ADD COLUMN projeto_id INT NULL AFTER publicacao_id,
    ADD FOREIGN KEY (projeto_id) REFERENCES projetos(id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------
-- COMUNIDADE (Fase 4)
-- ---------------------------------------------------------------------

-- Uma publicação pode falar de um filme/série e ter aviso de spoilers
ALTER TABLE publicacoes
    ADD COLUMN titulo_id INT NULL AFTER projeto_id,
    ADD COLUMN spoiler BOOLEAN NOT NULL DEFAULT 0 AFTER titulo_id,
    ADD FOREIGN KEY (titulo_id) REFERENCES titulos(id) ON DELETE SET NULL;

-- "Gostos" nas publicações (um por utilizador)
CREATE TABLE IF NOT EXISTS gostos (
    utilizador_id INT NOT NULL,
    publicacao_id INT NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (utilizador_id, publicacao_id),
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id) ON DELETE CASCADE,
    FOREIGN KEY (publicacao_id) REFERENCES publicacoes(id) ON DELETE CASCADE
);

-- Data da última edição de uma mensagem do chat (a coluna editada mantém-se)
ALTER TABLE mensagens ADD COLUMN data_edicao DATETIME NULL AFTER editada;

-- Novo tipo de notificação para os gostos
ALTER TABLE notificacoes
    MODIFY tipo ENUM('seguidor','comentario','candidatura','mensagem','projeto','sistema','gosto') NOT NULL;

-- ---------------------------------------------------------------------
-- CATÁLOGO (Fase 5)
-- ---------------------------------------------------------------------

-- Logótipo da plataforma (endereço de uma imagem) e link direto para o título
ALTER TABLE plataformas ADD COLUMN logo VARCHAR(255) NULL;
ALTER TABLE titulo_plataformas ADD COLUMN link VARCHAR(255) NOT NULL DEFAULT '';

-- Pessoas do elenco e da equipa técnica
CREATE TABLE IF NOT EXISTS pessoas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    foto VARCHAR(255) NULL,                        -- endereço de uma imagem (opcional)
    INDEX idx_pessoas_nome (nome)
);

-- Quem participa em cada título e com que função
CREATE TABLE IF NOT EXISTS titulo_pessoas (
    titulo_id INT NOT NULL,
    pessoa_id INT NOT NULL,
    funcao ENUM('ator','realizacao','argumento','producao','musica') NOT NULL,
    personagem VARCHAR(100) NOT NULL DEFAULT '',   -- só para atores
    ordem SMALLINT NOT NULL DEFAULT 0,             -- ordem em que aparece
    PRIMARY KEY (titulo_id, pessoa_id, funcao),
    FOREIGN KEY (titulo_id) REFERENCES titulos(id) ON DELETE CASCADE,
    FOREIGN KEY (pessoa_id) REFERENCES pessoas(id) ON DELETE CASCADE
);

-- Episódios de cada temporada
CREATE TABLE IF NOT EXISTS episodios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    temporada_id INT NOT NULL,
    numero SMALLINT NOT NULL,
    nome VARCHAR(150) NOT NULL,
    duracao_min SMALLINT NULL,
    data_estreia DATE NULL,
    UNIQUE (temporada_id, numero),
    FOREIGN KEY (temporada_id) REFERENCES temporadas(id) ON DELETE CASCADE
);

-- Vista: cada título com a média e o número de avaliações.
-- Usada no catálogo, na pesquisa e nas filas da página inicial.
CREATE OR REPLACE VIEW vw_titulos_avaliacao AS
SELECT t.*,
       ROUND(AVG(a.nota), 1) AS media,
       COUNT(a.id) AS total_avaliacoes
FROM titulos t
LEFT JOIN avaliacoes a ON a.titulo_id = t.id
GROUP BY t.id;

-- ---------------------------------------------------------------------
-- DADOS DE EXEMPLO para as tabelas novas
-- ---------------------------------------------------------------------
INSERT INTO pessoas (id, nome) VALUES
(1, 'Denis Villeneuve'), (2, 'Timothée Chalamet'), (3, 'Zendaya'), (4, 'Rebecca Ferguson'),
(5, 'Javier Bardem'), (6, 'Austin Butler'), (7, 'Hans Zimmer'),
(8, 'Christopher Nolan'), (9, 'Cillian Murphy'), (10, 'Emily Blunt'), (11, 'Robert Downey Jr.'),
(12, 'Matt Damon'), (13, 'Ludwig Göransson'),
(14, 'Vince Gilligan'), (15, 'Bryan Cranston'), (16, 'Aaron Paul'), (17, 'Anna Gunn');

INSERT INTO titulo_pessoas (titulo_id, pessoa_id, funcao, personagem, ordem) VALUES
(1, 1, 'realizacao', '', 0), (1, 7, 'musica', '', 0),
(1, 2, 'ator', 'Paul Atreides', 1), (1, 3, 'ator', 'Chani', 2), (1, 4, 'ator', 'Lady Jessica', 3),
(1, 5, 'ator', 'Stilgar', 4), (1, 6, 'ator', 'Feyd-Rautha', 5),
(2, 8, 'realizacao', '', 0), (2, 8, 'argumento', '', 0), (2, 13, 'musica', '', 0),
(2, 9, 'ator', 'J. Robert Oppenheimer', 1), (2, 10, 'ator', 'Kitty Oppenheimer', 2),
(2, 11, 'ator', 'Lewis Strauss', 3), (2, 12, 'ator', 'Leslie Groves', 4),
(10, 14, 'argumento', '', 0), (10, 14, 'producao', '', 0),
(10, 15, 'ator', 'Walter White', 1), (10, 16, 'ator', 'Jesse Pinkman', 2), (10, 17, 'ator', 'Skyler White', 3);

-- Episódios da 1.ª temporada de Breaking Bad (título 10)
INSERT INTO episodios (temporada_id, numero, nome, duracao_min, data_estreia)
SELECT tp.id, e.numero, e.nome, e.duracao, e.estreia
FROM temporadas tp
JOIN (
    SELECT 1 AS numero, 'Pilot' AS nome, 58 AS duracao, DATE '2008-01-20' AS estreia
    UNION ALL SELECT 2, 'Cat''s in the Bag...', 48, DATE '2008-01-27'
    UNION ALL SELECT 3, '...And the Bag''s in the River', 48, DATE '2008-02-10'
    UNION ALL SELECT 4, 'Cancer Man', 48, DATE '2008-02-17'
    UNION ALL SELECT 5, 'Gray Matter', 48, DATE '2008-02-24'
    UNION ALL SELECT 6, 'Crazy Handful of Nothin''', 48, DATE '2008-03-02'
    UNION ALL SELECT 7, 'A No-Rough-Stuff-Type Deal', 48, DATE '2008-03-09'
) e
WHERE tp.titulo_id = 10 AND tp.numero = 1;

-- Uma publicação de exemplo ligada a um filme, com aviso de spoilers
UPDATE publicacoes SET titulo_id = 1 WHERE id = 1;
