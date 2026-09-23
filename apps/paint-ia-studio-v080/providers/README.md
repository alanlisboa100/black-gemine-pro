# Providers externos (opcionais)

O núcleo `blackcore_visual/` é local e não depende de API de geração de imagem.

`external_flux_pollinations.py` foi separado porque usa um serviço externo. Ele não é importado pelo Visual Engine e não participa da geração local. Use apenas quando quiser deliberadamente um provider remoto.
