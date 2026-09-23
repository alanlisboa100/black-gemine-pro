#!/usr/bin/env python3
from __future__ import annotations
import math, re
from dataclasses import dataclass, asdict
from typing import Any

BLOCK_RE = re.compile(r'(?:^|\n)\s*@?(node|relate|screen|js)\s+([A-Za-z_][\w]*)(?:\s*:\s*([^\{\n]+))?\s*\{([\s\S]*?)\}', re.M)
NAME_RE = re.compile(r'^[A-Za-z_][A-Za-z0-9_]*$')
TARGET_RE = re.compile(r'^([A-Za-z_][\w]*)\.([A-Za-z_][\w]*)$')
ALLOWED_NODE_KINDS = {'rect','circle','diamond','field','text','matrix','line','group'}
ALLOWED_PROPS = {'x','y','w','h','r','fill','stroke','opacity','text','size','rotate','scale','visible','cells','kind'}
ALLOWED_SCREEN_PROPS = {'root','bg','fps','layout'}

@dataclass
class CompileResult:
    ok: bool
    mode: str
    program: dict[str, Any] | None
    errors: list[str]
    checks: list[dict[str, Any]]
    score: float
    output: str


def _split_props(body: str) -> dict[str,str]:
    props = {}
    cleaned = re.sub(r'//.*$', '', body, flags=re.M)
    cleaned = re.sub(r'#.*$', '', cleaned, flags=re.M)
    for raw in re.split(r'[\n,;]+', cleaned):
        line = raw.strip()
        if not line: continue
        m = re.match(r'^([A-Za-z_][\w]*)\s*[:=]\s*(.+)$', line)
        if m:
            props[m.group(1)] = m.group(2).strip().strip('"\'')
    return props


def parse_bn(source: str, allow_legacy_js: bool=False) -> tuple[dict[str,Any], list[str]]:
    text = (source or '').replace('\r\n','\n')
    program = {'nodes':[], 'relates':[], 'screens':[], 'source':source or ''}
    errors=[]; found=0
    for m in BLOCK_RE.finditer(text):
        found += 1
        kind,name,typepart,body = m.group(1),m.group(2),(m.group(3) or '').strip(),m.group(4) or ''
        props=_split_props(body)
        if kind == 'js':
            if allow_legacy_js:
                program['legacy_js']=body.strip()
            else:
                errors.append(f"js {name}: bloco JavaScript legado bloqueado por segurança")
            continue
        if kind == 'node':
            nk=(typepart or props.get('kind') or 'rect').strip()
            if nk not in ALLOWED_NODE_KINDS: errors.append(f"node {name}: kind '{nk}' não suportado")
            unknown=[k for k in props if k not in ALLOWED_PROPS]
            if unknown: errors.append(f"node {name}: props desconhecidas: {', '.join(unknown)}")
            program['nodes'].append({'name':name,'kind':nk,'props':props})
        elif kind == 'relate':
            frm=props.get('from','time'); to=props.get('to','')
            am=re.match(r'(.+?)\s*->\s*(.+)', typepart)
            if am: frm,to=am.group(1).strip(),am.group(2).strip()
            if not to: errors.append(f"relate {name}: alvo ausente")
            program['relates'].append({'name':name,'from':frm,'to':to,'via':props.get('via','t')})
        elif kind == 'screen':
            root=props.get('root',''); bg=props.get('bg','ink'); layout=props.get('layout','free')
            try: fps=int(float(props.get('fps','60')))
            except Exception: fps=60; errors.append(f"screen {name}: fps inválido")
            program['screens'].append({'name':name,'root':root,'bg':bg,'fps':max(1,min(240,fps)),'layout':layout})
    if found == 0 and text.strip(): errors.append('nenhum bloco node/relate/screen reconhecido')
    return program, errors


