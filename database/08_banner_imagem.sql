-- =====================================================================
--  TavDex – Banner do perfil com uma imagem própria
--  Além dos 5 cenários desenhados, cada utilizador pode carregar uma imagem
--  (JPG, PNG ou WebP até 5 MB). O servidor recorta-a e guarda-a em JPEG 1500×500.
--    banner         = a imagem (NULL = usa o cenário escolhido em tema_banner)
--    banner_versao  = muda sempre que a imagem muda (0 = sem imagem); entra no
--                     endereço /api/utilizadores/<id>/banner?v=<versao> para a cache
--  Executar depois de 07_banners_novos.sql. Não apaga dados.
-- =====================================================================
USE TavDex;

ALTER TABLE utilizadores
    ADD COLUMN banner MEDIUMBLOB NULL,
    ADD COLUMN banner_versao INT NOT NULL DEFAULT 0;
