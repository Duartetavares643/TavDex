</main>
<footer class="ft"><div class="ft-in">
  <div class="marca"><img src="logo.png" alt=""><b>Tav<em>Dex</em></b></div>
  <span class="lema">Descobre. Organiza. Avalia. Cria.</span>
  <nav aria-label="Rodapé">
    <a href="catalogo.php?tipo=filme">Filmes</a><a href="catalogo.php?tipo=serie">Séries</a><a href="projetos.php">Projetos</a><a href="comunidade.php">Comunidade</a>
    <?php if (!eu()): ?><a href="registar.php">Criar conta</a><?php endif; ?>
    <a href="termos.php">Termos</a><a href="privacidade.php">Privacidade</a>
  </nav>
  <?php if (TMDB_CHAVE !== ''): ?><small class="tmdb">Imagens de filmes e séries: <a class="lk" href="https://www.themoviedb.org" rel="noopener" target="_blank">TMDB</a>. This product uses the TMDB API but is not endorsed or certified by TMDB.</small><?php endif; ?>
  <small>TavDex © <?= date('Y') ?> · PAP de Duarte Veríssimo Tavares · Técnico de Informática – Sistemas</small>
</div></footer>
<?php if (!empty($com_banner)): ?><script src="<?= versao('banner-perfil.js') ?>"></script><?php endif; ?>
<?php if (!empty($com_regras)): ?><script src="<?= versao('regras-palavra-passe.js') ?>"></script><script src="<?= versao('regras-email.js') ?>"></script><?php endif; ?>
<script src="<?= versao('main.js') ?>"></script>
</body>
</html>
