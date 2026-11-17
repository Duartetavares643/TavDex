// =====================================================================
//  TavDex – fotos de perfil e imagens do banner
//  · receberFoto / receberBanner: lê o ficheiro enviado (multer, em memória, máx. 5 MB)
//  · processarBanner: igual à foto, mas em 1500×500 (coluna utilizadores.banner)
//  · processarFoto: confirma pelo CONTEÚDO que é JPG/PNG/WebP (não pela
//    extensão), recorta ao centro e reduz a 256×256 em JPEG (sharp).
//    Como a imagem é desenhada de novo, perde metadados e qualquer código escondido.
//  · fotoDoGoogle: descarrega a foto de uma conta Google nova
//  As fotos ficam na coluna utilizadores.foto (MEDIUMBLOB).
// =====================================================================
const multer = require('multer');
const sharp = require('sharp');
const { falha } = require('./ajudas');

const TAMANHO_MAX = 5 * 1024 * 1024;   // 5 MB
const FORMATOS = ['jpeg', 'png', 'webp'];

// Middleware que põe o ficheiro do campo "campo" em req.file (ou responde com um erro claro)
function leitorDe(campo, nome) {
  const leitor = multer({ storage: multer.memoryStorage(), limits: { fileSize: TAMANHO_MAX, files: 1 } }).single(campo);
  return (req, res, next) => leitor(req, res, erro => {
    if (!erro) return next();
    if (erro.code === 'LIMIT_FILE_SIZE') return next(Object.assign(new Error(`${nome} tem de ter no máximo 5 MB.`), { status: 400, publico: true }));
    next(Object.assign(new Error('Não foi possível ler o ficheiro.'), { status: 400, publico: true }));
  });
}
const receberFoto = leitorDe('foto', 'A foto');
const receberBanner = leitorDe('banner', 'A imagem do banner');

// Confirma pelo conteúdo que é JPG/PNG/WebP e devolve-a em JPEG com largura×altura
// (recortada ao centro; o browser já mandou o recorte escolhido pela pessoa)
async function processarImagem(bytes, largura, altura, qualidade) {
  if (!bytes || !bytes.length) falha(400, 'Escolhe uma imagem.');
  let info;
  try {
    info = await sharp(bytes).metadata();
  } catch (e) {
    info = null;
  }
  if (!info || !FORMATOS.includes(info.format)) falha(400, 'O ficheiro tem de ser uma imagem JPG, PNG ou WebP.');
  return sharp(bytes)
    .rotate()                                                       // respeita a orientação das fotos do telemóvel
    .resize(largura, altura, { fit: 'cover', position: 'centre' })  // recorta ao centro
    .jpeg({ quality: qualidade })
    .toBuffer();
}

// Foto de perfil: JPEG 256×256
const processarFoto = bytes => processarImagem(bytes, 256, 256, 85);
// Banner do perfil: JPEG 1500×500 (3:1; no telemóvel o banner mostra a parte do meio)
const processarBanner = bytes => processarImagem(bytes, 1500, 500, 82);

// Só aceita fotos do Google vindas de *.googleusercontent.com (https)
function urlGoogleValido(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && (u.hostname === 'googleusercontent.com' || u.hostname.endsWith('.googleusercontent.com'));
  } catch (e) {
    return false;
  }
}

// Descarrega e prepara a foto do Google. Se algo falhar, a conta fica sem foto (null).
async function fotoDoGoogle(url) {
  if (!urlGoogleValido(url)) return null;
  try {
    const resposta = await fetch(url.replace(/=s\d+-c$/, '=s256-c'), { signal: AbortSignal.timeout(5000) });
    if (!resposta.ok) return null;
    const bytes = Buffer.from(await resposta.arrayBuffer());
    if (bytes.length > TAMANHO_MAX) return null;
    return await processarFoto(bytes);
  } catch (e) {
    console.error('Não foi possível guardar a foto do Google:', e.message);
    return null;
  }
}

module.exports = { receberFoto, processarFoto, receberBanner, processarBanner, fotoDoGoogle, urlGoogleValido };
