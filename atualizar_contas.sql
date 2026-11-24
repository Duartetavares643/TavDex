-- =====================================================================
--  TavDex – Atualização da base de dados: contas, perfil e banner
--  (vindo da versão em Node.js: banner do perfil, foto, nome de exibição,
--   confirmação do email, login com o Google, "Manter sessão iniciada",
--   privacidade do perfil e géneros favoritos)
--
--  Só é preciso se já tinhas a base de dados TavDex e não queres perder os dados.
--  Quem importar agora base_dados.sql + dados.sql não precisa disto.
--
--  Mais simples: abre http://localhost/tavdex/atualizar.php e carrega em
--  "Atualizar a base de dados" (faz estes passos e salta os que já estão feitos).
--  Se executares este ficheiro à mão e uma parte der "Duplicate column" ou
--  "already exists", é porque já estava feita: passa à seguinte.
-- =====================================================================
USE TavDex;

-- 1. Nome de exibição (ex.: "Duarte Tavares"; NULL = mostra o @nome)
ALTER TABLE utilizadores ADD COLUMN nome_exibicao VARCHAR(50) NULL AFTER nome;

-- 2. Confirmação do email (as contas que já existem ficam confirmadas)
ALTER TABLE utilizadores
    ADD COLUMN email_verificado BOOLEAN NOT NULL DEFAULT 0 AFTER email,
    ADD COLUMN email_pendente VARCHAR(120) NULL AFTER email_verificado;
UPDATE utilizadores SET email_verificado = 1 WHERE id > 0;

-- 3. Login com o Google (as contas só do Google não têm palavra-passe)
ALTER TABLE utilizadores
    MODIFY password_hash VARCHAR(255) NULL,
    ADD COLUMN google_id VARCHAR(50) NULL UNIQUE AFTER password_hash,
    ADD COLUMN google_email VARCHAR(120) NULL AFTER google_id;

-- 4. Foto de perfil e banner (cenário desenhado ou imagem própria)
ALTER TABLE utilizadores
    ADD COLUMN foto MEDIUMBLOB NULL AFTER cor,
    ADD COLUMN foto_versao INT NOT NULL DEFAULT 0 AFTER foto,
    ADD COLUMN tema_banner ENUM('colina','pipocas','claquete','pelicula','marquise') NOT NULL DEFAULT 'colina' AFTER foto_versao,
    ADD COLUMN banner MEDIUMBLOB NULL AFTER tema_banner,
    ADD COLUMN banner_versao INT NOT NULL DEFAULT 0 AFTER banner;

-- 5. Privacidade do perfil e último login
ALTER TABLE utilizadores
    ADD COLUMN mostrar_listas BOOLEAN NOT NULL DEFAULT 1 AFTER banner_versao,
    ADD COLUMN mostrar_seguidores BOOLEAN NOT NULL DEFAULT 1 AFTER mostrar_listas,
    ADD COLUMN ultimo_login DATETIME NULL AFTER notif_email;

-- 6. Links de confirmação do email
CREATE TABLE verificacao_email (
    id INT AUTO_INCREMENT PRIMARY KEY,
    utilizador_id INT NOT NULL,
    email VARCHAR(120) NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expira_em DATETIME NOT NULL,
    usado BOOLEAN NOT NULL DEFAULT 0,
    criado_em DATETIME NOT NULL,
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id) ON DELETE CASCADE
);

-- 7. "Manter sessão iniciada"
CREATE TABLE sessoes_lembradas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    utilizador_id INT NOT NULL,
    seletor CHAR(24) NOT NULL UNIQUE,
    token_hash CHAR(64) NOT NULL,
    dispositivo VARCHAR(120) NOT NULL DEFAULT '',
    expira_em DATETIME NOT NULL,
    criado_em DATETIME NOT NULL,
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id) ON DELETE CASCADE
);

-- 8. Géneros favoritos (até 3, escolhidos nas Definições)
CREATE TABLE utilizador_generos (
    utilizador_id INT NOT NULL,
    genero_id INT NOT NULL,
    PRIMARY KEY (utilizador_id, genero_id),
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id) ON DELETE CASCADE,
    FOREIGN KEY (genero_id) REFERENCES generos(id) ON DELETE CASCADE
);
