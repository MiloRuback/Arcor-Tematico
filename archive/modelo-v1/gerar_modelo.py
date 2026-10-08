"""Reconstrói a exposição ARCOR em metros, Y para cima, frente em +Z.

Python 3.10+; pip install numpy Pillow trimesh
Executar: python assets/models/source/gerar_modelo.py
Sem Blender. Texturas procedurais e geometria real; GLB autossuficiente.
"""
from pathlib import Path
import sys, math, json, io, random, struct
import numpy as np
ROOT = Path(__file__).resolve().parents[3]
if (ROOT / '.model-tools').exists(): sys.path.insert(0, str(ROOT / '.model-tools'))
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import trimesh
from trimesh.visual.material import PBRMaterial
from trimesh.visual.texture import TextureVisuals

def vertex_normals_numpy(vertex_count, faces, face_normals, face_angles, **kwargs):
    """Angle-weighted normals, without requiring SciPy sparse matrices."""
    normals=np.zeros((vertex_count,3),dtype=float)
    for k in range(3):np.add.at(normals,faces[:,k],face_normals*face_angles[:,k,None])
    lengths=np.linalg.norm(normals,axis=1)
    normals[lengths>1e-12]/=lengths[lengths>1e-12,None]
    normals[lengths<=1e-12]=[0,1,0]
    return normals

trimesh.geometry.weighted_vertex_normals=vertex_normals_numpy

OUT = ROOT / 'assets/models'
TEX = OUT / 'textures'
TEX.mkdir(parents=True, exist_ok=True)
random.seed(27)
rng = np.random.default_rng(27)
scene = trimesh.Scene(base_frame='Scene')
materials = {}
batches = {}
counts = {}
texture_info = []
PI = math.pi

def font(size, bold=False, italic=False):
    names = ['arialbi.ttf' if italic else 'arialbd.ttf' if bold else 'arial.ttf', 'DejaVuSans.ttf']
    for n in names:
        for path in [Path('C:/Windows/Fonts')/n, Path('/usr/share/fonts/truetype/dejavu')/n]:
            if path.exists(): return ImageFont.truetype(str(path), size)
    return ImageFont.load_default(size=size)

def texture(name, im):
    im.save(TEX / (name+'.png'))
    texture_info.append({'name':name, 'resolution':list(im.size)})
    return im

def mat(name, color, rough=.5, metal=0, tex=None, emission=None, alpha=False):
    opts = dict(name=name, baseColorFactor=list(color), metallicFactor=metal, roughnessFactor=rough,
                doubleSided=False)
    if tex is not None: opts['baseColorTexture']=tex
    if emission is not None: opts['emissiveFactor']=emission
    if alpha: opts.update(alphaMode='BLEND', doubleSided=True)
    materials[name]=PBRMaterial(**opts)
    return name

def make_textures():
    n=512; yy,xx=np.mgrid[:n,:n]
    noise=rng.normal(0,1,(n,n))
    grain=np.sin(xx*.32+np.sin(yy*.012)*3)+.45*np.sin(xx*1.2+np.sin(yy*.01))
    wood=np.clip(np.array([158,102,55])+grain[...,None]*np.array([15,12,8])+noise[...,None]*3,0,255).astype('uint8')
    mat('Carvalho acetinado',[255]*4,.66,tex=texture('madeira-carvalho',Image.fromarray(wood)))
    grain2=rng.normal(0,14,(n,n))+5*np.sin(xx*.27)*np.sin(yy*.18)
    peanut=np.clip(np.array([200,140,64])+grain2[...,None]*np.array([1,.8,.45]),0,255).astype('uint8')
    mat('Amendoim torrado',[255]*4,.83,tex=texture('amendoim-torrado',Image.fromarray(peanut)))
    ice=Image.new('RGB',(512,512),(44,157,192)); d=ImageDraw.Draw(ice)
    for k in range(60):
        x,y=random.randrange(512),random.randrange(512)
        points=[(x,y)]
        for j in range(5):
            x+=random.randrange(-40,60); y+=random.randrange(10,70);points.append((x,y))
        d.line(points,fill=random.choice([(169,238,249),(84,190,212),(209,247,250)]),width=random.choice([1,2,3]))
    mat('Gelo com fissuras',[255]*4,.22,.16,texture('gelo-fissuras',ice))
    marble=np.clip(np.array([214,217,217])+(3*np.sin((xx+yy*.35)*.04)+noise)[...,None],0,255).astype('uint8')
    mat('Piso mineral',[255]*4,.36,.12,texture('piso-mineral',Image.fromarray(marble)))

