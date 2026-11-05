-- =====================================================================
--  TavDex – Atualização da base de dados
--  Só é preciso se já tinhas importado uma versão anterior de base_dados.sql
--  e não queres perder os dados. Quem importar agora base_dados.sql (ou
--  instalar_online.sql) não precisa disto.
--  Se uma parte der erro "Duplicate column" ou "already exists", é porque
--  já estava feita: passa à seguinte.
-- =====================================================================
USE TavDex;

-- 1. Imagens do TMDB (cartaz e fundo)
ALTER TABLE titulos
    MODIFY cartaz VARCHAR(255) NULL,
    ADD COLUMN fundo VARCHAR(255) NULL AFTER cartaz,
    ADD COLUMN tmdb_id INT NULL AFTER fundo;

-- 2. Onde ver (plataformas de streaming)
CREATE TABLE plataformas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(40) NOT NULL UNIQUE,
    cor CHAR(7) NOT NULL DEFAULT '#888888',
    url VARCHAR(200) NOT NULL DEFAULT ''
);
CREATE TABLE titulo_plataformas (
    titulo_id INT NOT NULL,
    plataforma_id INT NOT NULL,
    PRIMARY KEY (titulo_id, plataforma_id),
    FOREIGN KEY (titulo_id) REFERENCES titulos(id) ON DELETE CASCADE,
    FOREIGN KEY (plataforma_id) REFERENCES plataformas(id) ON DELETE CASCADE
);
INSERT INTO plataformas (nome, cor, url) VALUES
('Netflix', '#E50914', 'https://www.netflix.com'),
('Disney+', '#113CCF', 'https://www.disneyplus.com'),
('HBO Max', '#5822B4', 'https://www.hbomax.com'),
('Prime Video', '#00A8E1', 'https://www.primevideo.com'),
('Apple TV', '#4A4A4F', 'https://tv.apple.com'),
('SkyShowtime', '#2A2AD6', 'https://www.skyshowtime.com'),
('Crunchyroll', '#F47521', 'https://www.crunchyroll.com'),
('Filmin', '#E5007E', 'https://www.filmin.pt');
