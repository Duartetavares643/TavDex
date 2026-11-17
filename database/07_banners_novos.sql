-- =====================================================================
--  TavDex – Banner do perfil: os 5 cenários novos
--    colina    = Colina das estrelas  (pôr do sol, focos de luz, palmeiras)
--    pipocas   = Sessão de pipocas    (película, cortinas, pipocas e confetes)
--    claquete  = Claquete antiga      (papel envelhecido, claquete e borboleta)
--    pelicula  = Rolo de película     (películas a correr e projetor)
--    marquise  = Cinema à noite       (marquise iluminada e néon "CINEMA")
--  Cada utilizador passa do cenário antigo para o novo mais parecido.
--  Executar depois de 06_seguranca_contas.sql. Não apaga dados.
-- =====================================================================
USE TavDex;

-- 1) A coluna aceita, por agora, os nomes antigos e os novos
ALTER TABLE utilizadores
    MODIFY COLUMN tema_banner
        ENUM('fachada','estreia','noir','cartaz','colina','pipocas','claquete','pelicula','marquise')
        NOT NULL DEFAULT 'colina';

-- 2) Cada cenário antigo passa para o novo mais parecido
UPDATE utilizadores
SET tema_banner = CASE tema_banner
        WHEN 'fachada' THEN 'colina'      -- o cenário por omissão continua a ser o primeiro
        WHEN 'estreia' THEN 'pipocas'
        WHEN 'noir'    THEN 'marquise'
        WHEN 'cartaz'  THEN 'claquete'
        ELSE tema_banner
    END
WHERE id > 0;

-- 3) A coluna fica só com os cenários novos
ALTER TABLE utilizadores
    MODIFY COLUMN tema_banner ENUM('colina','pipocas','claquete','pelicula','marquise')
        NOT NULL DEFAULT 'colina';
