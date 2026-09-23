// Curated regression cases restored with this audit; not the missing original corpus.
export const NATURAL_UNDERSTANDING_CASES=[
 {id:'fix-file',category:'coding',input:'Corrija src/app.js e rode os testes.',expect:{clarify:false,targetIncludes:'src/app.js',minAcceptance:1}},
 {id:'read-only',category:'constraints',input:'Analise o projeto sem alterar arquivos.',expect:{clarify:false,minConstraints:1}},
 {id:'preserve',category:'constraints',input:'Melhore o site sem alterar o conteúdo.',expect:{clarify:false,minConstraints:1}},
 {id:'autonomy',category:'autonomy',input:'Melhore o aplicativo, você decide.',expect:{autonomy:true,clarify:false}},
 {id:'unknown-reference',category:'ambiguity',input:'Arruma isso.',expect:{clarify:true}},
 {id:'history',category:'continuity',input:'Melhore isso.',messages:[{role:'user',content:'Crie um site para minha loja.'}],expect:{usedHistory:true,clarify:false}},
 {id:'concrete-question',category:'analysis',input:'Como funciona src/app.js?',expect:{clarify:false}},
 {id:'test-target',category:'coding',input:'Teste src/main.js.',expect:{clarify:false,targetIncludes:'src/main.js'}},
 {id:'local-only',category:'scope',input:'Corrija o código local sem publicar.',expect:{remoteAllowed:false}},
 {id:'image',category:'media',input:'Edite foto.png sem alterar o fundo.',expect:{targetIncludes:'foto.png',minConstraints:1}},
];
