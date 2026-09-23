from __future__ import annotations

from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Sequence

from .scenarios import SCENARIOS, DEFAULT_SCENARIO, scenario_plan


@dataclass
class PaintOperation:
    id: str
    stage: str
    tool: str
    action: str
    geometry: Dict[str, Any]
    stroke: Dict[str, Any]
    instruction: str
    validation: List[str]
    depends_on: List[str]
    retry: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


def _px(v: float, size: int) -> int:
    return int(round(v * size))


def scenario_paint_program(width: int, height: int, scenario_id: str = "minimal_studio") -> Dict[str, Any]:
    """Granular S01-S08 Paint plan for backgrounds.

    The plan intentionally describes actions at a low level so a local agent can
    translate them into Canvas/Paint operations without inventing composition from
    scratch. It protects a central subject zone by design.
    """
    scenario = SCENARIOS.get(scenario_id, DEFAULT_SCENARIO)
    ops: List[PaintOperation] = []

    def add(stage: str, n: int, tool: str, action: str, geometry: Dict[str, Any], stroke: Dict[str, Any], instruction: str,
            validation: Sequence[str], depends_on: Sequence[str] = (), max_retries: int = 2) -> str:
        op_id=f"{stage}.{n:02d}"
        ops.append(PaintOperation(
            id=op_id, stage=stage, tool=tool, action=action, geometry=geometry, stroke=stroke,
            instruction=instruction, validation=list(validation), depends_on=list(depends_on),
            retry={"max_retries":max_retries,"on_fail":"repair_scene_stage_before_advancing"},
        ))
        return op_id

    # S01 — layout and protected subject zone.
    a=add("S01",1,"selection","reserve_subject_safe_zone",
          {"bbox":[0.32,0.05,0.68,0.72],"clearance_ratio":scenario.subject_clearance},
          {"temporary":True},
          "Reserve uma zona limpa para cabeça, chifres e torso. Nenhum prop detalhado pode atravessar essa área.",
          ["upper face and horn zone stays free of high-detail props"])
    b=add("S01",2,"line","thirds_grid",{"vertical":[0.333,0.667],"horizontal":[0.333,0.667]},
          {"temporary":True,"width_ratio":0.001},
          "Marque terços. Concentre janela, estante, neon, flores ou arquitetura fora do centro facial.",
          ["main props land on side thirds"],[a])
    c=add("S01",3,"line","horizon_or_anchor",{"y":0.64,"scenario":scenario.id},
          {"temporary":True,"width_ratio":0.001},
          "Defina horizonte/linha estrutural principal sem cortar os olhos ou a base dos chifres.",
          ["perspective line does not cross face"],[b])

    # S02 — value masses first.
    d=add("S02",1,"fill","background_base",{"region":"full_canvas","palette":list(scenario.palette)},
          {"fill":"darkest_to_mid"},
          "Aplique primeiro a massa tonal de fundo. Nada de detalhes antes das grandes áreas de valor.",
          ["2-4 large value masses readable at thumbnail"],[c])
    e=add("S02",2,"soft_brush","subject_separation_halo",{"center":[0.50,0.30],"radius":[0.25,0.30]},
          {"opacity":[0.08,0.20],"tone":"lighter_than_background"},
          "Crie uma separação suave atrás da cabeça/chifres. Não desenhe um círculo visível; use luz difusa.",
          ["dark horns stay distinguishable from scene"],[d])

    # S03 — scenario-specific large structures.
    n=1
    deps=[e]
    def structure(tool, action, geometry, instruction, validation):
        nonlocal n, deps
        oid=add("S03",n,tool,action,geometry,{"width_ratio":0.0025},instruction,validation,deps)
        deps=[oid]; n+=1; return oid

    sid=scenario.id
    if sid=="minimal_studio":
        structure("soft_brush","studio_gradient",{"center":[0.50,0.38],"edge_vignette":0.18},"Mantenha o estúdio quase vazio: gradiente suave, sem objetos atrás do rosto.",["background remains simple"])
    elif sid=="gothic_bedroom":
        structure("rounded_rect","side_window",{"side":"seed_selected_third","bbox_options":[[0.08,0.12,0.33,0.56],[0.67,0.12,0.92,0.56]]},"Faça uma janela alta em um terço lateral, nunca atrás do topo da cabeça.",["window does not create tangent with horns"])
        structure("curve_fill","heavy_curtains",{"zones":[[0.00,0.00,0.18,0.78],[0.82,0.00,1.00,0.78]]},"Desenhe cortinas pesadas nas bordas para enquadrar para dentro.",["curtains frame, not cover subject"])
        structure("rounded_rect","bed_headboard",{"bbox":[0.20,0.60,0.80,0.82]},"Construa cabeceira/cama em massa baixa, abaixo do rosto.",["bed remains lower than shoulder focal area"])
    elif sid=="moonlit_cathedral":
        structure("curve","pointed_arches",{"count":3,"zones":"outer_and_midground"},"Construa arcos góticos verticais com centro visual limpo.",["arches guide upward without touching horns"])
        structure("rect_curve","stone_columns",{"x":[0.10,0.22,0.78,0.90]},"Adicione colunas em planos laterais, com menor contraste ao centro.",["columns establish depth"])
        structure("circle","rose_window",{"center":[0.50,0.18],"radius":0.08,"detail":"low"},"Sugira rosácea em baixo contraste; se conflitar com chifres, desloque para um terço.",["rose window does not merge with horns"])
    elif sid=="cyber_rain_city":
        structure("rect_fill","distant_towers",{"zones":[[0.00,0.18,0.34,0.64],[0.66,0.16,1.00,0.64]],"count_range":[7,14]},"Bloqueie prédios em silhuetas laterais antes de qualquer neon.",["center head zone remains quieter"])
        structure("line","perspective_street",{"vanishing_point":[0.50,0.62],"lower_edges":[0.18,0.82]},"Puxe a rua para um ponto de fuga abaixo do rosto.",["perspective leads toward subject"])
        structure("rect","abstract_neon_panels",{"zones":"side_thirds","max_count":6,"readable_text":False},"Adicione painéis neon abstratos nas laterais; não gere texto aleatório legível.",["neon does not cross face"])
    elif sid=="occult_library":
        structure("rect_fill","bookshelf_left_right",{"zones":[[0.02,0.16,0.27,0.88],[0.73,0.16,0.98,0.88]]},"Crie estantes laterais como blocos verticais; livros são detalhe secundário.",["shelves frame center"])
        structure("rounded_rect","desk_or_chair",{"bbox":[0.24,0.68,0.76,0.93]},"Posicione mesa/cadeira abaixo da linha do peito para dar profundidade.",["furniture does not hide garment identity"])
        structure("arch","rear_window",{"center":[0.50,0.20],"size":[0.22,0.30],"contrast":"low"},"Sugira janela/arco ao fundo com contraste reduzido atrás dos chifres.",["rear window subordinate to face"])
    elif sid=="dark_rose_garden":
        structure("arch","garden_arch",{"bbox":[0.20,0.12,0.80,0.82],"center_gap":[0.35,0.65]},"Faça arco vegetal/gótico amplo deixando uma abertura limpa no centro.",["arch frames subject"])
        structure("brush","rose_clusters",{"zones":"outer_thirds_and_lower_corners","cluster_count":[4,8]},"Agrupe rosas nas bordas em vez de espalhá-las igualmente.",["roses do not become equal-detail wallpaper"])
        structure("circle","moon",{"center":[0.72,0.17],"radius":0.075},"Coloque a lua fora do eixo da cabeça para criar assimetria elegante.",["moon does not touch horn tip"])
    elif sid=="throne_chamber":
        structure("line_rect","columns",{"zones":"outer_thirds","count":4},"Use colunas verticais laterais para escala e simetria arquitetônica.",["central silhouette stays clear"])
        structure("curve_fill","throne",{"bbox":[0.34,0.38,0.66,0.92],"detail":"medium"},"Construa o trono como massa atrás/abaixo do corpo, evitando picos junto aos chifres.",["throne supports, not replaces silhouette"])
        structure("polygon","carpet_perspective",{"top":[0.44,0.70,0.56,0.70],"bottom":[0.24,1.00,0.76,1.00]},"Use tapete em perspectiva para levar o olhar ao centro.",["carpet convergence points toward subject"])
    elif sid=="neon_lab":
        structure("rounded_rect","side_interface_panels",{"zones":[[0.04,0.20,0.28,0.62],[0.72,0.20,0.96,0.62]],"max_panels":4},"Crie painéis técnicos laterais, abstratos e sem texto aleatório.",["panels stay out of face zone"])
        structure("line","cables_and_frames",{"zones":"outer_edges","density":"low"},"Adicione cabos/molduras só nas bordas para profundidade tecnológica.",["no cable crosses face/horns"])
        structure("soft_brush","central_lab_halo",{"center":[0.50,0.34],"radius":[0.20,0.28]},"Use halo técnico suave para separar cabelo preto do laboratório escuro.",["horn silhouette readable"])
    elif sid=="moon_balcony":
        structure("circle","moon",{"center":[0.72,0.17],"radius":0.09},"Coloque lua em um terço superior, longe da cabeça.",["moon does not tangent horn"])
        structure("line","balcony_railing",{"y":0.76,"vertical_spacing":0.07},"Faça corrimão baixo; nenhuma barra vertical deve atravessar o rosto.",["railing below torso focal area"])
        structure("curve_fill","side_curtains",{"zones":"outer_edges"},"Use cortinas ou drapeado nas bordas como moldura suave.",["curtains point inward"])
    elif sid=="forest_shrine":
        structure("brush","tree_masses",{"zones":"outer_thirds","count_range":[12,20]},"Agrupe árvores nas laterais por massas, não por linhas repetitivas.",["central path remains open"])
        structure("polygon","path",{"vanishing_point":[0.50,0.62],"bottom_width":0.36},"Crie caminho em perspectiva para conduzir ao personagem.",["path points inward"])
        structure("line_rect","shrine_gate",{"bbox":[0.30,0.36,0.70,0.70],"contrast":"low"},"Sugira portal ao fundo com contraste baixo; mova se tocar os chifres.",["gate does not merge with horns"])

    # S04 lighting
    l=add("S04",1,"soft_brush","dominant_key_light",{"recipe":scenario.lighting,"direction":"scenario_defined"},
          {"opacity":[0.12,0.32]},
          "Aplique UMA direção principal de luz coerente com o cenário. Preserve preenchimento suave no rosto.",
          ["one dominant light direction","face remains readable"],deps)
    lr=add("S04",2,"soft_brush","hair_horn_rim",{"zone":"outer hair and horn edge opposite key"},
           {"opacity":[0.10,0.24],"width_ratio":0.006},
           "Adicione rim light curto para separar cabelo/chifres escuros do fundo escuro.",
           ["rim is selective, not full white outline"],[l])

    # S05 props
    pr=add("S05",1,"shape_detail","story_props",{"allowed":list(scenario.props),"placement":"side_thirds_and_lower_area","max_visible":6},
           {"detail":"medium_to_low"},
           "Adicione só props que reforçam a história do cenário. Prefira 2–6 objetos legíveis a dezenas de detalhes.",
           ["no prop covers face","no prop competes with eyes"],[lr])

    # S06 atmosphere
    at=add("S06",1,"spray_soft","atmosphere",{"allowed":list(scenario.atmosphere),"density":0.18,"avoid_zone":[0.36,0.18,0.64,0.64]},
           {"opacity":[0.03,0.16]},
           "Adicione atmosfera de forma esparsa. Reduza densidade sobre rosto, franja e chifres.",
           ["silhouette remains crisp enough","atmosphere has depth variation"],[pr])

    # S07 foreground framing
    fg=add("S07",1,"brush_fill","foreground_frame",{"allowed":list(scenario.foreground),"zones":"lower_corners_and_outer_edges"},
           {"opacity":[0.35,0.85],"softness":"medium"},
           "Use foreground mais escuro/suave nas bordas para fechar a composição e empurrar o olhar para dentro.",
           ["foreground does not cover face","frame points inward"],[at])

    # S08 scene gate
    add("S08",1,"verify","scene_thumbnail_gate",{"thumbnail_px":192}, {},
        "Valide o cenário em miniatura: rosto primeiro, chifres legíveis, 3 planos de profundidade, props subordinados e luz coerente.",
        ["face is first focal point","horns readable","depth planes distinct","lighting coherent","background lower-detail behind face"],[fg],max_retries=3)

    return {
        "id":"BLACKCORE_SCENARIO_PAINT_PROGRAM",
        "version":"2.0.0",
        "scenario_id":scenario.id,
        "canvas":{"width":int(width),"height":int(height),"coordinate_system":"normalized_0_1"},
        "operations":[x.to_dict() for x in ops],
        "operation_count":len(ops),
        "stage_order":[f"S{i:02d}" for i in range(1,9)],
        "hard_advance_rule":"do not execute next scene stage until current validation passes",
        "avoid":list(scenario.avoid),
    }