def label(name, text, fg, bg, size=(1024,256), italic=False, subtitle=None):
    im=Image.new('RGB',size,bg);d=ImageDraw.Draw(im)
    fs=int(size[1]*.58)
    while d.textbbox((0,0),text,font=font(fs,True,italic))[2]>size[0]*.92: fs-=2
    d.text((size[0]/2,size[1]*(.38 if subtitle else .46)),text,font=font(fs,True,italic),fill=fg,anchor='mm',stroke_width=1)
    if subtitle:d.text((size[0]/2,size[1]*.82),subtitle,font=font(int(size[1]*.135)),fill=fg,anchor='mm')
    return mat(name,[255]*4,.4,tex=texture(name,im))

def group(name,parent='Scene'):
    scene.graph.update(frame_to=name,frame_from=parent,matrix=np.eye(4))
    return name

def uvmesh(m):
    if not hasattr(m.visual,'uv') or m.visual.uv is None:
        v=m.vertices; normals=m.vertex_normals
        axis=np.argmax(np.abs(normals),axis=1)
        uv=np.zeros((len(v),2))
        for a,dims in enumerate([(2,1),(0,2),(0,1)]):
            mask=axis==a;uv[mask]=v[mask][:,dims]
        m.visual=TextureVisuals(uv=uv)
    return m

def add(name,m,material,parent,pos=(0,0,0),scale=None,rot=None):
    m=m.copy();uvmesh(m)
    if scale is not None:m.apply_scale(scale)
    if rot is not None:
        axis,angle=rot;m.apply_transform(trimesh.transformations.rotation_matrix(angle,axis))
    m.apply_translation(pos)
    batches.setdefault((parent,material),[]).append(m)
    counts[parent]=counts.get(parent,0)+1

def box(name,pos,size,material,parent):
    add(name,trimesh.creation.box(extents=size),material,parent,pos)

SPHERE=trimesh.creation.uv_sphere(radius=1,count=[6,8])
KERNEL=trimesh.creation.icosphere(subdivisions=1,radius=1)
kv=KERNEL.vertices.copy()
kv[:,[0,2]]*= (.84+.16*np.abs(kv[:,1]))[:,None]
KERNEL.vertices=kv
def ell(name,pos,size,material,parent,angle=0):
    m=(KERNEL if name=='Grao de amendoim' else SPHERE).copy()
    v=m.vertices; uv=np.stack((np.arctan2(v[:,2],v[:,0])/(2*PI)+.5,np.arccos(np.clip(v[:,1],-1,1))/PI),axis=1)
    m.visual=TextureVisuals(uv=uv)
    add(name,m,material,parent,pos,size,([0,0,1],angle))

def cyl(name,pos,r,depth,material,parent,sections=32):
    m=trimesh.creation.cylinder(radius=r,height=depth,sections=sections)
    add(name,m,material,parent,pos,rot=([1,0,0],PI/2))

def tube(name,points,r,material,parent,sections=8):
    pts=np.array(points,float);verts=[];faces=[];uv=[]
    for i,p in enumerate(pts):
        tangent=pts[min(i+1,len(pts)-1)]-pts[max(0,i-1)];tangent/=np.linalg.norm(tangent)
        ref=np.array([0,1,0]) if abs(tangent[1])<.92 else np.array([1,0,0])
        u=np.cross(tangent,ref);u/=np.linalg.norm(u);v=np.cross(tangent,u)
        for j in range(sections):
            a=j*2*PI/sections;verts.append(p+r*(u*np.cos(a)+v*np.sin(a)));uv.append([j/sections,i/5])
        if i:
            for j in range(sections):
                a=(i-1)*sections+j;b=(i-1)*sections+(j+1)%sections;c=i*sections+j;d=i*sections+(j+1)%sections
                faces.extend([[a,b,c],[b,d,c]])
    m=trimesh.Trimesh(vertices=verts,faces=faces,process=False);m.visual=TextureVisuals(uv=uv)
    add(name,m,material,parent)

def ring(name,x,y,z,r,material,parent,start=0,end=2*PI,thick=.035):
    tube(name,[(x+r*np.cos(t),y,z+r*np.sin(t)) for t in np.linspace(start,end,max(8,int(abs(end-start)*18)))],thick,material,parent)

def arcwall(name,x,z,r,thick,y,h,start,end,material,parent):
    vs=[];fs=[];uv=[];n=max(8,int((end-start)*22))
    for i,t in enumerate(np.linspace(start,end,n+1)):
        for rr,yy in [(r-thick/2,y),(r+thick/2,y),(r-thick/2,y+h),(r+thick/2,y+h)]:
            vs.append([x+rr*np.cos(t),yy,z+rr*np.sin(t)]);uv.append([i/n*4,(yy-y)/h])
        if i:
            a=(i-1)*4;b=i*4
            for q,w in [(0,1),(1,3),(3,2),(2,0)]: fs.extend([[a+q,b+q,a+w],[a+w,b+q,b+w]])
    fs.extend([[0,2,1],[1,2,3],[n*4,n*4+1,n*4+2],[n*4+1,n*4+3,n*4+2]])
    m=trimesh.Trimesh(vertices=vs,faces=fs,process=False)
    if m.volume<0:m.invert()
    m.visual=TextureVisuals(uv=uv)
    add(name,m,material,parent)

