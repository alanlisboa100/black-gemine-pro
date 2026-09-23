#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, math
from pathlib import Path
from collections import Counter
from bnlib import *

def scan_image(path:str,width=32,height=18):
    try: from PIL import Image
    except Exception as e: raise RuntimeError('Pillow ausente. Instale python-pillow no Termux.') from e
    p=Path(path).expanduser().resolve(); im=Image.open(p).convert('RGBA'); ow,oh=im.size; small=im.resize((width,height))
    pix=small.load(); px=[pix[x,y] for y in range(height) for x in range(width)]; lum=[.2126*r+.7152*g+.0722*b for r,g,b,a in px]
    contrast=(max(lum)-min(lum))/255 if lum else 0
    # buckets + edge energy + focal center, explicitly observational
    buckets=Counter((r//32*32,g//32*32,b//32*32) for r,g,b,a in px)
    dom=[]
    for (r,g,b),n in buckets.most_common(6): dom.append({'color':f'#{r:02x}{g:02x}{b:02x}','percent':round(100*n/max(1,len(px)),1)})
    total=sum(lum)+1e-9; sx=sy=0
    for y in range(height):
        for x in range(width):
            l=lum[y*width+x]; sx+=x*l; sy+=y*l
    focal=[round((sx/total)/max(1,width-1),3),round((sy/total)/max(1,height-1),3)]
    edge=0
    for y in range(height):
      for x in range(width):
        cur=lum[y*width+x]
        if x+1<width: edge+=abs(cur-lum[y*width+x+1])
        if y+1<height: edge+=abs(cur-lum[(y+1)*width+x])
    edge_density=round(edge/(255*max(1,width*height*2)),4)
    return {'source_path':str(p),'original_dimensions':[ow,oh],'matrix_dimensions':[width,height],'dominant_colors':dom,'focal_center':focal,'contrast':round(contrast,4),'edge_density':edge_density,'status':'observed','confidence':0.35}

def feed(obs,task='Observação visual'):
    con=db(); cur=con.execute('INSERT INTO visual_observations(source_path,width,height,features,status,confidence,created_at) VALUES(?,?,?,?,?,?,?)',(obs['source_path'],obs['matrix_dimensions'][0],obs['matrix_dimensions'][1],json.dumps(obs,ensure_ascii=False),'observed',0.35,now()))
    kid=upsert_knowledge(con,'vision_observation',task,json.dumps({k:v for k,v in obs.items() if k!='matrix_rgba'},ensure_ascii=False),0.35,'vision-scanner',0.35,status='observed')
    event(con,'vision_observed',task,{'observation_id':cur.lastrowid,'knowledge_id':kid}); con.close(); return {'observation_id':cur.lastrowid,'knowledge_id':kid,'verified':False}

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('image'); ap.add_argument('--width',type=int,default=32); ap.add_argument('--height',type=int,default=18); ap.add_argument('--feed',action='store_true'); ap.add_argument('--task',default='Observação visual'); a=ap.parse_args(); o=scan_image(a.image,a.width,a.height); print(json.dumps(o,indent=2,ensure_ascii=False));
    if a.feed: print(json.dumps(feed(o,a.task),indent=2,ensure_ascii=False))
if __name__=='__main__': main()