def misuki_paint_program(width: int, height: int, scenario_id: str = "minimal_studio") -> Dict[str, Any]:
    """Detailed machine-readable Paint execution program.

    v0.7 exposed one coarse operation per stage. v0.8 expands that bridge into
    small actions that a future GUI/Canvas executor can replay or a local model can
    translate into mouse/brush commands. Coordinates are normalized and accompanied
    by pixel examples for the active canvas.
    """

    ops: List[PaintOperation] = []
    scenario = SCENARIOS.get(scenario_id, DEFAULT_SCENARIO)

    def add(stage: str, n: int, tool: str, action: str, geometry: Dict[str, Any], stroke: Dict[str, Any], instruction: str,
            validation: Sequence[str], depends_on: Sequence[str] = (), max_retries: int = 2) -> str:
        op_id = f"{stage}.{n:02d}"
        ops.append(PaintOperation(
            id=op_id, stage=stage, tool=tool, action=action, geometry=geometry, stroke=stroke,
            instruction=instruction, validation=list(validation), depends_on=list(depends_on),
            retry={"max_retries": max_retries, "on_fail": "repair_current_stage_before_advancing"},
        ))
        return op_id

    # P01 — guides
    a=add("P01",1,"selection","reserve_safe_canvas",{"safe_margin":0.045},{},"Reserve uma margem segura de ~4,5% do canvas; não coloque chifres ou cabelo encostados na borda.",["all canonical parts fit inside safe area"])
    b=add("P01",2,"line","vertical_axis",{"p0":[0.50,0.10],"p1":[0.50,0.84],"px":[[_px(.50,width),_px(.10,height)],[_px(.50,width),_px(.84,height)]]},{"width_ratio":0.0014,"temporary":True,"color":"#9AA6B2"},"Trace o eixo central vertical bem leve.",["axis is centered"],[a])
    c=add("P01",3,"ellipse","face_construction",{"bbox":[0.365,0.285,0.635,0.625]},{"width_ratio":0.0016,"temporary":True},"Marque a construção da cabeça como oval suave, nunca como pentágono/telhado.",["top arc is curved","chin zone has room"],[b])
    d=add("P01",4,"line","eye_guide",{"y":0.445,"x0":0.385,"x1":0.615},{"width_ratio":0.0012,"temporary":True},"Marque a linha dos olhos perto de 44–46% do canvas neste enquadramento.",["eye guide is level"],[c])
    add("P01",5,"line","mouth_neck_guides",{"mouth_y":0.565,"neck_y":[0.61,0.72]},{"width_ratio":0.0010,"temporary":True},"Marque discretamente boca e início/fim do pescoço.",["guides do not become final dark lines"],[d])

    # P02 — head and horn axes
    a=add("P02",1,"curve","left_jaw",{"points":[[0.50,0.285],[0.40,0.29],[0.36,0.46],[0.42,0.59],[0.50,0.625]]},{"width_ratio":0.0027,"color":"#111111"},"Desenhe metade esquerda da cabeça com curva contínua: têmpora → bochecha → mandíbula → queixo.",["jaw not square","chin not too long"])
    b=add("P02",2,"curve","right_jaw",{"points":[[0.50,0.285],[0.60,0.29],[0.64,0.46],[0.58,0.59],[0.50,0.625]]},{"width_ratio":0.0027,"color":"#111111"},"Repita do lado direito mantendo peso visual, não simetria mecânica perfeita.",["face width/height within canonical range"],[a])
    c=add("P02",3,"curve","left_horn_axis",{"points":[[0.42,0.30],[0.33,0.22],[0.31,0.10],[0.39,0.05]]},{"width_ratio":0.0014,"temporary":True},"Trace o eixo do chifre esquerdo: saia lateralmente, abra para fora e só depois suba.",["root touches crown zone","axis curves, not vertical"])
    add("P02",4,"curve","right_horn_axis",{"points":[[0.58,0.30],[0.67,0.22],[0.69,0.10],[0.61,0.05]]},{"width_ratio":0.0014,"temporary":True},"Trace o eixo do chifre direito com massa equivalente ao esquerdo.",["two horns","balanced root height"],[c])

    # P03 — hair mass
    a=add("P03",1,"curve","hair_outer_left",{"points":[[0.50,0.155],[0.28,0.16],[0.18,0.35],[0.19,0.70],[0.27,0.99]]},{"width_ratio":0.0030,"color":"#0C0C10"},"Defina primeiro a borda externa esquerda do cabelo como uma massa longa e suave.",["no straight roof","no comb lines"])
    b=add("P03",2,"curve","hair_outer_right",{"points":[[0.50,0.155],[0.72,0.16],[0.82,0.35],[0.81,0.70],[0.73,0.99]]},{"width_ratio":0.0030,"color":"#0C0C10"},"Defina a borda externa direita com fluxo semelhante, mas não copiada pixel a pixel.",["hair reaches clearly below shoulders"],[a])
    c=add("P03",3,"fill","fill_rear_hair",{"region":"between outer hair contours behind face"},{"fill":"#0C0C10"},"Preencha a massa traseira do cabelo de preto antes de desenhar qualquer fio interno.",["hair reads as one large mass","face area remains protected"],[b])
    add("P03",4,"eraser","open_face_window",{"bbox":[0.36,0.285,0.64,0.625]},{"size_ratio":0.01},"Limpe o interior do rosto: a pele deve continuar clara e legível.",["face negative space >= 65%"],[c])

    # P04 — facial features
    a=add("P04",1,"curve","left_upper_lid",{"center":[0.445,0.445],"width_face_ratio":0.235},{"width_ratio":0.0040},"Desenhe a pálpebra superior esquerda mais grossa e levemente alongada.",["upper lid heavier than lower"])
    b=add("P04",2,"curve","right_upper_lid",{"center":[0.555,0.445],"width_face_ratio":0.235},{"width_ratio":0.0040},"Desenhe a pálpebra superior direita na mesma altura visual.",["eyes aligned"],[a])
    c=add("P04",3,"ellipse","irises",{"centers":[[0.445,0.455],[0.555,0.455]],"radius_eye_ratio":0.62},{"outline_ratio":0.0018,"fill":"#ECECF0"},"Crie as íris grandes o suficiente para leitura anime, sem virar olhos chibi circulares.",["iris readable at thumbnail"],[b])
    d=add("P04",4,"fill","pupils_highlights",{"centers":[[0.445,0.458],[0.555,0.458]],"highlight":"upper-inner"},{"fill":"#111111","highlight":"#FFFFFF"},"Preencha pupilas e reserve um brilho principal pequeno.",["highlight direction consistent"],[c])
    e=add("P04",5,"curve","brows",{"y":0.405,"style":"thin_controlled"},{"width_ratio":0.0017},"Faça sobrancelhas finas e controladas; expressão calma/confiante por padrão.",["brows do not overpower eyes"],[d])
    f=add("P04",6,"pencil","nose",{"x":0.50,"y_range":[0.49,0.535]},{"width_ratio":0.0013},"Nariz mínimo: 1–2 traços curtos, sem contorno completo.",["nose subordinate to eyes"],[e])
    add("P04",7,"curve","mouth",{"center":[0.50,0.565],"width_canvas":[0.05,0.075]},{"width_ratio":0.0018},"Boca pequena, curva sutil. Evite uma linha longa e dura.",["mouth width smaller than combined eye span"],[f])

    # P05 neck/choker/shoulders
    a=add("P05",1,"line","neck_sides",{"left":[[0.46,0.61],[0.465,0.72]],"right":[[0.54,0.61],[0.535,0.72]]},{"width_ratio":0.0022},"Desça duas linhas suaves para o pescoço; não alongue demais.",["neck is slender","neck length balanced"])
    b=add("P05",2,"rounded_rect","choker",{"bbox":[0.455,0.672,0.545,0.698]},{"fill":"#111111"},"Faça o choker acompanhando o pescoço; ele é uma âncora canônica.",["choker attached to neck"],[a])
    c=add("P05",3,"curve","shoulders",{"left":[[0.465,0.715],[0.36,0.73],[0.27,0.82]],"right":[[0.535,0.715],[0.64,0.73],[0.73,0.82]]},{"width_ratio":0.0026},"Abra os ombros em queda feminina suave; não crie um retângulo.",["shoulders slope softly"],[b])
    add("P05",4,"shape","choker_jewel_anchor",{"center":[0.50,0.715],"shape":"diamond_or_drop"},{"outline_ratio":0.0012},"Adicione uma joia pequena abaixo do choker como ponto central.",["detail remains smaller than mouth/eye focal area"],[c])

    # P06 outfit
    a=add("P06",1,"curve","corset_outer",{"bbox":[0.20,0.71,0.80,1.02],"shape":"curved_bust_waist"},{"width_ratio":0.0030},"Construa a roupa por silhueta curva de busto/cintura; nunca comece por barras horizontais.",["torso not rectangular"])
    b=add("P06",2,"fill","outfit_black_mass",{"region":"inside corset silhouette"},{"fill":"#111111"},"Preencha a grande massa preta da roupa.",["body remains shaped, not a black box"],[a])
    c=add("P06",3,"curve","neckline",{"style":"sweetheart_or_lace","y_range":[0.73,0.82]},{"width_ratio":0.0020,"color":"#E6E6EA"},"Abra um decote/linha de renda legível para quebrar o bloco preto.",["neckline readable"],[b])
    d=add("P06",4,"curve","corset_seams",{"count":2,"direction":"vertical_curved"},{"width_ratio":0.0014,"color":"#A5A5AF"},"Adicione duas costuras curvas verticais; nada de três barras paralelas.",["seams follow torso volume"],[c])
    add("P06",5,"detail","gothic_anchor",{"allowed":["lace","strap","small buckle","jewel"]},{"micro_width_ratio":0.0013},"Adicione só 1–3 detalhes góticos de alto valor visual.",["details support identity without clutter"],[d])

    # P07 horns
    a=add("P07",1,"curve_fill","left_horn_volume",{"axis":[[0.42,0.30],[0.33,0.22],[0.31,0.10],[0.39,0.05]],"base_radius":0.028,"tip_radius":0.0028},{"fill":"#0C0C10"},"Expanda o eixo esquerdo para um volume grosso na base e fino na ponta.",["root integrated","progressive taper"])
    b=add("P07",2,"curve_fill","right_horn_volume",{"axis":[[0.58,0.30],[0.67,0.22],[0.69,0.10],[0.61,0.05]],"base_radius":0.028,"tip_radius":0.0028},{"fill":"#0C0C10"},"Expanda o eixo direito com a mesma lógica de volume.",["visual mass balanced"],[a])
    c=add("P07",3,"line","horn_ridges",{"count_range":[5,9],"orientation":"cross_axis"},{"width_ratio":0.0013,"color":"#686872"},"Faça 5–9 marcas de segmento por chifre, espaçadas conforme o volume.",["not candy-striping","segments reduce toward tip"],[b])
    add("P07",4,"line","horn_rim",{"side":"outer_quarter"},{"width_ratio":0.0010,"color":"#FFFFFF"},"Use um filete de luz curto onde chifre e cabelo se fundem.",["horn silhouette readable at thumbnail"],[c])

    # P08 fringe and line hierarchy
    a=add("P08",1,"curve_fill","major_fringe_locks",{"count":5,"root_zone":[0.385,0.615,0.20],"end_y":[0.44,0.47]},{"fill":"#0C0C10"},"Crie 5 mechas principais da franja como formas preenchidas e afuniladas.",["3-7 major locks","no crown triangle"])
    b=add("P08",2,"curve","side_locks",{"count_per_side":2,"end_y":[0.62,0.70]},{"width_ratio":[0.006,0.010]},"Desça 1–2 mechas grossas de enquadramento em cada lado do rosto.",["both eyes remain visible enough"],[a])
    c=add("P08",3,"curve","selective_internal_hair",{"max_total":10,"zones":"outer sides only"},{"width_ratio":0.00125,"color":"#484852"},"Só agora adicione no máximo ~10 linhas internas seletivas. Não faça pente de linhas paralelas.",["parallel line count <= 16"],[b])
    add("P08",4,"verify","line_weight_hierarchy",{"outer":1.0,"facial":0.65,"internal":0.42},{},"Confirme hierarquia: contorno externo > olhos/chifres > fios/detalhes.",["line weights are not equal everywhere"],[c])

    # P09 black masses
    a=add("P09",1,"fill","commit_hair_black",{"region":"hair"},{"fill":"#000000"},"Uniformize a massa principal do cabelo sem apagar mechas grandes.",["face stays open"])
    b=add("P09",2,"fill","commit_horns_black",{"region":"horns"},{"fill":"#09090B"},"Feche os chifres em preto profundo preservando filetes de separação.",["horn/hair boundaries readable"],[a])
    c=add("P09",3,"fill","commit_outfit_black",{"region":"outfit"},{"fill":"#111111"},"Feche a roupa em preto mantendo decote/costuras visíveis.",["outfit retains anatomy"],[b])
    add("P09",4,"eraser","protect_face_negative_space",{"bbox":[0.37,0.35,0.63,0.61]},{"size_ratio":0.006},"Limpe invasões de preto no rosto e ao redor dos olhos.",["face negative space >= 65%"],[c])

    # P10 tonal separation
    a=add("P10",1,"soft_brush","cheek_jaw_shadow",{"zones":["lower cheeks","under fringe","under chin"]},{"tone":"#D9D9D9","opacity":[0.15,0.28]},"Use cinza claro apenas para explicar plano, nunca para sujar o rosto inteiro.",["skin remains mostly light"])
    b=add("P10",2,"soft_brush","hair_horn_separation",{"zones":["horn roots","outer hair highlights"]},{"tone":"#8F8F8F","opacity":[0.18,0.35]},"Separe chifre e cabelo com cinza/rim mínimo.",["horn silhouette stays readable"],[a])
    add("P10",3,"verify","thumbnail_tonal_read",{"thumbnail_px":192},{},"Veja em miniatura: rosto deve ser claro, cabelo/chifres/roupa devem formar moldura escura.",["face is first focal point"],[b])

    # P11 details
    a=add("P11",1,"ink","lashes",{"count_per_eye":[2,4]},{"width_ratio":0.0017},"Refine cílios externos; não transforme o olho em bloco pesado.",["eyes remain elegant"])
    b=add("P11",2,"detail","lace",{"count":9,"location":"neckline"},{"width_ratio":0.0011,"color":"#DADAE0"},"Adicione poucas curvas de renda na borda do decote.",["lace readable but secondary"],[a])
    c=add("P11",3,"detail","jewel",{"center":[0.50,0.715],"shape":"diamond","size":0.011},{"fill":"#FFFFFF","outline":"#686872"},"Finalize a joia central.",["jewel centered or deliberately offset"],[b])
    add("P11",4,"eraser","cleanup",{"scope":"stray marks and construction guides"},{"size_ratio":0.004},"Apague guias e marcas que não pertencem ao line art final.",["no temporary guide remains"],[c])

    # gates
    add("P12",1,"verify","thumbnail_gate",{"thumbnail_px":192},{},"Reduza mentalmente/visualmente para ~192 px. Se não reconhecer pelos chifres+cabelo+rosto, pare e repare.",["Misuki readable at thumbnail","face visible","horns readable"],max_retries=3)
    add("P13",1,"verify","structural_fidelity_gate",{"minimum_score":82},{},"Calcule fidelidade estrutural. Se <82 ou houver falha crítica, NÃO faça export final.",["score >= 82","no critical failure"],max_retries=3)
    add("P14",1,"export","save_approved_png",{"format":"PNG","preserve_checkpoints":True},{},"Exporte somente se P12/P13 passaram. Salve também o plano e checkpoints.",["approved render only"],max_retries=0)

    scene_program = scenario_paint_program(width, height, scenario.id)

    return {
        "id":"BLACKCORE_MISUKI_PAINT_PROGRAM",
        "version":"4.0.0",
        "canvas":{
            "width":int(width),"height":int(height),"coordinate_system":"normalized_0_1",
            "reference_width":1600,
            "line_scale_formula":"effective_px = width_ratio * canvas_width",
        },
        "scenario_id":scenario.id,
        "scenario_plan":scenario_plan(scenario,character_present=True),
        "scene_program":scene_program,
        "scene_operations":scene_program["operations"],
        "scene_operation_count":scene_program["operation_count"],
        "operations":[x.to_dict() for x in ops],
        "operation_count":len(ops),
        "total_operation_count":len(ops)+scene_program["operation_count"],
        "stage_order":[f"P{i:02d}" for i in range(1,15)],
        "hard_advance_rule":"do not execute any operation from the next stage until the current stage validation passes",
        "repair_order":["silhouette","horns","hair","face","outfit","tone","detail"],
        "negative_rules":[
            "no roof-shaped hair top",
            "no comb-like parallel hair lines",
            "no rectangular torso block",
            "no horizontal-bar outfit placeholder",
            "no detached horn roots",
            "no equal line weight everywhere",
            "no detail pass before silhouette/head/horns/hair pass",
            "no export after a failed P12/P13 gate",
        ],
    }
