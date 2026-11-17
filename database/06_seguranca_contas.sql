-- =====================================================================
--  TavDex – Contas mais seguras (Fase 2 do anteprojeto, melhorias)
--  · confirmação do email por link (registo e mudança de email)
--  · @nomes antigos reservados 30 dias · géneros favoritos · privacidade do perfil
--  · "Manter sessão iniciada" e expiração das sessões
--  Executar UMA vez, DEPOIS de 05_banner_cinema.sql. Não apaga dados.
--  Se der erro "Duplicate column" é porque já foi executado.
--  Os ids são INT (com sinal), iguais a utilizadores.id e generos.id
--  (o MySQL recusa chaves estrangeiras com tipos diferentes).
-- =====================================================================
USE TavDex;

-- ---------------------------------------------------------------------
-- UTILIZADORES
-- ---------------------------------------------------------------------
ALTER TABLE utilizadores
    ADD COLUMN email_pendente VARCHAR(120) NULL AFTER email,           -- novo email à espera de confirmação
    ADD COLUMN palavra_passe_alterada_em DATETIME NULL,
    ADD COLUMN palavra_passe_fraca BOOLEAN NULL,                        -- a palavra-passe já não cumpre as regras? (visto no login)
    ADD COLUMN nome_alterado_em DATETIME NULL,                          -- última mudança do @nome
    ADD COLUMN mostrar_listas BOOLEAN NOT NULL DEFAULT TRUE,            -- favoritos, a ver e vistos visíveis no perfil
    ADD COLUMN mostrar_seguidores BOOLEAN NOT NULL DEFAULT TRUE;        -- listas de seguidores / a seguir visíveis

-- As contas que já existem ficam confirmadas, para ninguém ficar sem conseguir entrar
-- (WHERE por causa do "safe updates" do MySQL Workbench)
UPDATE utilizadores SET email_verificado = TRUE WHERE id > 0;

-- ---------------------------------------------------------------------
-- RECUPERAÇÃO: IP de cada pedido (no máximo 10 pedidos por hora por IP)
-- ---------------------------------------------------------------------
ALTER TABLE recuperacoes
    ADD COLUMN ip VARCHAR(45) NULL,
    ADD INDEX idx_recuperacoes_ip (ip, criado_em);

-- ---------------------------------------------------------------------
-- LINKS DE CONFIRMAÇÃO DO EMAIL (registo e mudança de email)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS verificacao_email (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    utilizador_id INT NOT NULL,
    email         VARCHAR(120) NOT NULL,                   -- email que este link confirma
    token         CHAR(64) NOT NULL UNIQUE,                -- hash SHA-256 do token enviado (nunca o token verdadeiro)
    ip            VARCHAR(45) NULL,
    expira_em     DATETIME NOT NULL,
    usado         BOOLEAN NOT NULL DEFAULT FALSE,
    data_pedido   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id) ON DELETE CASCADE,
    INDEX idx_verificacao (utilizador_id, data_pedido)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- @NOMES ANTIGOS: o endereço antigo do perfil redireciona e o @nome
-- fica reservado para o dono durante 30 dias
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nomes_antigos (
    nome          VARCHAR(30) NOT NULL PRIMARY KEY,        -- mesmo tamanho que utilizadores.nome
    utilizador_id INT NOT NULL,
    data          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- GÉNEROS FAVORITOS escolhidos nas Definições (até 3)
-- (a caixa "Géneros preferidos" do perfil continua a ser calculada pelas avaliações)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS utilizador_generos (
    utilizador_id INT NOT NULL,
    genero_id     INT NOT NULL,
    PRIMARY KEY (utilizador_id, genero_id),
    FOREIGN KEY (utilizador_id) REFERENCES utilizadores(id) ON DELETE CASCADE,
    FOREIGN KEY (genero_id)     REFERENCES generos(id)      ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- SESSÕES: "Manter sessão iniciada" e data de expiração
-- ---------------------------------------------------------------------
ALTER TABLE sessoes
    ADD COLUMN manter BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN expira_em DATETIME NULL;