def rounded(name,pos,w,h,d,material,parent,r=.12):
    p=[]
    for cx,cy,a in [(w/2-r,h/2-r,0),(-w/2+r,h/2-r,90),(-w/2+r,-h/2+r,180),(w/2-r,-h/2+r,270)]:
        for t in np.linspace(a,a+90,7):p.append([cx+r*np.cos(t*PI/180),cy+r*np.sin(t*PI/180)])
    # Explicit fan triangulation for this convex rounded rectangle.
    n=len(p);verts=[[x,y,z] for z in [-d/2,d/2] for x,y in p];verts.extend([[0,0,-d/2],[0,0,d/2]])
    faces=[]
    for i in range(n):
        j=(i+1)%n;faces.extend([[2*n,j,i],[2*n+1,n+i,n+j],[i,j,n+i],[j,n+j,n+i]])
    m=trimesh.Trimesh(vertices=verts,faces=faces,process=False)
    if m.volume<0:m.invert()
    add(name,m,material,parent,pos)

def sign(name,pos,w,h,material,parent):
    # Sign is a thick modeled board plus a UV-mapped front, not the scene itself.
    rounded(name+' suporte',pos,w,h,.07,'Creme',parent)
    v=[[-w/2,-h/2,.039],[w/2,-h/2,.039],[w/2,h/2,.039],[-w/2,h/2,.039]]
    m=trimesh.Trimesh(vertices=v,faces=[[0,1,2],[0,2,3]],process=False)
    m.visual=TextureVisuals(uv=[[0,0],[1,0],[1,1],[0,1]])
    add(name,m,material,parent,pos)

def heart_outline(t): return np.array([16*np.sin(t)**3,(13*np.cos(t)-5*np.cos(2*t)-2*np.cos(3*t)-np.cos(4*t)+2.5)]) / 16

def heart(name,pos,size,material,parent,peanuts=False):
    vs=[];fs=[];uv=[];nu=64;nv=24
    for j in range(nv+1):
        phi=PI*j/nv;r=np.sin(phi)
        for i in range(nu+1):
            p=heart_outline(i*2*PI/nu)
            vs.append([p[0]*r,p[1]*r,.39*np.cos(phi)]);uv.append([i/nu,j/nv])
    for j in range(nv):
        for i in range(nu):
            a=j*(nu+1)+i;b=a+nu+1;fs.extend([[a,b,a+1],[a+1,b,b+1]])
    m=trimesh.Trimesh(vertices=vs,faces=fs,process=False)
    if m.volume<0:m.invert()
    m.visual=TextureVisuals(uv=uv)
    add(name,m,material,parent,pos,[size]*3)
    if peanuts:
        # Equal-area-ish rings of modeled peanut kernels around the whole volume.
        for j in range(1,27):
            phi=PI*j/27;r=np.sin(phi);num=max(8,round(94*r))
            for i in range(num):
                t=2*PI*(i+.5*(j%2))/num;p=heart_outline(t)
                center=np.array(pos)+size*np.array([p[0]*r,p[1]*r,.39*np.cos(phi)])
                s=random.uniform(.92,1.10)
                ell('Grao de amendoim',center,[.078*s,.103*s,.064*s],'Amendoim torrado',parent,random.uniform(-.9,.9))

def shopping():
    g=group('Shopping');floor=group('Floor',g);env=group('Environment',g);entrance=group('Entrance',g)
    box('Base do shopping',(0,-.16,0),(22,.30,10),'Piso mineral',floor)
    for x in np.arange(-11,11.1,1.5):box('Junta do porcelanato',(x,-.003,0),(.014,.007,10),'Juntas',floor)
    for z in np.arange(-5,5.1,1.5):box('Junta do porcelanato',(0,-.003,z),(22,.007,.014),'Juntas',floor)
    box('Parede posterior',(0,2.5,-4.9),(22,5,.16),'Parede',entrance)
    box('Faixa superior',(0,4.6,-4.72),(22,.25,.22),'Metal champagne',entrance)
    for x in [-10.6,-3.4,3.4,10.6]:
        cyl('Coluna circular',(x,2.45,-4.15),.24,4.9,'Parede',env)
        cyl('Rodape da coluna',(x,.12,-4.15),.27,.24,'Metal champagne',env)
    for x in [-7,0,7]:
        box('Vidro da entrada',(x,2.2,-4.72),(5.8,3.8,.04),'Vidro',entrance)
        for dx in [-2.9,0,2.9]:box('Caixilho',(x+dx,2.2,-4.66),(.04,3.8,.07),'Metal champagne',entrance)
    sign('Identificacao da exposicao',(0,4.64,-4.48),4.6,.38,label('assinatura','ARCOR  /  VILA DOCE',(246,231,207),(48,55,58)),entrance)

