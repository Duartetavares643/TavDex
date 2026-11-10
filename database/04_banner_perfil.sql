-- =====================================================================
--  TavDex – Banner do perfil em pixel art
--  Executar UMA vez, DEPOIS de 03_contas.sql. Não apaga dados.
--  Se der erro "Duplicate column" é porque já foi executado.
-- =====================================================================
USE TavDex;

-- Cenário do banner do perfil, escolhido por cada utilizador nas Definições
--   chuva      = Cidade à chuva
--   synthwave  = Pôr do sol retro
--   beco       = Beco néon
--   montanhas  = Montanhas ao anoitecer
ALTER TABLE utilizadores
    ADD COLUMN tema_banner ENUM('chuva','synthwave','beco','montanhas')
        NOT NULL DEFAULT 'chuva' AFTER cor;