def _safe_expr(expr: str, t: float=0.0) -> float:
    """Tiny arithmetic evaluator. No Python eval; parser supports numbers,t,+,-,*,/,%,(), sin/cos/abs/min/max."""
    tokens = re.findall(r'\d+(?:\.\d+)?|[A-Za-z_]+|[-+*/%(),]', expr.replace(' ',''))
    if ''.join(tokens) != expr.replace(' ',''):
        raise ValueError('token não permitido')
    i=0
    def peek(): return tokens[i] if i < len(tokens) else None
    def eat(tok=None):
        nonlocal i
        v=peek()
        if tok is not None and v != tok: raise ValueError(f'esperado {tok}')
        i+=1; return v
    def atom():
        v=peek()
        if v is None: raise ValueError('expressão incompleta')
        if v == '(':
            eat('('); x=exprn(); eat(')'); return x
        if v in ('+','-'):
            s=eat(); x=atom(); return x if s=='+' else -x
        if re.match(r'^\d',v): eat(); return float(v)
        if re.match(r'^[A-Za-z_]+$',v):
            name=eat()
            if name == 't': return float(t)
            if name == 'pi': return math.pi
            if peek() == '(':
                eat('('); args=[]
                if peek()!=')':
                    args.append(exprn())
                    while peek()==',': eat(','); args.append(exprn())
                eat(')')
                funcs={'sin':math.sin,'cos':math.cos,'abs':abs,'min':min,'max':max}
                if name not in funcs: raise ValueError(f'função {name} não permitida')
                return float(funcs[name](*args))
            raise ValueError(f'identificador {name} não permitido')
        raise ValueError(f'token inesperado {v}')
    def term():
        x=atom()
        while peek() in ('*','/','%'):
            op=eat(); y=atom()
            x = x*y if op=='*' else (x/y if op=='/' else x%y)
        return x
    def exprn():
        x=term()
        while peek() in ('+','-'):
            op=eat(); y=term(); x=x+y if op=='+' else x-y
        return x
    result=exprn()
    if i != len(tokens): raise ValueError('tokens restantes')
    if not math.isfinite(result): raise ValueError('resultado não finito')
    return result


def compile_bn(source: str, allow_legacy_js: bool=False) -> CompileResult:
    program, errors = parse_bn(source, allow_legacy_js=allow_legacy_js)
    checks=[]
    def ck(name, passed, detail): checks.append({'name':name,'pass':bool(passed),'detail':detail})
    nodes=program['nodes']; relates=program['relates']; screens=program['screens']; names={n['name'] for n in nodes}
    ck('has_nodes', bool(nodes), f'{len(nodes)} node(s)')
    ck('has_screen', bool(screens), f'{len(screens)} screen(s)')
    dup=len(names)!=len(nodes); ck('unique_nodes', not dup, 'nomes únicos' if not dup else 'nodes duplicados')
    for s in screens:
        ok=s['root'] in names
        ck(f"screen:{s['name']}:root", ok, f"root={s['root']}")
        if not ok: errors.append(f"screen {s['name']}: root '{s['root']}' inexistente")
    for r in relates:
        mt=TARGET_RE.match(r['to'])
        ok=bool(mt and mt.group(1) in names)
        ck(f"relate:{r['name']}:target", ok, r['to'])
        if not ok: errors.append(f"relate {r['name']}: alvo '{r['to']}' inválido")
        for tt in (0,16,1000,5000,16000):
            try: _safe_expr(r['via'],tt); finite=True
            except Exception as e: finite=False; err=str(e)
            ck(f"relate:{r['name']}:t{tt}", finite, 'finito' if finite else err)
            if not finite:
                errors.append(f"relate {r['name']}: via inválida ({err})"); break
    passed=sum(1 for c in checks if c['pass']); score=passed/max(1,len(checks))
    ok=(not errors) and bool(nodes) and bool(screens) and all(c['pass'] for c in checks)
    out='OK' if ok else '; '.join(dict.fromkeys(errors))
    return CompileResult(ok,'bn',program,errors,checks,round(score,4),out)


def program_summary(program: dict[str,Any]) -> dict[str,Any]:
    return {'nodes':len(program.get('nodes',[])), 'relates':len(program.get('relates',[])), 'screens':len(program.get('screens',[]))}