def pacoca():
    g=group('PacocaDoAmor');st=group('Pacoca_Structure',g);ht=group('Heart',g);co=group('Counters',g);li=group('Pacoca_Lights',g);pr=group('Pacoca_Props',g)
    cyl('Tablado circular',(0,.09,0),3.15,.18,'Carvalho acetinado',st,96)
    ring('Contorno do tablado',0,.20,0,3.09,'Luz quente',li,thick=.027)
    cyl('Podio do coracao',(0,.29,.20),1.18,.22,'Metal dourado',st,64)
    cyl('Topo iluminado',(0,.41,.20),1.11,.03,'Luz quente',li,64)
    heart('Coracao de pacoca',(0,1.98,.2),1.32,'Amendoim torrado',ht,True)
    for x,z in [(-2.62,-.70),(2.62,-.70),(-2.1,1.6),(2.1,1.6)]:cyl('Coluna dourada',(x,2.10,z),.036,3.90,'Metal dourado',st,12)
    for y in [3.68,4.10]:ring('Coroamento circular',0,y,0,2.73,'Metal dourado',st,thick=.047)
    ring('Fita de luz superior',0,3.63,0,2.7,'Luz quente',li,thick=.018)
    sign('Letreiro principal',(0,3.95,2.31),3.28,.50,label('pacoca-letreiro','Paçoca do Amor',(255,229,150),(116,77,32),italic=True),st)
    for start,end in [(.10,.98),(2.16,3.04),(3.46,4.20),(5.22,5.96)]:
        arcwall('Balcao curvo',0,0,2.47,.61,.20,.88,start,end,'Carvalho acetinado',co)
        arcwall('Tampo em pedra',0,0,2.47,.72,1.08,.065,start,end,'Creme',co)
        arcwall('Rodape metalico',0,0,2.47,.63,.22,.06,start,end,'Metal dourado',co)
        arcwall('Vitrine iluminada',0,0,2.786,.018,.87,.16,start,end,'Luz quente',li)
        for t in np.linspace(start+.06,end-.06,8):
            x,z=2.47*np.cos(t),2.47*np.sin(t)
            cyl('Pote de pacoca',(x,1.25,z),.086,.22,'Vidro',pr,12)
            cyl('Tampa dourada',(x,1.37,z),.09,.025,'Metal dourado',pr,12)
            for k in range(3):cyl('Pacocas no pote',(x,1.17+k*.06,z),.064,.052,'Amendoim torrado',pr,10)
        for t in np.linspace(start,end,21):
            tube('Ripa da marcenaria',[(2.785*np.cos(t),.31,2.785*np.sin(t)),(2.785*np.cos(t),.82,2.785*np.sin(t))],.009,'Madeira escura',co,4)
    for x in [-2.3,2.3]:
        for y in [1.65,2.13]:
            box('Prateleira',(x,y,-.5),(1.10,.045,.52),'Metal dourado',st)
            for dx in [-.38,-.19,0,.19,.38]:cyl('Produto na prateleira',(x+dx,y+.14,-.5),.07,.24,'Amendoim torrado',pr,12)
    for x,z,y in [(-2.3,.9,3.25),(2.3,.9,3.4),(-1.6,-1.8,3.08),(1.6,-1.8,3.22)]:
        tube('Fio do coracao',[(x,3.68,z),(x,y+.2,z)],.008,'Metal dourado',st,4)
        heart('Coracao suspenso',(x,y,z),.19,'Rosa' if x>0 else 'Vermelho',pr)

def lollipop(x,y,z,r,parent):
    cyl('Haste de pirulito',(x,y/2,z),.055,y,'Creme',parent,12)
    ell('Disco do pirulito',(x,y,z),(r,r,.105),'Creme',parent)
    for i in range(9):
        pts=[]
        for t in np.linspace(.07,1,23):
            a=i*2*PI/9+t*2.8;pts.append((x+r*t*np.cos(a),y+r*t*np.sin(a),z+.10))
        tube('Espiral vermelha',pts,.037,'Vermelho',parent,6)

def gummy(pos,color,parent,s=.22):
    x,y,z=pos
    ell('Corpo de ursinho',(x,y,z),(s*.66,s,.45*s),color,parent)
    ell('Cabeca de ursinho',(x,y+s,z),(s*.64,s*.60,s*.43),color,parent)
    for dx in [-.48,.48]:
        ell('Orelha',(x+dx*s,y+1.49*s,z),(s*.25,s*.27,s*.24),color,parent)
        ell('Pe',(x+dx*s,y-.85*s,z+.035),(s*.37,s*.4,s*.4),color,parent)
        ell('Braco',(x+dx*1.45*s,y+.08*s,z),(s*.3,s*.60,s*.35),color,parent)

