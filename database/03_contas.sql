-- =====================================================================
--  TavDex – Contas: nome de exibição, foto, email confirmado (Passos 4 a 10)
--  Executar UMA vez, DEPOIS de 01_criar_bd.sql, 02_inserir_dados.sql e extras.sql.
--  Não apaga dados: só acrescenta colunas.
--  Se der erro "Duplicate column" é porque já foi executado.
-- =====================================================================
USE TavDex;

-- ---------------------------------------------------------------------
-- UTILIZADORES
-- ---------------------------------------------------------------------
ALTER TABLE utilizadores
    -- @nome de utilizador: passa de 20 para 30 caracteres
    MODIFY nome VARCHAR(30) NOT NULL,
    -- Nome que aparece no perfil (ex.: "Duarte Tavares"); NULL = mostra o @nome
    ADD COLUMN nome_exibicao VARCHAR(50) NULL AFTER nome,
    -- Foto de perfil: JPEG 256×256 guardado na própria base de dados
    -- (assim não se perde se o site for para um alojamento sem disco permanente)
    ADD COLUMN foto MEDIUMBLOB NULL AFTER cor,
    -- Muda sempre que a foto muda, para o browser não mostrar a antiga (cache)
    ADD COLUMN foto_versao INT NOT NULL DEFAULT 0 AFTER foto,
    -- 1 = sabemos que o email é mesmo da pessoa (Google ou link de recuperação)
    ADD COLUMN email_verificado BOOLEAN NOT NULL DEFAULT 0 AFTER email,
    ADD COLUMN ultimo_login DATETIME NULL AFTER criado_em;

-- Contas que já entraram com o Google têm o email confirmado pela Google
UPDATE utilizadores SET email_verificado = 1 WHERE google_id IS NOT NULL;

-- ---------------------------------------------------------------------
-- SESSÕES POR DISPOSITIVO: como entrou (palavra-passe ou Google)
-- ---------------------------------------------------------------------
ALTER TABLE sessoes
    ADD COLUMN via ENUM('palavra_passe','google') NOT NULL DEFAULT 'palavra_passe' AFTER ip;

-- ---------------------------------------------------------------------
-- RECUPERAÇÃO DA PALAVRA-PASSE: data do pedido (máximo 3 por hora)
-- ---------------------------------------------------------------------
ALTER TABLE recuperacoes
    ADD COLUMN criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER usado;

-- ---------------------------------------------------------------------
-- REGISTO DE ATIVIDADE: descrição legível (ex.: "Sessão iniciada com o Google · Windows · Chrome")
-- O "tipo" continua a existir para o código; a descrição é o que se mostra.
-- ---------------------------------------------------------------------
ALTER TABLE atividade_conta
    ADD COLUMN descricao VARCHAR(255) NOT NULL DEFAULT '' AFTER tipo;
