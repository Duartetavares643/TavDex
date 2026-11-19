-- =====================================================================
--  TavDex – Banner do perfil: cenários de cinema
--  Troca os 4 cenários antigos (04_banner_perfil.sql) pelos novos:
--    fachada  = Cinema de bairro
--    estreia  = Noite de estreia
--    noir     = Cinema noir
--    cartaz   = Cartaz vintage
--  Cada utilizador fica com o cenário novo mais parecido com o que tinha.
--  Executar depois de 04_banner_perfil.sql.
-- =====================================================================
USE TavDex;

-- 1) A coluna aceita, por agora, os nomes antigos e os novos
ALTER TABLE utilizadores
    MODIFY COLUMN tema_banner
        ENUM('chuva','synthwave','beco','montanhas','fachada','estreia','noir','cartaz')
        NOT NULL DEFAULT 'fachada';

-- 2) Cada cenário antigo passa para o novo mais parecido
UPDATE utilizadores
SET tema_banner = CASE tema_banner
        WHEN 'chuva'     THEN 'estreia'   -- chuva → noite de estreia à chuva
        WHEN 'beco'      THEN 'noir'      -- beco néon → cinema noir
        WHEN 'synthwave' THEN 'cartaz'    -- retro → cartaz vintage
        WHEN 'montanhas' THEN 'fachada'
        ELSE tema_banner
    END
WHERE id > 0;

-- 3) A coluna fica só com os cenários novos
ALTER TABLE utilizadores
    MODIFY COLUMN tema_banner ENUM('fachada','estreia','noir','cartaz')
        NOT NULL DEFAULT 'fachada';
