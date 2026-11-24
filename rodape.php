</main>
<footer class="ft"><div class="ft-in">
  <div class="marca"><img src="logo.png" alt=""><b>Tav<em>Dex</em></b></div>
  <span class="lema">Descobre. Organiza. Avalia. Cria.</span>
  <nav aria-label="Rodapé">
    <a href="catalogo.php?tipo=filme">Filmes</a><a href="catalogo.php?tipo=serie">Séries</a><a href="projetos.php">Projetos</a><a href="comunidade.php">Comunidade</a>
    <?php if (!eu()): ?><a href="registar.php">Criar conta</a><?php endif; ?>
  </nav>
  <?php if (TMDB_CHAVE !== ''): ?><small class="tmdb">Imagens de filmes e séries: <a class="lk" href="https://www.themoviedb.org" rel="noopener" target="_blank">TMDB</a>. This product uses the TMDB API but is not endorsed or certified by TMDB.</small><?php endif; ?>
  <small>TavDex © <?= date('Y') ?> · PAP de Duarte Veríssimo Tavares · Técnico de Informática – Sistemas</small>
</div></footer>
<script src="main.js"></script>
</body>
</html>