def sete():
    x=-6.8;g=group('SeteBelo');st=group('SeteBelo_Structure',g);ma=group('Mascot',g);pr=group('CandyProps',g);li=group('SeteBelo_Lights',g)
    box('Tablado',(x,.10,0),(5.55,.20,5.1),'Carvalho acetinado',st)
    box('Luz frontal',(x,.18,2.56),(5.55,.035,.03),'Luz quente',li)
    for dx in [-2.53,2.53]:
        for z in [-2.2,2.2]:
            cyl('Pilar de bala',(x+dx,1.95,z),.095,3.55,'Creme',st,20)
            tube('Espiral do pilar',[(x+dx+.097*np.cos(t),.22+t/(2*PI)*.34,z+.097*np.sin(t)) for t in np.linspace(0,21*PI,170)],.028,'Vermelho',st,6)
        tube('Travessa lateral',[(x+dx,3.80,-2.2),(x+dx,3.80,2.2)],.047,'Rosa',st)
    for z in [-2.2,2.2]:tube('Travessa frontal',[(x-2.53,3.80,z),(x+2.53,3.80,z)],.06,'Creme',st)
    for dx in [-2.53,2.53]:lollipop(x+dx,3.65,2.26,.48,pr)
    sign('Marca 7 Belo',(x,3.72,2.30),1.96,.78,label('sete-belo-letreiro','7Belo',(14,64,130),(255,240,224),italic=True,subtitle='ARCOR  •  UM MUNDO DE DOCES'),st)
    box('Fundo rosa',(x,1.43,-2.18),(4.85,2.5,.13),'Rosa',st)
    for dx in [-2.36,-.80,.80,2.36]:box('Montante estante',(x+dx,1.60,-1.93),(.055,2.38,.48),'Creme',st)
    colors=['Vermelho','Amarelo','Verde','Azul','Rosa forte','Laranja']
    for row in range(4):
        y=.55+row*.56;box('Prateleira de doces',(x,y,-1.93),(4.83,.045,.5),'Creme',st)
        box('Luz de prateleira',(x,y+.03,-1.66),(4.75,.015,.025),'Luz quente',li)
        for col in range(15):
            xx=x-2.22+col*.315
            cyl('Baleiro',(xx,y+.22,-1.90),.123,.36,'Vidro',pr,12)
            for k in range(5):ell('Balas coloridas',(xx+random.uniform(-.055,.055),y+.09+k*.048,-1.88),(.07,.04,.057),colors[(col+row)%6],pr)
    for dx in [-1.96,1.96]:
        box('Balcao doce',(x+dx,.68,.35),(1.08,.97,2.4),'Rosa',st)
        box('Tampo doce',(x+dx,1.18,.35),(1.16,.065,2.48),'Creme',st)
        for z in [-.5,.10,.70,1.3]:
            cyl('Pote grande',(x+dx,1.41,z),.21,.40,'Vidro',pr,16)
            for k in range(7):ell('Doces no pote',(x+dx+random.uniform(-.09,.09),1.26+k*.039,z),(.095,.045,.08),colors[int((z+1)*4)%6],pr)
    # The mascot has volume, modeled limbs, raised eyes and the seven red diamonds.
    cx=x+.05;cy=1.68;cz=.74
    rounded('Carta mascote',(cx,cy,cz),1.36,2.08,.19,'Creme',ma,.14)
    for dx,dy in [(-.40,.67),(.40,.67),(0,.34),(-.40,-.16),(.40,-.16),(-.40,-.70),(.40,-.70)]:
        m=trimesh.creation.box(extents=[.20,.20,.017]);add('Ouro vermelho',m,'Vermelho',ma,(cx+dx,cy+dy,cz+.107),rot=([0,0,1],PI/4))
    for dx,dy in [(-.52,.91),(.52,-.91)]:
        tube('Numero sete',[(cx+dx-.07,cy+dy+.06,cz+.115),(cx+dx+.06,cy+dy+.06,cz+.115),(cx+dx-.03,cy+dy-.07,cz+.115)],.023,'Vermelho',ma,6)
    for dx in [-.24,.24]:
        ell('Olho branco',(cx+dx,cy+.19,cz+.13),(.19,.25,.075),'Branco',ma,-dx*.4)
        ell('Pupila',(cx+dx+.018,cy+.18,cz+.2),(.094,.15,.033),'Preto',ma)
        ell('Brilho do olho',(cx+dx+.037,cy+.24,cz+.23),(.03,.045,.012),'Branco',ma)
        tube('Sobrancelha',[(cx+dx-.13,cy+.52,cz+.15),(cx+dx,cy+.56,cz+.17),(cx+dx+.10,cy+.52,cz+.15)],.025,'Preto',ma)
    contour=[(.29*np.cos(t),-.20*np.sin(t)) for t in np.linspace(0,PI,19)]
    vertices=[[xx,yy,zz] for zz in [-.015,.015] for xx,yy in contour]
    vertices.extend([[0,-.07,-.015],[0,-.07,.015]])
    faces=[];n=len(contour)
    for i in range(n):
        j=(i+1)%n;faces.extend([[2*n,j,i],[2*n+1,n+i,n+j],[i,j,n+i],[j,n+j,n+i]])
    smile=trimesh.Trimesh(vertices=vertices,faces=faces,process=False)
    if smile.volume<0:smile.invert()
    add('Sorriso',smile,'Preto',ma,(cx,cy-.18,cz+.14))
    ell('Lingua',(cx+.02,cy-.33,cz+.16),(.12,.036,.015),'Vermelho',ma)
    box('Dentes',(cx,cy-.202,cz+.166),(.40,.04,.02),'Branco',ma)
    for side in [-1,1]:
        tube('Perna',[(cx+side*.35,.65,cz),(cx+side*.43,.36,cz+.10)],.065,'Creme',ma)
        ell('Sapato',(cx+side*.43,.31,cz+.18),(.23,.12,.32),'Creme',ma)
    tube('Braco acenando',[(cx-.66,1.89,cz),(cx-.95,2.01,cz),(cx-1.10,2.40,cz)],.07,'Creme',ma)
    ell('Mao acenando',(cx-1.12,2.48,cz),(.16,.17,.09),'Creme',ma)
    for dx,dy in [(-.14,.13),(-.05,.21),(.05,.22),(.14,.13)]:tube('Dedos da mao',[(cx-1.12+dx,2.47,cz),(cx-1.12+dx*1.3,2.49+dy,cz)],.035,'Creme',ma)
    tube('Braco na cintura',[(cx+.67,1.84,cz),(cx+.99,1.60,cz),(cx+.74,1.37,cz+.08)],.072,'Creme',ma)
    ell('Mao direita',(cx+.73,1.36,cz+.09),(.13,.13,.09),'Creme',ma)
    for dx,col in [(-2.20,'Vermelho'),(-1.7,'Verde'),(2.24,'Verde')]:gummy((x+dx,.59,2.10),col,pr,.25)
    # Giant donut as a rounded ring, lying on the platform.
    for material,yy,rr in [('Massa',.43,.51),('Rosa',.52,.50)]:
        ring('Rosquinha',x-1.1,yy,2.01,rr,material,pr,thick=.22)
    for i in range(26):
        t=random.random()*2*PI;r=random.uniform(.36,.64);px=x-1.1+r*np.cos(t);pz=2.01+r*np.sin(t)
        tube('Granulado',[(px,.725,pz),(px+.05,.735,pz+.045)],.017,colors[i%6],pr,5)
    for dx in [-1.65,-.9,.9,1.65]:gummy((x+dx,3.24,-.55),colors[int(abs(dx)*5)%6],pr,.18)

