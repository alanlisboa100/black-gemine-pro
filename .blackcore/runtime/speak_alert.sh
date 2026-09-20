#!/usr/bin/env bash
TEXT="Atenção! Alerta crítico de geopolítica e segurança global emitido pelo BLACKCORE.

Nas últimas horas, a Rússia intensificou os bombardeios estratégicos contra a infraestrutura energética e centros urbanos na Ucrânia, empregando enxames de drones e mísseis hipersônicos.

Paralelamente, o debate sobre um conflito direto com a Europa atingiu o nível mais alto desde a Guerra Fria. Líderes de potências europeias e da OTAN, incluindo França, Polônia, Reino Unido e Alemanha, alertam para o risco iminente de expansão das hostilidades, acelerando o rearmamento militar, fortificando o flanco leste e advertindo que a segurança de todo o continente europeu está em jogo.

Moscou, por sua vez, reforça ameaças assimétricas e revisões em sua doutrina estratégica. O cenário permanece em estado de vigilância máxima e alerta crítico."

# Toast visual de aviso imediato
termux-toast -b "#8B0000" -c "#FFFFFF" -g center "🚨 ALERTA CRÍTICO: Ataques da Rússia & Tensão na Europa" 2>/dev/null || true

# Execução da narração via voz
$HOME/.local/bin/blackcore-voice -l pt-BR -r 1.0 "$TEXT"
