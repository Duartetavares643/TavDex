-- =====================================================================
--  TavDex – bloquear as contas de exemplo (email @mail.pt)
--  As contas bloqueadas deixam de poder entrar ("Esta conta foi suspensa"),
--  mas as avaliações, reviews, publicações e projetos delas continuam no site.
--  Não mexe na conta de administrador nem nas contas com email verdadeiro.
--  Executar no MySQL Workbench ou no phpMyAdmin (separador SQL).
-- =====================================================================
USE tavdex_site;

-- O MySQL Workbench não deixa fazer UPDATE/DELETE sem usar a chave primária
-- (modo "safe updates"); desliga-se só enquanto este script corre.
SET SQL_SAFE_UPDATES = 0;

-- 1. Ver as contas que vão ser bloqueadas (só mostra, não muda nada)
SELECT id, nome, email
FROM utilizadores
WHERE email LIKE '%@mail.pt' AND papel <> 'admin';

-- 2. Bloquear essas contas
UPDATE utilizadores
SET bloqueado = 1
WHERE email LIKE '%@mail.pt' AND papel <> 'admin';

-- 3. Terminar as sessões que essas contas tenham abertas
DELETE FROM sessoes
WHERE utilizador_id IN (SELECT id FROM utilizadores WHERE bloqueado = 1);

SET SQL_SAFE_UPDATES = 1;

-- Para voltar atrás (desbloquear todas as contas de exemplo):
-- SET SQL_SAFE_UPDATES = 0;
-- UPDATE utilizadores SET bloqueado = 0 WHERE email LIKE '%@mail.pt';
-- SET SQL_SAFE_UPDATES = 1;