def poosh():
    x=6.8;g=group('Poosh');room=group('Room',g);ice=group('IceElements',g);ne=group('Neon',g);pr=group('Poosh_Props',g);li=group('Poosh_Lights',g)
    box('Plataforma congelada',(x,.10,0),(5.5,.2,5.1),'Gelo com fissuras',ice)
    box('Parede de gelo posterior',(x,1.94,-2.35),(5.50,3.5,.15),'Gelo com fissuras',room)
    box('Parede lateral direita',(x+2.67,1.94,-.35),(.16,3.5,4.1),'Gelo com fissuras',room)
    box('Meia parede esquerda',(x-2.67,.80,-1.52),(.15,1.25,1.7),'Gelo com fissuras',room)
    for dx in [-2.59,-1.3,0,1.3,2.59]:tube('Junta luminosa do gelo',[(x+dx,.22,-2.24),(x+dx,3.63,-2.24)],.015,'Neon ciano',ne)
    for y in [.23,3.62]:
        tube('Contorno neon',[(x-2.60,y,1.7),(x-2.60,y,-2.23),(x+2.57,y,-2.23),(x+2.57,y,1.7)],.025,'Neon ciano',ne)
    for dx in [-1.8,-.6,.6,1.8]:
        for z in [1,1.85]:tube('Setas no piso',[(x+dx-.35,.22,z-.15),(x+dx,.22,z+.16),(x+dx+.35,.22,z-.15)],.028,'Neon rosa',ne)
    sign('Poosh marca',(x,3.02,-2.20),2.35,.90,label('poosh-letreiro','POOSH!',(255,240,252),(177,16,79),italic=True,subtitle='SEU ESPAÇO RADICAL'),room)
    sign('Nome da experiencia',(x,3.84,-2.33),3.9,.36,label('poosh-quarto','QUARTO DO NOEL RADICAL',(223,250,255),(19,77,114)),room)
    # Bed with a wrapper-shaped headboard, seam lines, cushions and torn package ends.
    box('Base de gelo da cama',(x-.22,.53,-.28),(2.15,.61,2.4),'Gelo com fissuras',ice)
    box('Embalagem da cama',(x-.22,.89,-.22),(2.43,.14,2.65),'Vermelho',pr)
    rounded('Colchao',(x-.22,1.07,-.12),2.25,.35,2.35,'Rosa',pr,.14)
    for dx in [-.55,.55]:ell('Travesseiro',(x-.22+dx,1.30,-.86),(.50,.15,.32),'Rosa',pr)
    for dx in [-.75,-.25,.25,.75]:tube('Costura luminosa',[(x-.22+dx,1.254,-.6),(x-.22+dx,1.254,.88)],.009,'Neon rosa',ne,4)
    for z in [-.35,.15,.65]:tube('Costura horizontal',[(x-1.2,1.254,z),(x+.77,1.254,z)],.009,'Neon rosa',ne,4)
    box('Cabeceira embalagem',(x-.22,1.97,-1.43),(2.47,2.03,.17),'Rosa forte',pr)
    rounded('Interior da cabeceira',(x-.22,1.97,-1.32),2.13,1.75,.06,'Rosa',pr,.3)
    sign('Logo na embalagem',(x-.22,2.65,-1.25),1.66,.45,'poosh-letreiro',pr)
    for dx in np.linspace(-1.18,1.18,15):
        m=trimesh.creation.box(extents=[.14,.035,.24]);add('Dobra da embalagem',m,'Rosa forte',pr,(x-.22+dx,.92,1.18),rot=([1,0,0],-.35))
    # Transparent ice fins and a spiral candy slide.
    for dx in [-1,0,1]:box('Cristal translucido',(x+dx*.8,.49,1.04),(.64,.52,.12),'Gelo translucido',ice)
    cyl('Eixo do escorregador',(x+1.65,1.68,-.30),.055,3,'Metal cromado',pr,16)
    for off in [-.10,.10]:tube('Trilho helicoidal',[(x+1.65+(.60+off)*np.cos(t),3.02-t/(4*PI)*2.4,-.30+(.60+off)*np.sin(t)) for t in np.linspace(0,4*PI,100)],.045,'Metal cromado',pr)
    # Snowman on a snowboard, visible above the bed line at the back right.
    sx=x+1.40;sz=-1.78
    for yy,szr in [(1.60,.39),(2.05,.30),(2.47,.24)]:ell('Boneco de neve',(sx,yy,sz),(szr,szr,szr*.70),'Branco',pr)
    ell('Gorro',(sx,2.69,sz),(.24,.15,.19),'Vermelho',pr);ell('Pompom',(sx,2.84,sz),(.07,.07,.07),'Branco',pr)
    rounded('Oculos de snowboard',(sx,2.50,sz+.20),.43,.15,.08,'Azul',pr,.06)
    for yy in [1.60,1.80,2.04]:ell('Botao',(sx,yy,sz+.30),(.035,.035,.02),'Preto',pr)
    ring('Cachecol',sx,2.25,sz,.23,'Vermelho',pr,thick=.048)
    rounded('Snowboard',(sx,1.17,sz),1.0,.15,.35,'Rosa forte',pr,.07)
    # Christmas tree and presents at the open left side.
    tx=x-2.05;tz=.95
    cyl('Tronco',(tx,.45,tz),.10,.50,'Madeira escura',pr,12)
    for y,r,h in [(.93,.55,1.20),(1.50,.43,1.0),(2.02,.3,.82)]:
        m=trimesh.creation.cone(radius=r,height=h,sections=16);add('Ramo do pinheiro',m,'Pinheiro',pr,(tx,y-h/2,tz),rot=([1,0,0],-PI/2))
    for i in range(24):
        y=random.uniform(.48,2.25);r=.56*(2.65-y)/2.2;t=random.random()*2*PI
        ell('Bola natalina',(tx+r*np.cos(t),y,tz+r*np.sin(t)),(.072,.072,.072),['Vermelho','Luz quente','Azul','Rosa forte'][i%4],pr)
    # Five-point star with real thickness.
    pts=[]
    for i in range(10):a=PI/2+i*PI/5;r=.22 if i%2==0 else .09;pts.append([tx+r*np.cos(a),2.62+r*np.sin(a),tz])
    vs=pts+[[tx,2.62,tz+.06],[tx,2.62,tz-.06]];fs=[]
    for i in range(10):fs.extend([[10,i,(i+1)%10],[11,(i+1)%10,i]])
    add('Estrela de natal',trimesh.Trimesh(vertices=vs,faces=fs),'Metal dourado',pr)
    for dx,z,col in [(-.25,1.4,'Vermelho'),(.28,1.45,'Rosa')]:
        box('Presente',(tx+dx,.39,z),(.37,.34,.34),col,pr);box('Fita de presente',(tx+dx,.40,z),(.05,.37,.35),'Creme',pr)
    # Ceiling projection equipment without an opaque roof.
    tube('Suporte projetor',[(x-1.8,3.70,-1.9),(x-1.8,3.70,.35),(x+.5,3.70,.35)],.048,'Metal cromado',pr)
    rounded('Projetor',(x-.25,3.49,.30),.68,.28,.49,'Branco',pr,.06)
    ell('Lente do projetor',(x-.25,3.49,.56),(.09,.09,.025),'Neon ciano',li)
    # Candy dispenser, built at the right opening with separated reservoirs.
    box('Maquina de doces',(x+2.14,.84,1.22),(.76,1.20,.45),'Metal cromado',pr)
    for i,col in enumerate(['Laranja','Vermelho','Verde','Rosa forte']):
        xx=x+1.88+i*.18;cyl('Tubo de doces',(xx,1.97,1.22),.082,.98,'Vidro',pr,12)
        for j in range(10):ell('Chicletes',(xx,1.54+j*.086,1.22),(.061,.044,.062),col,pr)
        cyl('Tampa do tubo',(xx,2.48,1.22),.089,.05,'Metal cromado',pr,12)
    sign('Tela interativa',(x+2.14,1.12,1.46),.52,.31,label('tela-poosh','PLAY',(173,246,255),(21,45,73),size=(256,128)),pr)

