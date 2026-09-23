# Black Numbers — Living Spec v1.0

Black Numbers é uma linguagem relacional experimental para descrever interfaces, animações e experiências interativas com evidência executável.

## Núcleo mínimo

```bn
node Core : diamond {
  fill: lime
  x: 0.5
  y: 0.5
  r: 36
}

relate Pulse : time -> Core.r {
  via: 36 + sin(t * 0.0024) * 10
}

screen Main {
  root: Core
  bg: ink
}
```

## Princípio de aprendizado

Nada vira “verdade” só porque veio de uma IA ou de uma imagem. O fluxo é:

`observed → hypothesis → compiled → tested → validated → consolidated`

Compilar prova sintaxe/estrutura. Teste prova comportamento. Validação semântica exige evidência adicional.