def export():
    # Batch repeated geometry by semantic group/material, keeping web draw calls modest.
    for (parent,material),items in batches.items():
        uv=np.vstack([m.visual.uv for m in items])
        mesh=trimesh.util.concatenate(items)
        mesh.visual=TextureVisuals(uv=uv,material=materials[material])
        _=mesh.vertex_normals
        name=parent+' / '+material
        scene.add_geometry(mesh,node_name=name,geom_name=name,parent_node_name=parent)
    scene.metadata={'title':'ARCOR — Exposição Shopping','units':'meters','up_axis':'Y','front':'+Z','generator':'gerar_modelo.py; seed 27'}
    data=scene.export(file_type='glb',include_normals=True)
    # Complete optional GPU buffer targets, keeping standard glTF 2.0 portability.
    json_length=struct.unpack_from('<I',data,12)[0]
    document=json.loads(data[20:20+json_length])
    for mesh in document['meshes']:
        for primitive in mesh['primitives']:
            for accessor in primitive['attributes'].values():
                document['bufferViews'][document['accessors'][accessor]['bufferView']]['target']=34962
            document['bufferViews'][document['accessors'][primitive['indices']]['bufferView']]['target']=34963
    encoded=json.dumps(document,separators=(',',':')).encode('utf-8')
    encoded+=b' '*((-len(encoded))%4)
    binary_chunk=data[20+json_length:]
    data=struct.pack('<4sII',b'glTF',2,20+len(encoded)+len(binary_chunk))+struct.pack('<I4s',len(encoded),b'JSON')+encoded+binary_chunk
    (OUT/'exposicao-shopping.glb').write_bytes(data)
    report={'file':'assets/models/exposicao-shopping.glb','bytes':len(data),'megabytes':round(len(data)/1e6,3),'mesh_nodes':len(scene.geometry),'triangles':sum(len(m.faces) for m in scene.geometry.values()),'materials':len(materials),'textures':texture_info,'modeled_parts_before_batching':sum(counts.values()),'semantic_groups':counts,'bounds_m':scene.bounds.tolist(),'embedded_textures':True,'blender_available':False}
    (OUT/'estatisticas.json').write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False,indent=2))

if __name__=='__main__':
    make_textures()
    for name,c,rough,metal in [('Creme',[255,243,220,255],.42,0),('Branco',[246,250,253,255],.35,0),('Parede',[211,215,211,255],.82,0),('Juntas',[165,178,181,255],.6,0),('Metal champagne',[156,145,113,255],.32,.7),('Metal dourado',[210,159,71,255],.27,.72),('Metal cromado',[153,186,206,255],.24,.82),('Madeira escura',[101,58,32,255],.8,0),('Rosa',[248,156,191,255],.55,0),('Rosa forte',[222,38,116,255],.28,0),('Vermelho',[218,24,50,255],.26,0),('Azul',[18,131,210,255],.2,.12),('Verde',[49,190,75,255],.28,0),('Amarelo',[255,196,33,255],.3,0),('Laranja',[248,114,32,255],.3,0),('Preto',[22,22,31,255],.44,0),('Massa',[226,167,84,255],.7,0),('Pinheiro',[16,93,67,255],.8,0)]:mat(name,c,rough,metal)
    mat('Vidro',[186,229,236,50],.12,.08,alpha=True)
    mat('Gelo translucido',[96,209,240,108],.17,.15,alpha=True)
    mat('Luz quente',[255,240,177,255],.3,emission=[1,.71,.30])
    mat('Neon ciano',[111,233,255,255],.2,emission=[.20,.82,1])
    mat('Neon rosa',[255,88,161,255],.25,emission=[1,.06,.3])
    shopping();pacoca();sete();poosh();export()
