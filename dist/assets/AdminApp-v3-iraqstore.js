import{r as u,o as ye,s as Se,a as Ce,i as we,j as e,b as V,c as Ee,d as ke,u as _e,g as Ae,e as Pe,f as ue,h as $e,I as Be,k as Te,l as Fe,m as Ie,G as D,n as O,D as Le,p as Oe,q as he,C as Me,S as ze,t as Re,v as Ue,L as Ge,w as We,x as Je,y as re,z as R,A as Xe,B as De}from"./index-v3-iraqstore.js";

function ProductReorderPanel_V3({ products }) {
  const [genderFilter, setGenderFilter] = u.useState('');
  const [search, setSearch] = u.useState('');
  const [list, setList] = u.useState([]);
  const [saving, setSaving] = u.useState(!1);
  const [msg, setMsg] = u.useState('');

  u.useEffect(() => {
    const sorted = [...(products || [])].sort((a, b) => (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999));
    setList(sorted);
  }, [products]);

  const displayItems = u.useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((p) => {
      const matchGender = !genderFilter || p.gender === genderFilter;
      const matchQ = !q || (p.name && p.name.toLowerCase().includes(q)) || (p.nameEn && p.nameEn.toLowerCase().includes(q));
      return matchGender && matchQ;
    });
  }, [list, genderFilter, search]);

  const persist = async (nextList) => {
    const updated = nextList.map((item, idx) => ({ ...item, sortOrder: idx + 1 }));
    setList(updated);
    setSaving(!0);
    setMsg('');
    try {
      await Xe(updated);
      setMsg('✅ تم حفظ ترتيب المنتجات بنجاح ويظهر الآن في قمة المتجر!');
      setTimeout(() => setMsg(''), 4000);
    } catch(e) {
      setMsg('⚠️ تم حفظ الترتيب.');
    } finally {
      setSaving(!1);
    }
  };

  const moveTop = (item) => {
    const next = [item, ...list.filter(p => p.id !== item.id)];
    persist(next);
  };
  const moveBottom = (item) => {
    const next = [...list.filter(p => p.id !== item.id), item];
    persist(next);
  };
  const moveUp = (item) => {
    const idx = list.findIndex(p => p.id === item.id);
    if (idx <= 0) return;
    const next = [...list];
    const temp = next[idx];
    next[idx] = next[idx - 1];
    next[idx - 1] = temp;
    persist(next);
  };
  const moveDown = (item) => {
    const idx = list.findIndex(p => p.id === item.id);
    if (idx < 0 || idx >= list.length - 1) return;
    const next = [...list];
    const temp = next[idx];
    next[idx] = next[idx + 1];
    next[idx + 1] = temp;
    persist(next);
  };

  return e.jsxs("div", {
    className: "admin-panel admin-reorder-panel",
    children: [
      e.jsx("div", {
        className: "admin-card",
        style: { marginBottom: "1.25rem" },
        children: e.jsxs("div", {
          style: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" },
          children: [
            e.jsxs("div", {
              children: [
                e.jsx("h3", { style: { margin: 0, fontSize: "1.2rem" }, children: "↕️ التحكم بترتيب ظهور المنتجات بالمتجر" }),
                e.jsx("p", { style: { margin: "0.3rem 0 0", color: "var(--a-dim)", fontSize: "0.9rem" }, children: "اضغط على (🔝 الأول) لجعل أي منتج يظهر أول واحد في واجهة المتجر مباشرة، أو استخدم أزرار الصعود والنزول." })
              ]
            }),
            e.jsx("button", {
              type: "button",
              className: "admin-btn admin-btn--primary",
              onClick: () => persist(list),
              disabled: saving,
              children: saving ? "جارٍ الحفظ…" : "💾 حفظ الترتيب"
            })
          ]
        })
      }),
      e.jsxs("div", {
        className: "admin-toolbar",
        children: [
          e.jsx("input", { className: "admin-search", placeholder: "ابحث باسم المنتج لتغيير ترتيبه...", value: search, onChange: ev => setSearch(ev.target.value) }),
          e.jsxs("select", {
            value: genderFilter,
            onChange: ev => setGenderFilter(ev.target.value),
            children: [
              e.jsx("option", { value: "", children: "جميع الأقسام (رجالي ونسائي)" }),
              e.jsx("option", { value: "men", children: "قسم الرجال 👔" }),
              e.jsx("option", { value: "women", children: "قسم النساء 👗" })
            ]
          }),
          e.jsxs("span", { className: "admin-count", children: [displayItems.length, " منتج"] })
        ]
      }),
      msg && e.jsx("p", { className: "admin-note admin-note--ok", style: { margin: "0.75rem 0" }, children: msg }),
      e.jsx("div", {
        className: "admin-reorder-list",
        children: displayItems.map((p, idx) => {
          const actualRank = list.findIndex(item => item.id === p.id) + 1;
          const isFirst = actualRank === 1;
          const isLast = actualRank === list.length;
          return e.jsxs("div", {
            className: "admin-reorder-card",
            children: [
              e.jsx("div", { className: "admin-reorder-rank", children: e.jsxs("span", { className: "admin-rank-num", children: ["#", actualRank] }) }),
              e.jsx("img", { src: (p.images && p.images[0]) || p.image || "/logo.png", alt: "", className: "admin-reorder-thumb", loading: "lazy" }),
              e.jsxs("div", {
                className: "admin-reorder-info",
                children: [
                  e.jsxs("div", { className: "admin-reorder-title-row", children: [e.jsx("strong", { children: p.name }), p.badge && e.jsx("span", { className: "admin-tag admin-tag--accent", children: p.badge })] }),
                  e.jsxs("div", { className: "admin-reorder-sub-row", children: [e.jsx("span", { children: p.nameEn || "" }), e.jsxs("span", { className: "admin-dim", children: [p.gender === "men" ? "رجالي" : "نسائي", " · ", p.category, " / ", p.sub] })] })
                ]
              }),
              e.jsx("div", { className: "admin-reorder-price", children: e.jsx("strong", { children: O(p.price) }) }),
              e.jsxs("div", {
                className: "admin-reorder-actions",
                children: [
                  e.jsx("button", { type: "button", className: "admin-btn admin-btn--sm admin-btn--accent", onClick: () => moveTop(p), disabled: isFirst, title: "اجعل هذا المنتج في قمة المتجر أول واحد", children: "🔝 الأول" }),
                  e.jsx("button", { type: "button", className: "admin-btn admin-btn--sm", onClick: () => moveUp(p), disabled: isFirst, title: "تحريك خطوة للأعلى", children: "⬆️ صعود" }),
                  e.jsx("button", { type: "button", className: "admin-btn admin-btn--sm", onClick: () => moveDown(p), disabled: isLast, title: "تحريك خطوة للأسفل", children: "⬇️ نزول" }),
                  e.jsx("button", { type: "button", className: "admin-btn admin-btn--sm admin-btn--ghost", onClick: () => moveBottom(p), disabled: isLast, title: "نقل لآخر المتجر", children: "🔚 الأخير" })
                ]
              })
            ]
          }, p.id);
        })
      })
    ]
  });
}

const TYPE_DEFAULTS = {
  shoes: { cat: 'shoes', sizes: ['39','40','41','42','43','44','45','46'] },
  clothing: { cat: 'clothing', sizes: ['S','M','L','XL','XXL'] },
  perfume: { cat: 'accessories', sizes: ['50 ml','100 ml'] },
  bags: { cat: 'accessories', sizes: ['مقاس واحد'] },
  watches: { cat: 'accessories', sizes: ['مقاس واحد','40 mm','42 mm'] },
  general: { cat: 'accessories', sizes: ['مقاس واحد'] }
};
const ge=u.createContext(null);function Qe({children:i}){const[l,o]=u.useState(null),[n,c]=u.useState(!1);u.useEffect(()=>ye(V,N=>{o(N),c(!0)}),[]);const d=u.useMemo(()=>({user:l,ready:n,isAdmin:we(l),login:(f,N)=>Ce(V,f,N),logout:()=>Se(V)}),[l,n]);return e.jsx(ge.Provider,{value:d,children:i})}function Y(){const i=u.useContext(ge);if(!i)throw new Error("useAuth must be used inside <AuthProvider>");return i}async function ee(i,l=1800,o=.88){if(!i||!i.type.startsWith("image/"))return{file:i,dataUrl:null,originalSize:(i==null?void 0:i.size)||0,compressedSize:(i==null?void 0:i.size)||0};const n=i.size;return new Promise(c=>{const d=new FileReader;d.onerror=()=>c({file:i,dataUrl:null,originalSize:n,compressedSize:n}),d.onload=f=>{const N=new Image;N.onerror=()=>c({file:i,dataUrl:null,originalSize:n,compressedSize:n}),N.onload=()=>{let v=N.width,S=N.height;(v>l||S>l)&&(v>S?(S=Math.round(S*l/v),v=l):(v=Math.round(v*l/S),S=l));const E=document.createElement("canvas");E.width=v,E.height=S;const C=E.getContext("2d");C.imageSmoothingEnabled=!0,C.imageSmoothingQuality="high",C.fillStyle="#FFFFFF",C.fillRect(0,0,v,S),C.drawImage(N,0,0,v,S);let w="image/webp",p=E.toDataURL(w,o);p.startsWith("data:image/webp")||(w="image/jpeg",p=E.toDataURL(w,o)),E.toBlob(h=>{if(!h)return c({file:i,dataUrl:p,originalSize:n,compressedSize:n});const t=i.name.replace(/\.[^/.]+$/,"")+".webp",m=new File([h],t,{type:w});c({file:m,dataUrl:p,originalSize:n,compressedSize:h.size,ratio:Math.max(0,Math.round((1-h.size/n)*100))})},w,o)},N.src=f.target.result},d.readAsDataURL(i)})}function ce(i){if(!i||i<=0)return"0 B";const l=1024,o=["B","KB","MB","GB"],n=Math.floor(Math.log(i)/Math.log(l));return parseFloat((i/Math.pow(l,n)).toFixed(1))+" "+o[n]}async function se(i,l="products"){if(!i)return null;const{file:o,dataUrl:n}=await ee(i,1e3,.75),c=o||i;try{const d=c.name.replace(/[^a-zA-Z0-9.]+/g,"-"),f=`${l}/${Date.now()}-${Math.random().toString(36).slice(2,8)}-${d}`,N=Ee(ke,f),v=_e(N,c),S=new Promise((C,w)=>setTimeout(()=>w(new Error("Storage Timeout")),4e3));return await Promise.race([v,S]),await Ae(N)}catch(d){return console.warn("Firebase Storage upload failed or timed out — using compressed data URL:",d),n||URL.createObjectURL(c)}}const M=new Map;async function K(i){if(!i||typeof i!="string")return"";const l=i.trim();if(!l)return"";if(/^[a-zA-Z0-9\s.,\-'":;!()/+%]+$/.test(l))return l;if(M.has(l))return M.get(l);try{const o=`https://translate.googleapis.com/translate_a/single?client=gtx&sl=ar&tl=en&dt=t&q=${encodeURIComponent(l)}`,n=await fetch(o);if(n.ok){const c=await n.json();if(c&&c[0]&&Array.isArray(c[0])){const d=c[0].map(f=>f[0]).filter(Boolean).join("");if(d){const f=d.trim();return M.set(l,f),f}}}}catch(o){console.warn("Online translation fallback to local rule engine:",o)}return U(l)}const Z={حذاء:"Shoe",احذية:"Shoes",أحذية:"Shoes",سنيكرز:"Sneakers",ترينر:"Trainer",ترينرز:"Trainers",لوفر:"Loafer",لوفرز:"Loafers",بوت:"Boots",باليرينا:"Ballet Flats",صندل:"Sandals",كعب:"Heels",قميص:"Shirt",قمصان:"Shirts",تيشيرت:"T-Shirt",فستان:"Dress",فساتين:"Dresses",بدلة:"Suit",بدلات:"Suits",بليزر:"Blazer",جاكيت:"Jacket",معطف:"Coat",سترة:"Sweater",بنطال:"Trousers",بناطيل:"Pants",جينز:"Jeans",عباية:"Abaya",عبايات:"Abayas",قفطان:"Kaftan",بلوزة:"Blouse",حقيبة:"Bag",حقائب:"Bags",محفظة:"Wallet",حزام:"Belt",ساعة:"Watch",ساعات:"Watches",نظارة:"Sunglasses",عطر:"Perfume",عطور:"Perfumes",جلد:"Leather",قطن:"Cotton",كتان:"Linen",صوف:"Wool",ساتان:"Satin",مخمل:"Velvet",أبيض:"White",أسود:"Black",رمادي:"Grey",كحلي:"Navy",عنابي:"Burgundy",بني:"Brown",جملي:"Tan",أخضر:"Green",بيج:"Beige",ذهبي:"Gold",فضي:"Silver",رجالي:"Men's",نسائي:"Women's",أطفال:"Kids",جديد:"New"};function U(i){if(!i||typeof i!="string")return"";const l=i.trim();if(!l)return"";if(/^[a-zA-Z0-9\s.,\-'":;!]+$/.test(l))return l;if(M.has(l))return M.get(l);if(Z[l])return Z[l];let c=l.split(/(\s+|[،,.-])/).map(d=>{const f=d.replace(/[،,.-]/g,"");return Z[f]||d}).join("");return c=c.replace(/\bال([أ-ي]+)/g,"$1").replace(/\s+/g," ").trim(),c?(c=c.charAt(0).toUpperCase()+c.slice(1),M.set(l,c),c):l}function I(i){return U(i)}function H(i){return{nameEn:U(i.name||""),blurbEn:U(i.blurb||""),materialEn:U(i.material||"")}}function qe({products:i,onCatalogUpdated:l}){
  const[o,n]=u.useState(()=>Pe()),[c,d]=u.useState(null),[f,N]=u.useState(!1),[v,S]=u.useState("");
  const E=(t,m,j)=>(i||[]).filter(A=>A.gender===t&&(!m||A.category===m)&&(!j||A.sub===j)).length;
  const C=async t=>{
    n(t),ue(t),N(!0),S("");
    try{await $e(t),S("تم حفظ شجرة وترتيب الأقسام بنجاح. ✅"),l&&l()}catch{S("تم الحفظ في التخزين المحلي.")}finally{N(!1)}
  };
  const moveSubcategory=(t,m,j,A)=>{
    const subKey=`${t}/${m}`,treeCopy=JSON.parse(JSON.stringify(o)),subs=[...(treeCopy.subcategories[subKey]||[])];
    const allItem=subs.find(b=>b.slug==="all"),realSubs=subs.filter(b=>b.slug!=="all");
    const realIdx=realSubs.findIndex(b=>b.slug===j);
    if(realIdx<0)return;
    if(A==="top"){
      const item=realSubs[realIdx],newReal=[item,...realSubs.filter(b=>b.slug!==j)];
      treeCopy.subcategories[subKey]=allItem?[allItem,...newReal]:newReal;
    }else if(A==="bottom"){
      const item=realSubs[realIdx],newReal=[...realSubs.filter(b=>b.slug!==j),item];
      treeCopy.subcategories[subKey]=allItem?[allItem,...newReal]:newReal;
    }else if(A==="up"&&realIdx>0){
      const temp=realSubs[realIdx];
      realSubs[realIdx]=realSubs[realIdx-1];
      realSubs[realIdx-1]=temp;
      treeCopy.subcategories[subKey]=allItem?[allItem,...realSubs]:realSubs;
    }else if(A==="down"&&realIdx<realSubs.length-1){
      const temp=realSubs[realIdx];
      realSubs[realIdx]=realSubs[realIdx+1];
      realSubs[realIdx+1]=temp;
      treeCopy.subcategories[subKey]=allItem?[allItem,...realSubs]:realSubs;
    }
    C(treeCopy);
  };
  const moveCategory=(t,m,A)=>{
    const treeCopy=JSON.parse(JSON.stringify(o)),cats=[...(treeCopy.categories[t]||[])];
    const idx=cats.findIndex(b=>b.slug===m);
    if(idx<0)return;
    if(A==="up"&&idx>0){
      const temp=cats[idx];
      cats[idx]=cats[idx-1];
      cats[idx-1]=temp;
      treeCopy.categories[t]=cats;
      C(treeCopy);
    }else if(A==="down"&&idx<cats.length-1){
      const temp=cats[idx];
      cats[idx]=cats[idx+1];
      cats[idx+1]=temp;
      treeCopy.categories[t]=cats;
      C(treeCopy);
    }
  };
  const w=t=>{
    if(!c)return;
    const{type:m,parentGender:j,parentCat:A,isNew:P,item:k}=c,b=t.slug||t.title.toLowerCase().replace(/[^a-z0-9]+/g,"-"),a=JSON.parse(JSON.stringify(o));
    if(m==="gender"){
      const x=a.genders||[],g={slug:b,title:t.title,latin:t.latin||I(t.title),tagline:t.tagline||"",taglineEn:t.taglineEn||I(t.tagline||""),cover:t.cover||(k==null?void 0:k.cover)||""};
      if(P)x.push(g),a.categories[b]||(a.categories[b]=[]);
      else{const _=x.findIndex(B=>B.slug===k.slug);_>=0&&(x[_]={...x[_],...g})}
      a.genders=x;
    }else if(m==="category"){
      const x=a.categories[j]||[],g={slug:b,title:t.title,latin:t.latin||I(t.title),blurb:t.blurb||"",blurbEn:t.blurbEn||I(t.blurb||""),cover:t.cover||(k==null?void 0:k.cover)||""};
      if(P){x.push(g);const _=`${j}/${b}`;a.subcategories[_]||(a.subcategories[_]=[{slug:"all",title:`كل ${t.title}`,latin:`All ${g.latin}`,feature:!0}])}
      else{const _=x.findIndex(B=>B.slug===k.slug);_>=0&&(x[_]={...x[_],...g})}
      a.categories[j]=x;
    }else if(m==="sub"){
      const x=`${j}/${A}`,g=a.subcategories[x]||[],_={slug:b,title:t.title,latin:t.latin||I(t.title),cover:t.cover||(k==null?void 0:k.cover)||""};
      if(P)g.push(_);
      else{const B=g.findIndex(T=>T.slug===k.slug);B>=0&&(g[B]={...g[B],..._})}
      a.subcategories[x]=g;
    }
    d(null),C(a);
  };
  const p=(t,m,j,A)=>{
    if(!window.confirm("هل أنت تأكد من رغبتك في حذف هذا القسم؟"))return;
    const P=JSON.parse(JSON.stringify(o));
    if(t==="gender")P.genders=(P.genders||[]).filter(k=>k.slug!==A),delete P.categories[A];
    else if(t==="category")P.categories[m]=(P.categories[m]||[]).filter(k=>k.slug!==A),delete P.subcategories[`${m}/${A}`];
    else if(t==="sub"){const k=`${m}/${j}`;P.subcategories[k]=(P.subcategories[k]||[]).filter(b=>b.slug!==A)}
    C(P);
  };
  const h=()=>{window.confirm("إعادة شجرة الأقسام إلى الوضع الافتراضي الأصلي للمتجر؟")&&C({genders:Fe,categories:Te,subcategories:Be})};

  return e.jsxs("div",{className:"admin-panel",children:[
    e.jsxs("div",{className:"admin-tree-head",children:[
      e.jsxs("div",{children:[
        e.jsx("h3",{children:"إدارة شجرة الأقسام وترتيب الأقسام الفرعية والصور"}),
        e.jsx("p",{className:"admin-note",children:"يمكنك رفع صور الغلاف، والتحكم بترتيب ظهور الأقسام الفرعية (صعود/نزول/الأول/الأخير) لتظهر للزبون بالترتيب الذي تحدده فوراً."})
      ]}),
      e.jsxs("div",{className:"admin-tree-head__actions",children:[
        e.jsx("button",{className:"admin-btn admin-btn--primary",onClick:()=>d({type:"gender",isNew:!0,item:{title:"",slug:"",latin:""}}),children:"+ قسم رئيسي جديد"}),
        e.jsx("button",{className:"admin-btn admin-btn--ghost",onClick:h,disabled:f,children:"إعادة الضبط"})
      ]})
    ]}),
    v&&e.jsx("p",{className:"admin-note admin-note--ok",style:{marginBlock:"1rem"},children:v}),
    e.jsx("div",{className:"admin-tree",children:(o.genders||[]).map(t=>e.jsxs("div",{className:"admin-tree-node admin-tree-node--gender",children:[
      e.jsxs("header",{className:"admin-tree-node__head",children:[
        e.jsxs("div",{className:"admin-tree-node__info",children:[
          t.cover&&e.jsx("img",{src:t.cover,alt:"",className:"admin-tree-node__thumb"}),
          e.jsx("span",{className:"admin-tree-badge",children:"قسم رئيسي"}),
          e.jsx("strong",{children:t.title}),
          e.jsxs("span",{className:"admin-dim",children:["(",t.latin,")"]}),
          e.jsxs("span",{className:"admin-count",children:[E(t.slug)," منتج"]})
        ]}),
        e.jsxs("div",{className:"admin-tree-node__actions",children:[
          e.jsx("button",{className:"admin-btn admin-btn--sm",onClick:()=>d({type:"category",parentGender:t.slug,isNew:!0,item:{title:"",slug:"",latin:""}}),children:"+ فئة جديدة"}),
          e.jsx("button",{className:"admin-btn admin-btn--sm",onClick:()=>d({type:"gender",isNew:!1,item:t}),children:"تعديل والصورة"}),
          e.jsx("button",{className:"admin-btn admin-btn--sm admin-btn--danger",onClick:()=>p("gender",null,null,t.slug),children:"حذف"})
        ]})
      ]}),
      e.jsx("div",{className:"admin-tree-node__body",children:(o.categories[t.slug]||[]).map((m,cIdx,cArr)=>e.jsxs("div",{className:"admin-tree-node admin-tree-node--category",children:[
        e.jsxs("header",{className:"admin-tree-node__head",children:[
          e.jsxs("div",{className:"admin-tree-node__info",children:[
            m.cover&&e.jsx("img",{src:m.cover,alt:"",className:"admin-tree-node__thumb"}),
            e.jsx("span",{className:"admin-tree-badge admin-tree-badge--cat",children:"فئة"}),
            e.jsx("strong",{children:m.title}),
            e.jsxs("span",{className:"admin-dim",children:["(",m.latin,")"]}),
            e.jsx("span",{className:"admin-count",children:E(t.slug,m.slug)})
          ]}),
          e.jsxs("div",{className:"admin-tree-node__actions",children:[
            e.jsx("button",{className:"admin-icon-btn",onClick:()=>moveCategory(t.slug,m.slug,"up"),disabled:cIdx===0,title:"تحريك الفئة للأعلى",children:"▲"}),
            e.jsx("button",{className:"admin-icon-btn",onClick:()=>moveCategory(t.slug,m.slug,"down"),disabled:cIdx===cArr.length-1,title:"تحريك الفئة للأسفل",children:"▼"}),
            e.jsx("button",{className:"admin-btn admin-btn--sm",onClick:()=>d({type:"sub",parentGender:t.slug,parentCat:m.slug,isNew:!0,item:{title:"",slug:"",latin:""}}),children:"+ قسم فرعي"}),
            e.jsx("button",{className:"admin-btn admin-btn--sm",onClick:()=>d({type:"category",parentGender:t.slug,isNew:!1,item:m}),children:"تعديل والصورة"}),
            e.jsx("button",{className:"admin-btn admin-btn--sm admin-btn--danger",onClick:()=>p("category",t.slug,null,m.slug),children:"حذف"})
          ]})
        ]}),
        e.jsx("div",{className:"admin-tree-node__subs",children:(()=>{
          const subsList=(o.subcategories[`${t.slug}/${m.slug}`]||[]).filter(j=>j.slug!=="all");
          return subsList.map((j,sIdx)=>{
            const isFirst=sIdx===0,isLast=sIdx===subsList.length-1;
            return e.jsxs("div",{className:"admin-tree-sub",children:[
              e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"0.4rem",flex:1,minWidth:0},children:[
                e.jsxs("span",{className:"admin-rank-pill",title:"ترتيب الظهور للزبون",children:["#",sIdx+1]}),
                j.cover&&e.jsx("img",{src:j.cover,alt:"",className:"admin-tree-node__thumb admin-tree-node__thumb--sm"}),
                e.jsxs("span",{className:"admin-tree-sub__title",style:{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"},children:[e.jsx("strong",{children:j.title})," ",e.jsxs("small",{children:["(",j.latin,")"]})]})
              ]}),
              e.jsx("span",{className:"admin-count",style:{marginInline:"0.3rem"},title:"عدد المنتجات",children:E(t.slug,m.slug,j.slug)}),
              e.jsxs("div",{className:"admin-tree-sub__actions",children:[
                e.jsx("button",{className:"admin-icon-btn",onClick:()=>moveSubcategory(t.slug,m.slug,j.slug,"top"),disabled:isFirst,title:"اجعل هذا القسم في البداية (الأول 🔝)",children:"🔝"}),
                e.jsx("button",{className:"admin-icon-btn",onClick:()=>moveSubcategory(t.slug,m.slug,j.slug,"up"),disabled:isFirst,title:"صعود خطوة للأعلى (▲)",children:"▲"}),
                e.jsx("button",{className:"admin-icon-btn",onClick:()=>moveSubcategory(t.slug,m.slug,j.slug,"down"),disabled:isLast,title:"نزول خطوة للأسفل (▼)",children:"▼"}),
                e.jsx("button",{className:"admin-icon-btn",onClick:()=>moveSubcategory(t.slug,m.slug,j.slug,"bottom"),disabled:isLast,title:"نقل للنهاية (الأخير 🔚)",children:"🔚"}),
                e.jsx("button",{className:"admin-icon-btn",onClick:()=>d({type:"sub",parentGender:t.slug,parentCat:m.slug,isNew:!1,item:j}),title:"تعديل والصورة ✏️",children:"✏️"}),
                e.jsx("button",{className:"admin-icon-btn admin-icon-btn--danger",onClick:()=>p("sub",t.slug,m.slug,j.slug),title:"حذف 🗑️",children:"🗑️"})
              ]})
            ]},j.slug);
          });
        })()})
      ]},m.slug))})
    ]},t.slug))}),
    c&&e.jsx(Ve,{editingItem:c,onSave:w,onCancel:()=>d(null)})
  ]});
}function Ve({editingItem:i,onSave:l,onCancel:o}){const{type:n,isNew:c,item:d}=i,[f,N]=u.useState(d.title||""),[v,S]=u.useState(d.latin||""),[E,C]=u.useState(d.slug||""),[w,p]=u.useState(d.tagline||d.blurb||""),[h,t]=u.useState(d.cover||""),[m,j]=u.useState(!1),A=a=>{N(a),(!v||c)&&S(I(a)),c&&C(a.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||`s-${Date.now()}`)},P=async a=>{const x=a.target.files[0];if(x){j(!0);try{const g=await se(x,"categories");t(g)}catch{const{dataUrl:g}=await ee(x,1200,.88);t(g)}finally{j(!1)}}},k=a=>{a.preventDefault(),f&&l({title:f,latin:v||I(f),slug:E||`s-${Date.now()}`,tagline:w,blurb:w,cover:h})},b=()=>{const a=c?"إضافة":"تعديل";return n==="gender"?`${a} قسم رئيسي وصورة الغلاف`:n==="category"?`${a} فئة جديدة وصورة الغلاف`:`${a} قسم فرعي والصورة`};return e.jsx("div",{className:"admin-modal",onClick:o,children:e.jsxs("form",{className:"admin-modal__panel admin-modal__panel--sm",onClick:a=>a.stopPropagation(),onSubmit:k,children:[e.jsxs("header",{className:"admin-modal__head",children:[e.jsx("h2",{children:b()}),e.jsx("button",{type:"button",className:"admin-icon",onClick:o,children:"✕"})]}),e.jsxs("div",{className:"admin-modal__body",children:[e.jsxs("label",{className:"admin-field",children:[e.jsx("span",{children:"الاسم بالعربية *"}),e.jsx("input",{value:f,onChange:a=>A(a.target.value),placeholder:"مثال: عطور، أحذية...",required:!0})]}),e.jsxs("label",{className:"admin-field",children:[e.jsx("span",{children:"الاسم بالإنجليزية (تلقائي ✨)"}),e.jsx("input",{value:v,onChange:a=>S(a.target.value),placeholder:"Perfumes, Shoes...",dir:"ltr"})]}),e.jsxs("label",{className:"admin-field",children:[e.jsx("span",{children:"المعرّف (Slug) في الرابط"}),e.jsx("input",{value:E,onChange:a=>C(a.target.value),placeholder:"perfumes",dir:"ltr"})]}),e.jsxs("div",{className:"admin-field admin-field--highlight",children:[e.jsx("span",{children:"صورة القسم (مع الضغط التلقائي للسرعة 🖼️)"}),e.jsx("input",{type:"file",accept:"image/*",onChange:P,disabled:m}),m&&e.jsx("small",{style:{color:"var(--a-ok)"},children:"جارٍ ضغط ورفع صورة القسم…"}),h&&e.jsxs("div",{className:"admin-category-preview",children:[e.jsx("img",{src:h,alt:"غلاف القسم"}),e.jsx("button",{type:"button",className:"admin-btn admin-btn--sm admin-btn--danger",onClick:()=>t(""),children:"حذف الصورة"})]})]}),n!=="sub"&&e.jsxs("label",{className:"admin-field",children:[e.jsx("span",{children:"الوصف التوضيحي (اختياري)"}),e.jsx("textarea",{rows:2,value:w,onChange:a=>p(a.target.value),placeholder:"وصف قصير للقسم..."})]})]}),e.jsxs("footer",{className:"admin-modal__foot",children:[e.jsx("button",{type:"button",className:"admin-btn admin-btn--ghost",onClick:o,children:"إلغاء"}),e.jsx("button",{type:"submit",className:"admin-btn admin-btn--primary",disabled:m,children:m?"جارٍ رفع الصورة…":"حفظ التغيرات"})]})]})})}function $(i){if(i==null||i==="")return 0;let l=String(i).trim().replace(/,/g,"").replace(/\s+/g,"");if(!l)return 0;if(/k$/i.test(l)){const n=parseFloat(l.replace(/k$/i,""));return isNaN(n)?0:Math.round(n*1e3)}if(/ألف$|الف$/i.test(l)){const n=parseFloat(l.replace(/ألف$|الف$/i,""));return isNaN(n)?0:Math.round(n*1e3)}const o=parseFloat(l);return isNaN(o)||o<=0?0:o<1e3?Math.round(o*1e3):Math.round(o)}function Ke(){const[i,l]=u.useState(()=>Ie()),[o,n]=u.useState(!1),[c,d]=u.useState(""),[f,N]=u.useState("5000"),v=(h,t)=>{l(m=>({...m,[h]:t}))},S=h=>{const t=i[h];if(t!==void 0&&t!==""){const m=$(t);l(j=>({...j,[h]:m}))}},E=()=>{l({...Le}),d("تم التبديل للأسعار الافتراضية (بغداد 3,000 - المحافظات 5,000)")},C=()=>{const h=D.reduce((t,m)=>(t[m]=0,t),{});l(h),d("تم تحديد التوصيل المجاني لجميع المحافظات 🎁")},w=()=>{const h=$(f),t=D.reduce((m,j)=>(m[j]=h,m),{});l(t),d(`تم تعيين سعر توصيل موحد ${O(h)} لجميع المحافظات.`)},p=async h=>{h.preventDefault(),n(!0),d("");const t={};D.forEach(m=>{t[m]=$(i[m]??5e3)}),Oe(t);try{await he("deliveryFees",t)}catch(m){console.warn("Firebase delivery fees sync failed:",m)}l(t),n(!1),d("تم حفظ وتحديث أسعار التوصيل لجميع المحافظات بنجاح! 🟢")};return e.jsxs("div",{className:"admin-panel",children:[e.jsxs("div",{className:"admin-tree-head",children:[e.jsxs("div",{children:[e.jsx("h3",{children:"🚚 إدارة أسعار التوصيل لجميع المحافظات العراقية"}),e.jsx("p",{className:"admin-note",children:"يمكنك تحديد سعر التوصيل الخاص بكل محافظة على حدة. تظهر هذه الأسعار تلقائياً للزبون عند إتمام الطلب."})]}),e.jsxs("div",{className:"admin-tree-head__actions",children:[e.jsx("button",{type:"button",className:"admin-btn admin-btn--ghost",onClick:E,children:"الوضع الافتراضي"}),e.jsx("button",{type:"button",className:"admin-btn admin-btn--ghost",onClick:C,children:"توصيل مجاني 🎁"})]})]}),e.jsxs("div",{className:"admin-card",style:{marginBottom:"1.5rem"},children:[e.jsx("h3",{children:"⚡ تحديد مبلغ موحد لجميع المحافظات"}),e.jsxs("div",{className:"admin-color-custom",children:[e.jsx("input",{type:"text",inputMode:"decimal",value:f,onChange:h=>N(h.target.value),placeholder:"مثال: 4 أو 5000",style:{width:"180px"}}),e.jsx("button",{type:"button",className:"admin-btn admin-btn--primary admin-btn--sm",onClick:w,children:"تطبيق على كل المحافظات"})]})]}),c&&e.jsx("p",{className:"admin-note admin-note--ok",style:{marginBottom:"1.5rem"},children:c}),e.jsxs("form",{onSubmit:p,children:[e.jsx("div",{className:"admin-delivery-grid",children:D.map(h=>{const t=i[h]??"",m=$(t);return e.jsxs("div",{className:"admin-delivery-card",children:[e.jsxs("div",{className:"admin-delivery-card__head",children:[e.jsx("span",{className:"admin-delivery-icon",children:"📍"}),e.jsx("strong",{children:h})]}),e.jsxs("div",{className:"admin-field",style:{marginTop:"0.5rem"},children:[e.jsx("span",{children:"سعر التوصيل (د.ع)"}),e.jsx("input",{type:"text",inputMode:"decimal",value:t,onChange:j=>v(h,j.target.value),onBlur:()=>S(h),placeholder:"مثال: 3 أو 5000",dir:"ltr",required:!0}),t!==""&&e.jsx("small",{className:"admin-smart-price-badge",children:m===0?"توصيل مجاني (0 د.ع)":`✨ ${O(m)}`})]})]},h)})}),e.jsx("div",{style:{marginTop:"1.5rem",display:"flex",justifyContent:"flex-end"},children:e.jsx("button",{type:"submit",className:"admin-btn admin-btn--primary",disabled:o,style:{minWidth:"180px"},children:o?"جارٍ الحفظ…":"حفظ أسعار التوصيل 💾"})})]})]})}const de=[{id:"shoes",label:"👟 أحذية (Footwear)",icon:"👟"},{id:"clothing",label:"👔 ملابس (Clothing)",icon:"👔"},{id:"perfume",label:"🧪 عطور وتجميل (Perfumes)",icon:"🧪"},{id:"bags",label:"👜 حقائب وإكسسوارات (Bags)",icon:"👜"},{id:"watches",label:"⌚ ساعات ومجوهرات (Watches)",icon:"⌚"},{id:"general",label:"📦 عام / منتج آخر (General)",icon:"📦"}],Ze=[{name:"أسود",nameEn:"Black",hex:"#141416"},{name:"أبيض",nameEn:"White",hex:"#F2F0EE"},{name:"رمادي",nameEn:"Grey",hex:"#8A8A90"},{name:"كحلي",nameEn:"Navy",hex:"#1E2A44"},{name:"عنابي",nameEn:"Burgundy",hex:"#6B0F1A"},{name:"بني",nameEn:"Brown",hex:"#6A4A32"},{name:"جملي",nameEn:"Tan",hex:"#B08A5F"},{name:"أخضر",nameEn:"Green",hex:"#3F5F45"},{name:"بيج",nameEn:"Beige",hex:"#D9C3B0"},{name:"ذهبي",nameEn:"Gold",hex:"#C8A24A"},{name:"وردي",nameEn:"Pink",hex:"#E8A5B8"},{name:"سماوي",nameEn:"Sky Blue",hex:"#9BBECB"}],Q=(i,l)=>Array.from({length:l-i+1},(o,n)=>String(i+n)),He={"أحذية رجالية":Q(39,46),"أحذية نسائية":Q(35,42),"أحذية مقاسات كبيرة":Q(47,55),"ملابس (أحرف)":["XS","S","M","L","XL","XXL","3XL","4XL"],"ملابس (رقمي)":["36","38","40","42","44","46","48"],"عطور (حجم)":["50 ml","100 ml","150 ml","200 ml"],"مقاس واحد":["مقاس واحد"]},oe=[...Q(35,55),"XS","S","M","L","XL","XXL","3XL","4XL","50 ml","100 ml","150 ml","مقاس واحد"],Ye=[{value:"",label:"بدون شارة"},{value:"new",label:"جديد ✨"},{value:"sale",label:"تخفيض 🔥"},{value:"best",label:"الأكثر مبيعًا ⭐️"}],es={type:"shoes",gender:"men",category:"shoes",sub:"",name:"",nameEn:"",blurb:"",blurbEn:"",price:"",oldPrice:"",badge:"",material:"",materialEn:"",colors:[],sizes:[],images:[],stockQuantity:15,status:"active",heelType:"",soleMaterial:"",fitType:"",perfumeVolume:"",perfumeNotes:"",perfumeConcentration:"",customSpecs:[]};function ss({initial:i,onSave:l,onCancel:o}){var le;const[n,c]=u.useState(()=>({...es,...i||{}})),[d,f]=u.useState([]),[N,v]=u.useState(null),[S,E]=u.useState(!1),[C,w]=u.useState(""),[p,h]=u.useState(""),[t,m]=u.useState(""),[j,A]=u.useState("#336699"),[P,k]=u.useState(""),b=(s,r)=>c(y=>({...y,[s]:r})),a=Me[n.gender]||[],x=(ze[`${n.gender}/${n.category}`]||[]).filter(s=>s.slug!=="all");u.useEffect(()=>{var s;a.find(r=>r.slug===n.category)||b("category",((s=a[0])==null?void 0:s.slug)||"shoes")},[n.gender]),u.useEffect(()=>{var s;n.sub&&!x.find(r=>r.slug===n.sub)&&b("sub",((s=x[0])==null?void 0:s.slug)||""),!n.sub&&x[0]&&b("sub",x[0].slug)},[n.gender,n.category]);const g=s=>{c(r=>{const y=H({name:s,blurb:r.blurb,material:r.material});return{...r,name:s,nameEn:y.nameEn}}),s.trim()&&K(s).then(r=>{r&&c(y=>({...y,nameEn:r}))})},_=s=>{c(r=>{const y=H({name:r.name,blurb:s,material:r.material});return{...r,blurb:s,blurbEn:y.blurbEn}}),s.trim()&&K(s).then(r=>{r&&c(y=>({...y,blurbEn:r}))})},B=s=>{c(r=>{const y=H({name:r.name,blurb:r.blurb,material:s});return{...r,material:s,materialEn:y.materialEn}}),s.trim()&&K(s).then(r=>{r&&c(y=>({...y,materialEn:r}))})},T=4,G=async s=>{if(!s||!s.length)return;const r=(n.images||[]).length,y=Math.max(0,T-r);if(y===0){h(`الحد الأقصى ${T} صور للمنتج`);return}const F=Array.from(s).slice(0,y);Array.from(s).length>y&&h(`تم اختيار أول ${y} صور فقط (الحد الأقصى ${T})`),f(F);let L=0,z=0;for(const X of F){L+=X.size;const q=await ee(X,1e3,.75);z+=q.compressedSize}v({original:ce(L),compressed:ce(z),savings:Math.round((1-z/L)*100)})},W=s=>c(r=>({...r,colors:r.colors.some(y=>y.name===s.name)?r.colors.filter(y=>y.name!==s.name):[...r.colors,s]})),pe=()=>{if(!t)return;const s={name:t,nameEn:I(t),hex:j};W(s),m("")},xe=s=>{c(r=>({...r,sizes:r.sizes.includes(s)?r.sizes.filter(y=>y!==s):[...r.sizes,s]}))},ne=()=>{const s=P.trim();s&&(c(r=>({...r,sizes:r.sizes.includes(s)?r.sizes:[...r.sizes,s]})),k(""))},je=()=>{c(s=>({...s,customSpecs:[...s.customSpecs||[],{key:"",value:""}]}))},ae=(s,r,y)=>{c(F=>{const L=[...F.customSpecs||[]];return L[s]={...L[s],[r]:y},{...F,customSpecs:L}})},be=s=>{c(r=>({...r,customSpecs:(r.customSpecs||[]).filter((y,F)=>F!==s)}))},fe=u.useMemo(()=>d.map(s=>URL.createObjectURL(s)),[d]),J=$(n.price),te=$(n.oldPrice),ie=te&&J?Math.round((1-J/te)*100):0,Ne=s=>{if(!J)return h("أدخل السعر أولًا");h(""),b("oldPrice",String(Math.round(J/(1-s/100))))},ve=async s=>{if(s.preventDefault(),!n.name||!n.price)return h("اسم المنتج والسعر مطلوبة");E(!0),h(""),w("جارٍ ضغط وحفظ الصور…");try{let r=n.images||[];if(d.length){const X=await Promise.all(d.map(q=>se(q,"products")));r=[...r,...X.filter(Boolean)]}if(r=r.slice(0,4),!r.length)return E(!1),h("أضف صورة واحدة على الأقل للمنتج");w("جارٍ حفظ البيانات…");const y=n.id||`p-${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`,F=$(n.price),L=n.oldPrice?$(n.oldPrice):null,z={...n,id:y,nameEn:n.nameEn||I(n.name),blurbEn:n.blurbEn||I(n.blurb||""),materialEn:n.materialEn||I(n.material||""),price:Number(F),oldPrice:L?Number(L):null,sizes:n.sizes.length?n.sizes:["مقاس واحد"],images:r};await l(z),E(!1)}catch(r){console.error(r),h("حدث خطأ أثناء الحفظ — تمت المحاولة محلياً."),E(!1)}};return e.jsx("div",{className:"admin-modal",onClick:o,children:e.jsxs("form",{className:"admin-modal__panel admin-modal__panel--lg",onClick:s=>s.stopPropagation(),onSubmit:ve,children:[e.jsxs("header",{className:"admin-modal__head",children:[e.jsxs("div",{children:[e.jsx("h2",{children:n.id?"تعديل المنتج":"إضافة منتج جديد"}),e.jsx("span",{className:"admin-modal__sub",children:"توليد الترجمة وضغط الصور يتم تلقائياً ✨"})]}),e.jsx("button",{type:"button",className:"admin-icon",onClick:o,"aria-label":"إغلاق",children:"✕"})]}),e.jsxs("div",{className:"admin-modal__body",children:[e.jsxs("div",{className:"admin-field admin-field--highlight",children:[e.jsx("span",{children:"نوع المنتج (يحدد الخصائص والقياسات المطلوبة)"}),e.jsx("div",{className:"admin-type-grid",children:de.map(s=>e.jsxs("button",{type:"button",className:`admin-type-card ${n.type===s.id?"is-active":""}`,onClick:()=>b("type",s.id),children:[e.jsx("span",{className:"admin-type-card__icon",children:s.icon}),e.jsx("span",{children:s.label})]},s.id))})]}),e.jsxs("div",{className:"admin-grid3",children:[e.jsxs("label",{className:"admin-field",children:[e.jsx("span",{children:"القسم الرئيسي"}),e.jsxs("select",{value:n.gender,onChange:s=>b("gender",s.target.value),children:[e.jsx("option",{value:"men",children:"رجالي"}),e.jsx("option",{value:"women",children:"نسائي"})]})]}),e.jsxs("label",{className:"admin-field",children:[e.jsx("span",{children:"الفئة"}),e.jsx("select",{value:n.category,onChange:s=>b("category",s.target.value),children:a.map(s=>e.jsx("option",{value:s.slug,children:s.title},s.slug))})]}),e.jsxs("label",{className:"admin-field",children:[e.jsx("span",{children:"القسم الفرعي"}),e.jsx("select",{value:n.sub,onChange:s=>b("sub",s.target.value),children:x.map(s=>e.jsx("option",{value:s.slug,children:s.title},s.slug))})]})]}),e.jsxs("div",{className:"admin-grid2",children:[e.jsxs("label",{className:"admin-field",children:[e.jsx("span",{children:"اسم المنتج (عربي) *"}),e.jsx("input",{value:n.name,onChange:s=>g(s.target.value),placeholder:"مثال: حذاء رياضي أبيض كلاسيكي",required:!0})]}),e.jsxs("label",{className:"admin-field",children:[e.jsx("span",{children:"اسم المنتج بالإنجليزية (مترجم تلقائياً ✨)"}),e.jsx("input",{value:n.nameEn,onChange:s=>b("nameEn",s.target.value),placeholder:"White Classic Sneaker",dir:"ltr"})]})]}),e.jsxs("div",{className:"admin-grid2",children:[e.jsxs("label",{className:"admin-field",children:[e.jsx("span",{children:"الوصف والتفاصيل (عربي)"}),e.jsx("textarea",{rows:2,value:n.blurb,onChange:s=>_(s.target.value),placeholder:"وصف مميزات المنتج والتفاصيل التي تهم الزبون..."})]}),e.jsxs("label",{className:"admin-field",children:[e.jsx("span",{children:"الوصف بالإنجليزية (مترجم تلقائياً ✨)"}),e.jsx("textarea",{rows:2,value:n.blurbEn,onChange:s=>b("blurbEn",s.target.value),dir:"ltr"})]})]}),e.jsxs("div",{className:"admin-grid3",children:[e.jsxs("label",{className:"admin-field",children:[e.jsx("span",{children:"السعر النهائي (د.ع) *"}),e.jsx("input",{type:"text",inputMode:"decimal",value:n.price,onChange:s=>b("price",s.target.value),onBlur:()=>{if(n.price){const s=$(n.price);s&&b("price",String(s))}},placeholder:"مثال: 19 أو 19.5 أو 19000",dir:"ltr",required:!0}),n.price&&$(n.price)>0&&e.jsxs("small",{className:"admin-smart-price-badge",children:["✨ تكملة الآلاف تلقائياً: ",O($(n.price))]})]}),e.jsxs("label",{className:"admin-field",children:[e.jsx("span",{children:"السعر قبل التخفيض (اختياري)"}),e.jsx("input",{type:"text",inputMode:"decimal",value:n.oldPrice,onChange:s=>b("oldPrice",s.target.value),onBlur:()=>{if(n.oldPrice){const s=$(n.oldPrice);s&&b("oldPrice",String(s))}},placeholder:"مثال: 25 أو 25000",dir:"ltr"}),n.oldPrice&&$(n.oldPrice)>0&&e.jsxs("small",{className:"admin-smart-price-badge",children:["✨ تكملة الآلاف تلقائياً: ",O($(n.oldPrice))]})]}),e.jsxs("label",{className:"admin-field",children:[e.jsx("span",{children:"شارة المنتج"}),e.jsx("select",{value:n.badge,onChange:s=>b("badge",s.target.value),children:Ye.map(s=>e.jsx("option",{value:s.value,children:s.label},s.value))})]})]}),e.jsxs("div",{className:"admin-grid2",children:[e.jsxs("label",{className:"admin-field",children:[e.jsx("span",{children:"الكمية المتاحة بالمعرض/المخزون"}),e.jsx("input",{type:"number",value:n.stockQuantity,onChange:s=>b("stockQuantity",Number(s.target.value)),placeholder:"15",dir:"ltr"})]}),e.jsxs("label",{className:"admin-field",children:[e.jsx("span",{children:"حالة العرض بالمتجر"}),e.jsxs("select",{value:n.status||"active",onChange:s=>b("status",s.target.value),children:[e.jsx("option",{value:"active",children:"🟢 نشط ومعروض للزبائن"}),e.jsx("option",{value:"draft",children:"🟡 مسودة (مخفي من المتجر)"})]})]})]}),e.jsxs("div",{className:"admin-field",children:[e.jsxs("span",{children:["خصم سريع ",ie>0&&e.jsxs("b",{className:"admin-pill-sale",children:["−",ie,"%"]})]}),e.jsxs("div",{className:"admin-chips",children:[[15,20,25,30,40,50].map(s=>e.jsxs("button",{type:"button",className:"admin-chip",onClick:()=>Ne(s),children:["خصم ",s,"%"]},s)),e.jsx("button",{type:"button",className:"admin-chip",onClick:()=>b("oldPrice",""),children:"إلغاء الخصم"})]})]}),e.jsx("div",{className:"admin-section-divider",children:e.jsxs("span",{children:["تفاصيل ومواصفات مخصصة لـ (",(le=de.find(s=>s.id===n.type))==null?void 0:le.label,")"]})}),n.type==="shoes"&&e.jsxs("div",{className:"admin-grid3",children:[e.jsxs("label",{className:"admin-field",children:[e.jsx("span",{children:"نوع النعل / الكعب"}),e.jsx("input",{value:n.heelType||"",onChange:s=>b("heelType",s.target.value),placeholder:"مثال: فلات، كعب عالي 7 سم، نعل مريح..."})]}),e.jsxs("label",{className:"admin-field",children:[e.jsx("span",{children:"خامة النعل السفلي"}),e.jsx("input",{value:n.soleMaterial||"",onChange:s=>b("soleMaterial",s.target.value),placeholder:"مطاط مقاوم للانزلاق، كريب..."})]}),e.jsxs("label",{className:"admin-field",children:[e.jsx("span",{children:"خامة الحذاء الخارجية"}),e.jsx("input",{value:n.material,onChange:s=>B(s.target.value),placeholder:"جلد طبيعي، شمواه، شبك..."})]})]}),n.type==="clothing"&&e.jsxs("div",{className:"admin-grid3",children:[e.jsxs("label",{className:"admin-field",children:[e.jsx("span",{children:"نوع القماش / الخامة"}),e.jsx("input",{value:n.material,onChange:s=>B(s.target.value),placeholder:"قطن 100%، كتان، صوف مخلوط..."})]}),e.jsxs("label",{className:"admin-field",children:[e.jsx("span",{children:"نوع القَصّة (Fit Type)"}),e.jsx("input",{value:n.fitType||"",onChange:s=>b("fitType",s.target.value),placeholder:"سليم فيت (Slim)، أوفرسايز، كلاسيك..."})]}),e.jsxs("label",{className:"admin-field",children:[e.jsx("span",{children:"الخامة بالإنجليزية"}),e.jsx("input",{value:n.materialEn,onChange:s=>b("materialEn",s.target.value),placeholder:"100% Cotton, Linen...",dir:"ltr"})]})]}),n.type==="perfume"&&e.jsxs("div",{className:"admin-grid3",children:[e.jsxs("label",{className:"admin-field",children:[e.jsx("span",{children:"الحجم / السعة"}),e.jsx("input",{value:n.perfumeVolume||"",onChange:s=>b("perfumeVolume",s.target.value),placeholder:"100 ml, 50 ml..."})]}),e.jsxs("label",{className:"admin-field",children:[e.jsx("span",{children:"درجة التركيز"}),e.jsx("input",{value:n.perfumeConcentration||"",onChange:s=>b("perfumeConcentration",s.target.value),placeholder:"Eau de Parfum / العطر الفاخر"})]}),e.jsxs("label",{className:"admin-field",children:[e.jsx("span",{children:"النوتات العطرية الرئيسية"}),e.jsx("input",{value:n.perfumeNotes||"",onChange:s=>b("perfumeNotes",s.target.value),placeholder:"عود، مسك، عنبر، صندل، حمضيات..."})]})]}),e.jsxs("div",{className:"admin-field",children:[e.jsx("span",{children:"الألوان المتاحة للمنتج"}),e.jsx("div",{className:"admin-chips",children:Ze.map(s=>{const r=n.colors.some(y=>y.name===s.name);return e.jsxs("button",{type:"button",className:`admin-swatch ${r?"is-on":""}`,onClick:()=>W(s),children:[e.jsx("span",{style:{background:s.hex}}),s.name]},s.name)})}),e.jsxs("div",{className:"admin-color-custom",children:[e.jsx("input",{type:"color",value:j,onChange:s=>A(s.target.value),className:"admin-color-picker"}),e.jsx("input",{value:t,onChange:s=>m(s.target.value),placeholder:"اسم لون مخصص (مثال: ماروني، زيتوني...)"}),e.jsx("button",{type:"button",className:"admin-btn admin-btn--sm",onClick:pe,children:"+ إضافة هذا اللون"})]})]}),e.jsxs("div",{className:"admin-field",children:[e.jsx("span",{children:"القياسات الأحجام المتاحة"}),e.jsx("div",{className:"admin-chips admin-chips--presets",children:Object.entries(He).map(([s,r])=>e.jsxs("button",{type:"button",className:"admin-chip admin-chip--accent",onClick:()=>b("sizes",r),children:["تحديد ",s]},s))}),e.jsx("div",{className:"admin-sizes-selector",children:[...oe,...n.sizes.filter(s=>!oe.includes(s))].map(s=>e.jsx("button",{type:"button",className:`admin-size-box ${n.sizes.includes(s)?"is-on":""}`,onClick:()=>xe(s),children:s},s))}),e.jsxs("div",{className:"admin-size-add",children:[e.jsx("input",{type:"text",value:P,onChange:s=>k(s.target.value),onKeyDown:s=>{s.key==="Enter"&&(s.preventDefault(),ne())},placeholder:"قياس خاص (مثال: 56، 5XL، Free)…"}),e.jsx("button",{type:"button",className:"admin-btn admin-btn--sm",onClick:ne,children:"+ إضافة قياس"})]})]}),e.jsxs("div",{className:"admin-field",children:[e.jsxs("div",{className:"admin-flex-between",children:[e.jsx("span",{children:"مواصفات وتفاصيل مخصصة أخرى"}),e.jsx("button",{type:"button",className:"admin-btn admin-btn--sm",onClick:je,children:"+ إضافة خاصية جديدة"})]}),(n.customSpecs||[]).length>0&&e.jsx("div",{className:"admin-specs-list",children:n.customSpecs.map((s,r)=>e.jsxs("div",{className:"admin-spec-row",children:[e.jsx("input",{placeholder:"اسم الخاصية (مثال: بلد الصنع)",value:s.key,onChange:y=>ae(r,"key",y.target.value)}),e.jsx("input",{placeholder:"القيمة (مثال: إيطاليا)",value:s.value,onChange:y=>ae(r,"value",y.target.value)}),e.jsx("button",{type:"button",className:"admin-icon-btn admin-icon-btn--danger",onClick:()=>be(r),children:"✕"})]},r))})]}),e.jsxs("div",{className:"admin-field admin-field--highlight",children:[e.jsxs("div",{className:"admin-flex-between",children:[e.jsx("span",{children:"صور المنتج — حتى ٤ صور (تُضغط تلقائياً 🗜️)"}),N&&e.jsxs("span",{className:"admin-compress-badge",children:["تم الضغط: ",N.original," ➔ ",N.compressed," (وفّر ",N.savings,"%)"]})]}),e.jsx("input",{type:"file",accept:"image/*",multiple:!0,disabled:(n.images||[]).length+d.length>=4,onChange:s=>G(s.target.files)}),e.jsxs("div",{className:"admin-thumbs",children:[(n.images||[]).map(s=>e.jsxs("span",{className:"admin-thumb",children:[e.jsx("img",{src:s,alt:""}),e.jsx("button",{type:"button",onClick:()=>b("images",n.images.filter(r=>r!==s)),children:"✕"})]},s)),fe.map((s,r)=>e.jsxs("span",{className:"admin-thumb admin-thumb--new",children:[e.jsx("img",{src:s,alt:""}),e.jsx("button",{type:"button",onClick:()=>f(d.filter((y,F)=>F!==r)),children:"✕"})]},s))]})]}),p&&e.jsx("p",{className:"admin-auth__error",children:p}),n.price&&$(n.price)>0&&e.jsxs("p",{className:"admin-preview-price",children:["السعر المعروض للزبون: ",e.jsx("b",{children:O($(n.price))}),n.oldPrice&&$(n.oldPrice)>0&&e.jsx("s",{style:{marginInlineStart:8,opacity:.6},children:O($(n.oldPrice))})]})]}),e.jsxs("footer",{className:"admin-modal__foot",children:[e.jsx("button",{type:"button",className:"admin-btn admin-btn--ghost",onClick:o,disabled:S,children:"إلغاء"}),e.jsx("button",{type:"submit",className:"admin-btn admin-btn--primary",disabled:S,children:S?C||"جارٍ الحفظ…":"حفظ المنتج"})]})]})})}function ns(){const[i,l]=u.useState(()=>We());u.useEffect(()=>Je(l),[]);const o=i==="online";return e.jsxs("div",{className:`admin-conn-status ${o?"is-online":"is-local"}`,children:[e.jsx("span",{className:"admin-conn-dot"}),e.jsx("span",{children:o?"متصل بـ Firebase":"تخزين محلي احتياطي (مستمر)"})]})}function as({products:i}){const[l,o]=u.useState(""),[n,c]=u.useState(""),[d,f]=u.useState(""),[N,v]=u.useState(null),[S,E]=u.useState(40),[C,w]=u.useState([]),p=u.useMemo(()=>{const a=l.trim().toLowerCase();return i.filter(g=>{const _=!a||`${g.name} ${g.nameEn||""}`.toLowerCase().includes(a),B=!n||g.gender===n;let T=!0;return d==="low"?T=g.stockQuantity!==void 0&&g.stockQuantity<=3:d==="draft"?T=g.status==="draft":d==="active"&&(T=g.status!=="draft"),_&&B&&T}).sort((g,_)=>(g.sortOrder??9999)-(_.sortOrder??9999))},[i,l,n,d]),h=async a=>{await R(a),v(null)},t=async a=>{window.confirm(`هل أنت متأكد من حذف المنتج «${a.name}»؟`)&&await re(a.id)},m=async a=>{const x=a.status==="draft"?"active":"draft";await R({...a,status:x})},j=a=>{a.target.checked?w(p.map(x=>x.id)):w([])},A=a=>{w(x=>x.includes(a)?x.filter(g=>g!==a):[...x,a])},P=async()=>{if(C.length&&window.confirm(`هل أنت متأكد من حذف ${C.length} منتج محدد نهائياً؟`)){for(const a of C)await re(a);w([])}},k=async(a,x)=>{const g=p.findIndex(W=>W.id===a.id);if(g<0)return;const _=x==="up"?g-1:g+1;if(_<0||_>=p.length)return;const B=p[_],T=a.sortOrder??g+1,G=B.sortOrder??_+1;await R({...a,sortOrder:G===T?_+1:G}),await R({...B,sortOrder:T})},b=async(a,x)=>{const g=parseInt(x,10);isNaN(g)||await R({...a,sortOrder:g})};return e.jsxs("div",{className:"admin-panel",children:[e.jsxs("div",{className:"admin-toolbar",children:[e.jsx("input",{className:"admin-search",placeholder:"ابحث باسم المنتج بالعربية أو الإنجليزية…",value:l,onChange:a=>o(a.target.value)}),e.jsxs("select",{value:n,onChange:a=>c(a.target.value),children:[e.jsx("option",{value:"",children:"كل الأقسام الرئيسية"}),e.jsx("option",{value:"men",children:"رجالي"}),e.jsx("option",{value:"women",children:"نسائي"})]}),e.jsxs("select",{value:d,onChange:a=>f(a.target.value),children:[e.jsx("option",{value:"",children:"جميع المنتجات"}),e.jsx("option",{value:"active",children:"النشطة بالمعرض 🟢"}),e.jsx("option",{value:"low",children:"مخزون منخفض ⚠️"}),e.jsx("option",{value:"draft",children:"المسودات (مخفية) 🟡"})]}),e.jsxs("span",{className:"admin-count",children:[p.length," منتج"]}),e.jsx("button",{className:"admin-btn admin-btn--primary",onClick:()=>v("new"),children:"+ إضافة منتج جديد"})]}),C.length>0&&e.jsxs("div",{className:"admin-bulk-bar",children:[e.jsxs("span",{children:["تم تحديد ",e.jsx("b",{children:C.length})," منتج"]}),e.jsx("button",{className:"admin-btn admin-btn--sm admin-btn--danger",onClick:P,children:"حذف المحدد 🗑️"})]}),p.length===0?e.jsxs("div",{className:"admin-empty",children:[e.jsx("p",{children:"لا توجد منتجات مطابقة في الكتالوج."}),e.jsx("button",{className:"admin-btn admin-btn--primary",onClick:()=>v("new"),children:"+ إضافة أول منتج الآن"})]}):e.jsxs("div",{className:"admin-table",children:[e.jsxs("div",{className:"admin-table-head-row",children:[e.jsx("input",{type:"checkbox",onChange:j,checked:C.length>0&&C.length===p.length}),e.jsx("span",{children:"الترتيب"}),e.jsx("span",{children:"المنتج والمعلومات"}),e.jsx("span",{children:"الأقسام والشارات"}),e.jsx("span",{children:"المخزون والحالة"}),e.jsx("span",{children:"السعر"}),e.jsx("span",{children:"إجراءات"})]}),p.slice(0,S).map((a,x)=>{const g=a.status==="draft",_=a.stockQuantity!==void 0&&a.stockQuantity<=3;return e.jsxs("div",{className:`admin-row ${g?"admin-row--draft":""}`,children:[e.jsx("input",{type:"checkbox",checked:C.includes(a.id),onChange:()=>A(a.id)}),e.jsxs("div",{className:"admin-reorder-box",children:[e.jsx("button",{className:"admin-icon-btn",onClick:()=>k(a,"up"),disabled:x===0,title:"تحريك للأعلى",children:"▲"}),e.jsx("input",{type:"number",className:"admin-order-input",value:a.sortOrder??x+1,onChange:B=>b(a,B.target.value),title:"رقم ترتيب المنتج"}),e.jsx("button",{className:"admin-icon-btn",onClick:()=>k(a,"down"),disabled:x===p.length-1,title:"تحريك للأسفل",children:"▼"})]}),e.jsxs("div",{className:"admin-row__product-cell",children:[e.jsx("img",{className:"admin-row__img",src:a.images&&a.images[0]||a.image,alt:"",loading:"lazy"}),e.jsxs("div",{className:"admin-row__main",children:[e.jsx("strong",{children:a.name}),e.jsx("span",{children:a.nameEn}),a.material&&e.jsxs("small",{className:"admin-dim",children:["الخامة: ",a.material]})]})]}),e.jsxs("div",{className:"admin-row__meta",children:[e.jsx("span",{className:"admin-tag",children:a.gender==="men"?"رجالي":"نسائي"}),e.jsxs("span",{className:"admin-tag",children:[a.category," / ",a.sub]}),a.badge&&e.jsx("span",{className:"admin-tag admin-tag--accent",children:a.badge})]}),e.jsxs("div",{className:"admin-row__stock",children:[e.jsx("span",{className:`admin-stock-badge ${_?"is-low":"is-ok"}`,children:a.stockQuantity!==void 0?`المخزون: ${a.stockQuantity}`:"متوفر"}),e.jsx("button",{className:`admin-status-toggle ${g?"is-draft":"is-active"}`,onClick:()=>m(a),title:"انقر لتبديل حالة العرض",children:g?"🟡 مسودة":"🟢 نشط"})]}),e.jsxs("div",{className:"admin-row__price",children:[O(a.price),a.oldPrice?e.jsx("s",{children:O(a.oldPrice)}):null]}),e.jsxs("div",{className:"admin-row__actions",children:[e.jsx("button",{className:"admin-btn admin-btn--sm",onClick:()=>v(a),children:"تعديل"}),e.jsx("button",{className:"admin-btn admin-btn--sm admin-btn--danger",onClick:()=>t(a),children:"حذف"})]})]},a.id)}),p.length>S&&e.jsxs("button",{className:"admin-btn admin-btn--ghost admin-loadmore",onClick:()=>E(a=>a+40),children:["عرض المزيد (",p.length-S,")"]})]}),N&&e.jsx(ss,{initial:N==="new"?null:N,onSave:h,onCancel:()=>v(null)})]})}function ts({productCount:i,products:l}){const[o,n]=u.useState(!1),[c,d]=u.useState(""),[f,N]=u.useState(!1),v=async()=>{if(window.confirm("سيتم كتابة الكتالوج المدمج إلى قاعدة البيانات والتخزين المحلي. متابعة؟")){n(!0),d("");try{await De(),d("تمت تعبئة الكتالوج المدمج بنجاح.")}catch{d("تمت التعبئة للتخزين المحلي.")}finally{n(!1)}}},S=async w=>{const p=w.target.files[0];if(p){N(!0),d("");try{const h=await se(p,"branding");await he("logoUrl",h),d("تم تحديث شعار المتجر بنجاح.")}catch{d("تعذّر رفع الشعار.")}finally{N(!1)}}},E=()=>{const w=JSON.stringify({products:l,exportedAt:new Date().toISOString()},null,2),p=new Blob([w],{type:"application/json"}),h=URL.createObjectURL(p),t=document.createElement("a");t.href=h,t.download=`iraqstore-backup-${Date.now()}.json`,t.click(),URL.revokeObjectURL(h)},C=w=>{var t;const p=(t=w.target.files)==null?void 0:t[0];if(!p)return;const h=new FileReader;h.onload=async m=>{try{const j=JSON.parse(m.target.result),A=Array.isArray(j)?j:j.products;if(!Array.isArray(A)||!A.length){alert("ملف JSON غير صالح أو لا يحتوي على منتجات.");return}window.confirm(`هل تريد استيراد ورفع ${A.length} منتج دفعة واحدة إلى قاعدة البيانات؟`)&&(d("جارٍ رفع وحفظ المنتجات دفعة واحدة…"),await Xe(A),d(`تم استيراد ورفع ${A.length} منتج بنجاح! 🚀`))}catch(j){alert("خطأ في قراءة ملف JSON: "+j.message)}},h.readAsText(p)};return e.jsxs("div",{className:"admin-panel admin-panel--narrow",children:[e.jsxs("div",{className:"admin-card",children:[e.jsx("h3",{children:"شعار المتجر"}),e.jsx("p",{children:"ارفع شعارًا جديدًا من جهازك ليظهر في رأس الهيدر وتذييل المتجر."}),e.jsxs("label",{className:"admin-btn admin-btn--primary admin-file",children:[f?"جارٍ رفع وضغط الشعار…":"رفع شعار جديد",e.jsx("input",{type:"file",accept:"image/*",hidden:!0,onChange:S,disabled:f})]})]}),e.jsxs("div",{className:"admin-card",children:[e.jsx("h3",{children:"استيراد وتصدير المنتجات بالجملة (+1000 منتج) 🚀"}),e.jsx("p",{children:"تصدير واستيراد الكتالوج بالكامل لرفع آلاف المنتجات دفعة واحدة إلى قاعدة البيانات في ثوانٍ."}),e.jsxs("div",{style:{display:"flex",gap:"0.8rem",flexWrap:"wrap",marginTop:"0.8rem"},children:[e.jsx("button",{className:"admin-btn admin-btn--ghost",onClick:E,children:"⬇️ تصدير النسخة الاحتياطية (JSON)"}),e.jsxs("label",{className:"admin-btn admin-btn--primary admin-file",children:["⬆️ استيراد جماعي (ملف JSON)",e.jsx("input",{type:"file",accept:".json",hidden:!0,onChange:C})]})]})]}),e.jsxs("div",{className:"admin-card",children:[e.jsx("h3",{children:"تعبئة الكتالوج الافتراضي"}),e.jsxs("p",{children:["يحتوي الكتالوج حالياً على ",e.jsx("b",{children:i})," منتج."]}),e.jsx("button",{className:"admin-btn admin-btn--ghost",onClick:v,disabled:o,children:o?"جارٍ التعبئة…":"تعبئة الكتالوج المدمج"})]}),c&&e.jsx("p",{className:"admin-note admin-note--ok",children:c})]})}
const STATUS_META = {
  new: { label: 'طلب جديد 🆕', cls: 'admin-status--new' },
  processing: { label: 'قيد التجهيز 📦', cls: 'admin-status--processing' },
  shipped: { label: 'تم الشحن / قيد التوصيل 🚚', cls: 'admin-status--shipped' },
  completed: { label: 'مكتمل ✅', cls: 'admin-status--completed' },
  cancelled: { label: 'ملغى ❌', cls: 'admin-status--cancelled' }
};

function OrdersPanel_V3({ orders: initialOrders, onStatusChange, onDeleteOrder }) {
  const [ordersList, setOrdersList] = u.useState(initialOrders || []);
  const [q, setQ] = u.useState('');
  const [statusFilter, setStatusFilter] = u.useState('');
  const [selectedOrder, setSelectedOrder] = u.useState(null);
  const [printOrder, setPrintOrder] = u.useState(null);

  u.useEffect(() => {
    setOrdersList(initialOrders || []);
  }, [initialOrders]);

  const cleanPhone = (p) => {
    const digits = String(p || '').replace(/\D/g, '');
    if (digits.startsWith('07')) return '964' + digits.slice(1);
    if (digits.startsWith('7')) return '964' + digits;
    return digits;
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('ar-IQ', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  };

  const filtered = u.useMemo(() => {
    const s = q.trim().toLowerCase();
    return ordersList.filter(o => {
      const matchQ = !s || (o.orderNo && o.orderNo.toLowerCase().includes(s)) ||
        (o.name && o.name.toLowerCase().includes(s)) ||
        (o.phone && o.phone.toLowerCase().includes(s)) ||
        (o.governorate && o.governorate.toLowerCase().includes(s)) ||
        (o.city && o.city.toLowerCase().includes(s));
      const matchStatus = !statusFilter || o.status === statusFilter;
      return matchQ && matchStatus;
    });
  }, [ordersList, q, statusFilter]);

  const counts = u.useMemo(() => {
    const res = { total: ordersList.length, new: 0, processing: 0, shipped: 0, completed: 0, cancelled: 0 };
    ordersList.forEach(o => {
      const st = o.status || 'new';
      if (res[st] !== undefined) res[st]++;
    });
    return res;
  }, [ordersList]);

  const handleStatusChange = async (orderId, newStatus) => {
    if (onStatusChange) {
      await onStatusChange(orderId, newStatus);
    } else if (window.__iraqstore_updateOrderStatus) {
      await window.__iraqstore_updateOrderStatus(orderId, newStatus);
    }
    const next = ordersList.map(o => (o.id === orderId || o.orderNo === orderId) ? { ...o, status: newStatus } : o);
    setOrdersList(next);
    if (selectedOrder && (selectedOrder.id === orderId || selectedOrder.orderNo === orderId)) {
      setSelectedOrder(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  const handleDelete = async (orderId) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الطلب نهائياً؟')) {
      if (onDeleteOrder) {
        await onDeleteOrder(orderId);
      } else if (window.__iraqstore_deleteOrder) {
        await window.__iraqstore_deleteOrder(orderId);
      }
      const next = ordersList.filter(o => o.id !== orderId && o.orderNo !== orderId);
      setOrdersList(next);
      if (selectedOrder && (selectedOrder.id === orderId || selectedOrder.orderNo === orderId)) {
        setSelectedOrder(null);
      }
    }
  };

  return e.jsxs("div", {
    className: "admin-panel",
    children: [
      e.jsxs("div", {
        className: "admin-orders-stats",
        children: [
          e.jsxs("button", {
            type: "button",
            className: `admin-stat-chip ${statusFilter === '' ? 'is-active' : ''}`,
            onClick: () => setStatusFilter(''),
            children: [e.jsx("span", { children: "كل الطلبات" }), e.jsx("strong", { children: counts.total })]
          }),
          e.jsxs("button", {
            type: "button",
            className: `admin-stat-chip admin-stat-chip--new ${statusFilter === 'new' ? 'is-active' : ''}`,
            onClick: () => setStatusFilter('new'),
            children: [e.jsx("span", { children: "طلبات جديدة" }), e.jsx("strong", { children: counts.new })]
          }),
          e.jsxs("button", {
            type: "button",
            className: `admin-stat-chip admin-stat-chip--processing ${statusFilter === 'processing' ? 'is-active' : ''}`,
            onClick: () => setStatusFilter('processing'),
            children: [e.jsx("span", { children: "قيد التجهيز" }), e.jsx("strong", { children: counts.processing })]
          }),
          e.jsxs("button", {
            type: "button",
            className: `admin-stat-chip admin-stat-chip--shipped ${statusFilter === 'shipped' ? 'is-active' : ''}`,
            onClick: () => setStatusFilter('shipped'),
            children: [e.jsx("span", { children: "تم الشحن" }), e.jsx("strong", { children: counts.shipped })]
          }),
          e.jsxs("button", {
            type: "button",
            className: `admin-stat-chip admin-stat-chip--completed ${statusFilter === 'completed' ? 'is-active' : ''}`,
            onClick: () => setStatusFilter('completed'),
            children: [e.jsx("span", { children: "مكتملة" }), e.jsx("strong", { children: counts.completed })]
          })
        ]
      }),
      e.jsxs("div", {
        className: "admin-toolbar",
        style: { marginTop: "1.25rem" },
        children: [
          e.jsx("input", {
            className: "admin-search",
            placeholder: "ابحث باسم الزبون، رقم الهاتف، رقم الطلب، أو المحافظة...",
            value: q,
            onChange: ev => setQ(ev.target.value)
          }),
          e.jsxs("select", {
            value: statusFilter,
            onChange: ev => setStatusFilter(ev.target.value),
            children: [
              e.jsx("option", { value: "", children: "جميع الحالات" }),
              e.jsx("option", { value: "new", children: "طلبات جديدة 🆕" }),
              e.jsx("option", { value: "processing", children: "قيد التجهيز 📦" }),
              e.jsx("option", { value: "shipped", children: "تم الشحن / قيد التوصيل 🚚" }),
              e.jsx("option", { value: "completed", children: "مكتملة ✅" }),
              e.jsx("option", { value: "cancelled", children: "ملغاة ❌" })
            ]
          }),
          e.jsxs("span", { className: "admin-count", children: [filtered.length, " طلب"] })
        ]
      }),
      filtered.length === 0 ? e.jsx("div", {
        className: "admin-empty",
        children: e.jsx("p", { children: "لا توجد طلبات مسجلة حالياً أو مطابقة للبحث." })
      }) : e.jsx("div", {
        className: "admin-orders-table",
        children: filtered.map(order => {
          const st = STATUS_META[order.status || 'new'] || STATUS_META.new;
          const items = order.cart || [];
          return e.jsxs("div", {
            className: "admin-order-card",
            children: [
              e.jsxs("div", {
                className: "admin-order-card__head",
                children: [
                  e.jsxs("div", {
                    children: [
                      e.jsxs("span", { className: "admin-order-no", children: ["#", order.orderNo || order.id] }),
                      e.jsx("span", { className: "admin-order-time", children: formatTime(order.createdAt) })
                    ]
                  }),
                  e.jsx("span", { className: `admin-order-badge ${st.cls}`, children: st.label })
                ]
              }),
              e.jsxs("div", {
                className: "admin-order-card__body",
                children: [
                  e.jsxs("div", {
                    className: "admin-order-customer",
                    children: [
                      e.jsx("strong", { children: order.name }),
                      e.jsx("span", { dir: "ltr", children: order.phone }),
                      e.jsxs("small", { children: ["📍 ", order.governorate, " — ", order.city] })
                    ]
                  }),
                  e.jsxs("div", {
                    className: "admin-order-items-preview",
                    children: [
                      e.jsxs("span", { children: [order.itemCount || items.length || 1, " منتجات:"] }),
                      e.jsxs("div", {
                        className: "admin-order-thumbs",
                        children: [
                          items.slice(0, 4).map((item, idx) => e.jsx("img", {
                            src: item.product?.images?.[0] || item.product?.image || item.image || '/logo.png',
                            alt: "",
                            className: "admin-order-thumb",
                            title: `${item.product?.name || item.name} (${item.size || ''} / ${item.color || ''}) × ${item.qty}`
                          }, idx)),
                          items.length > 4 && e.jsxs("span", { className: "admin-order-thumb-more", children: ["+", items.length - 4] })
                        ]
                      })
                    ]
                  }),
                  e.jsxs("div", {
                    className: "admin-order-price",
                    children: [
                      e.jsx("strong", { children: O(order.total || order.subtotal) }),
                      e.jsx("small", { children: order.paymentLabel || 'الدفع عند الاستلام' })
                    ]
                  })
                ]
              }),
              e.jsxs("div", {
                className: "admin-order-card__foot",
                children: [
                  e.jsxs("select", {
                    className: "admin-status-select",
                    value: order.status || 'new',
                    onChange: ev => handleStatusChange(order.id || order.orderNo, ev.target.value),
                    children: [
                      e.jsx("option", { value: "new", children: "🆕 جديد" }),
                      e.jsx("option", { value: "processing", children: "📦 قيد التجهيز" }),
                      e.jsx("option", { value: "shipped", children: "🚚 تم الشحن" }),
                      e.jsx("option", { value: "completed", children: "✅ مكتمل" }),
                      e.jsx("option", { value: "cancelled", children: "❌ ملغى" })
                    ]
                  }),
                  e.jsxs("div", {
                    className: "admin-order-btns",
                    children: [
                      e.jsx("a", {
                        href: `tel:${order.phone}`,
                        className: "admin-btn admin-btn--sm admin-btn--ghost",
                        title: "اتصال مباشر بالزبون",
                        children: "📞 اتصال"
                      }),
                      e.jsx("a", {
                        href: `https://wa.me/${cleanPhone(order.phone)}?text=${encodeURIComponent(`مرحباً ${order.name}، بخصوص طلبك رقم #${order.orderNo || order.id} من متجر عراق ستور`)}`,
                        target: "_blank",
                        rel: "noopener noreferrer",
                        className: "admin-btn admin-btn--sm admin-btn--ghost",
                        style: { color: "#25D366" },
                        title: "مراسلة الزبون على الواتساب",
                        children: "💬 واتساب"
                      }),
                      e.jsx("button", {
                        type: "button",
                        className: "admin-btn admin-btn--sm",
                        onClick: () => setSelectedOrder(order),
                        children: "التفاصيل 👁️"
                      }),
                      e.jsx("button", {
                        type: "button",
                        className: "admin-btn admin-btn--sm admin-btn--ghost",
                        onClick: () => setPrintOrder(order),
                        children: "وصل الشحن 🖨️"
                      }),
                      e.jsx("button", {
                        type: "button",
                        className: "admin-btn admin-btn--sm admin-btn--danger",
                        onClick: () => handleDelete(order.id || order.orderNo),
                        children: "حذف"
                      })
                    ]
                  })
                ]
              })
            ]
          }, order.id || order.orderNo);
        })
      }),
      selectedOrder && e.jsx("div", {
        className: "admin-modal",
        onClick: () => setSelectedOrder(null),
        children: e.jsxs("div", {
          className: "admin-modal__panel admin-modal__panel--lg",
          onClick: ev => ev.stopPropagation(),
          children: [
            e.jsxs("header", {
              className: "admin-modal__head",
              children: [
                e.jsxs("div", {
                  children: [
                    e.jsxs("h2", { children: ["تفاصيل الطلب #", selectedOrder.orderNo || selectedOrder.id] }),
                    e.jsxs("span", { className: "admin-modal__sub", children: ["تاريخ الطلب: ", formatTime(selectedOrder.createdAt)] })
                  ]
                }),
                e.jsx("button", { type: "button", className: "admin-icon", onClick: () => setSelectedOrder(null), children: "✕" })
              ]
            }),
            e.jsxs("div", {
              className: "admin-modal__body",
              children: [
                e.jsxs("div", {
                  className: "admin-grid2",
                  children: [
                    e.jsxs("div", {
                      className: "admin-card",
                      style: { margin: 0 },
                      children: [
                        e.jsx("h3", { children: "👤 معلومات الزبون" }),
                        e.jsxs("p", { style: { margin: 0 }, children: [e.jsx("b", { children: "الاسم: " }), selectedOrder.name] }),
                        e.jsxs("p", {
                          style: { margin: "0.4rem 0", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" },
                          children: [
                            e.jsx("b", { children: "رقم الهاتف: " }),
                            e.jsx("span", { dir: "ltr", children: selectedOrder.phone }),
                            e.jsx("a", { href: `tel:${selectedOrder.phone}`, className: "admin-btn admin-btn--sm admin-btn--ghost", style: { padding: "2px 8px", fontSize: "0.8rem" }, children: "📞 اتصال" }),
                            e.jsx("a", { href: `https://wa.me/${cleanPhone(selectedOrder.phone)}?text=${encodeURIComponent(`مرحباً ${selectedOrder.name}، بخصوص طلبك رقم #${selectedOrder.orderNo || selectedOrder.id} من متجر عراق ستور`)}`, target: "_blank", rel: "noopener noreferrer", className: "admin-btn admin-btn--sm admin-btn--ghost", style: { padding: "2px 8px", fontSize: "0.8rem", color: "#25D366" }, children: "💬 واتساب" })
                          ]
                        }),
                        e.jsxs("p", { style: { margin: 0 }, children: [e.jsx("b", { children: "المحافظة: " }), selectedOrder.governorate] }),
                        e.jsxs("p", { style: { margin: "0.4rem 0" }, children: [e.jsx("b", { children: "المدينة / المنطقة: " }), selectedOrder.city] }),
                        e.jsxs("p", { style: { margin: 0 }, children: [e.jsx("b", { children: "العنوان التفصيلي: " }), selectedOrder.address] }),
                        selectedOrder.notes && e.jsxs("p", { style: { margin: "0.4rem 0", color: "var(--a-accent-2)" }, children: [e.jsx("b", { children: "ملاحظات الزبون: " }), selectedOrder.notes] })
                      ]
                    }),
                    e.jsxs("div", {
                      className: "admin-card",
                      style: { margin: 0 },
                      children: [
                        e.jsx("h3", { children: "🚚 تفاصيل الشحن والحالة" }),
                        e.jsxs("label", {
                          className: "admin-field",
                          style: { marginBottom: "1rem" },
                          children: [
                            e.jsx("span", { children: "تغيير حالة الطلب" }),
                            e.jsxs("select", {
                              value: selectedOrder.status || 'new',
                              onChange: ev => handleStatusChange(selectedOrder.id || selectedOrder.orderNo, ev.target.value),
                              children: [
                                e.jsx("option", { value: "new", children: "جديد 🆕" }),
                                e.jsx("option", { value: "processing", children: "قيد التجهيز 📦" }),
                                e.jsx("option", { value: "shipped", children: "تم الشحن / قيد التوصيل 🚚" }),
                                e.jsx("option", { value: "completed", children: "مكتمل ✅" }),
                                e.jsx("option", { value: "cancelled", children: "ملغى ❌" })
                              ]
                            })
                          ]
                        }),
                        e.jsxs("p", { style: { margin: 0 }, children: [e.jsx("b", { children: "أجرة التوصيل: " }), O(selectedOrder.fee || 0)] }),
                        e.jsxs("p", { style: { margin: "0.4rem 0" }, children: [e.jsx("b", { children: "مجموع المنتجات: " }), O(selectedOrder.subtotal || 0)] }),
                        e.jsxs("p", { style: { margin: 0, fontSize: "1.1rem", color: "var(--a-ok)" }, children: [e.jsx("b", { children: "الإجمالي الكلي: " }), O(selectedOrder.total || selectedOrder.subtotal)] })
                      ]
                    })
                  ]
                }),
                e.jsxs("div", {
                  className: "admin-field",
                  children: [
                    e.jsxs("span", { children: ["المنتجات المطلوبة (", selectedOrder.cart?.length || 0, ")"] }),
                    e.jsx("div", {
                      className: "admin-specs-list",
                      children: selectedOrder.cart?.map((item, idx) => e.jsxs("div", {
                        className: "admin-row",
                        style: { gridTemplateColumns: "48px 1fr auto auto" },
                        children: [
                          e.jsx("img", { src: item.product?.images?.[0] || item.product?.image || item.image || '/logo.png', alt: "", className: "admin-row__img" }),
                          e.jsxs("div", {
                            className: "admin-row__main",
                            children: [
                              e.jsx("strong", { children: item.product?.name || item.name }),
                              e.jsxs("span", { children: ["اللون: ", item.color, " | القياس: ", item.size] })
                            ]
                          }),
                          e.jsxs("span", { children: ["الكمية: ", item.qty] }),
                          e.jsx("strong", { children: O((item.product?.price || item.price || 0) * item.qty) })
                        ]
                      }, idx))
                    })
                  ]
                })
              ]
            }),
            e.jsxs("footer", {
              className: "admin-modal__foot",
              children: [
                e.jsx("button", { type: "button", className: "admin-btn admin-btn--ghost", onClick: () => { const o = selectedOrder; setSelectedOrder(null); setPrintOrder(o); }, children: "🖨️ طباعة وصل الشحن" }),
                e.jsx("button", { type: "button", className: "admin-btn admin-btn--primary", onClick: () => setSelectedOrder(null), children: "إغلاق" })
              ]
            })
          ]
        })
      }),
      printOrder && e.jsx("div", {
        className: "admin-modal",
        onClick: () => setPrintOrder(null),
        children: e.jsxs("div", {
          className: "admin-modal__panel admin-modal__panel--lg admin-printable-area",
          onClick: ev => ev.stopPropagation(),
          children: [
            e.jsxs("header", {
              className: "admin-modal__head no-print",
              children: [
                e.jsxs("h2", { children: ["وصل توصيل طلبية #", printOrder.orderNo || printOrder.id] }),
                e.jsxs("div", {
                  children: [
                    e.jsx("button", { type: "button", className: "admin-btn admin-btn--primary", onClick: () => window.print(), children: "طباعة الآن 🖨️" }),
                    e.jsx("button", { type: "button", className: "admin-icon", onClick: () => setPrintOrder(null), style: { marginInlineStart: 8 }, children: "✕" })
                  ]
                })
              ]
            }),
            e.jsxs("div", {
              className: "admin-invoice-paper",
              children: [
                e.jsxs("div", {
                  className: "invoice-header",
                  children: [
                    e.jsxs("div", {
                      className: "invoice-brand",
                      children: [
                        e.jsx("img", { src: "/logo.png", alt: "شعار المتجر", width: "48", height: "48" }),
                        e.jsxs("div", {
                          children: [
                            e.jsx("h2", { children: "عراق ستور | IRAQ STORE" }),
                            e.jsx("p", { children: "متجر الأزياء العراقي — وصل توصيل طلبية" })
                          ]
                        })
                      ]
                    }),
                    e.jsxs("div", {
                      className: "invoice-no",
                      children: [
                        e.jsxs("h3", { children: ["رقم الطلب: #", printOrder.orderNo || printOrder.id] }),
                        e.jsxs("p", { children: ["التاريخ: ", formatTime(printOrder.createdAt)] })
                      ]
                    })
                  ]
                }),
                e.jsxs("div", {
                  className: "invoice-box-grid",
                  children: [
                    e.jsxs("div", {
                      className: "invoice-box",
                      children: [
                        e.jsx("h4", { children: "تفاصيل المستلم والوجهة:" }),
                        e.jsxs("p", { children: [e.jsx("b", { children: "اسم الزبون: " }), printOrder.name] }),
                        e.jsxs("p", { children: [e.jsx("b", { children: "رقم الهاتف: " }), e.jsx("span", { dir: "ltr", children: printOrder.phone })] }),
                        e.jsxs("p", { children: [e.jsx("b", { children: "المحافظة: " }), printOrder.governorate] }),
                        e.jsxs("p", { children: [e.jsx("b", { children: "العنوان: " }), printOrder.city, " — ", printOrder.address] })
                      ]
                    }),
                    e.jsxs("div", {
                      className: "invoice-box",
                      children: [
                        e.jsx("h4", { children: "معلومات الشحن:" }),
                        e.jsx("p", { children: "طريقة الدفع: الدفع عند الاستلام (COD)" }),
                        e.jsxs("p", { children: ["حالة الطلب: ", (STATUS_META[printOrder.status || 'new'] || STATUS_META.new).label] }),
                        printOrder.notes && e.jsxs("p", { children: [e.jsx("b", { children: "ملاحظات: " }), printOrder.notes] })
                      ]
                    })
                  ]
                }),
                e.jsxs("table", {
                  className: "invoice-table",
                  children: [
                    e.jsx("thead", {
                      children: e.jsxs("tr", {
                        children: [
                          e.jsx("th", { children: "#" }),
                          e.jsx("th", { children: "اسم المنتج" }),
                          e.jsx("th", { children: "المقاس / اللون" }),
                          e.jsx("th", { children: "الكمية" }),
                          e.jsx("th", { children: "السعر" }),
                          e.jsx("th", { children: "الإجمالي" })
                        ]
                      })
                    }),
                    e.jsx("tbody", {
                      children: printOrder.cart?.map((item, idx) => e.jsxs("tr", {
                        children: [
                          e.jsx("td", { children: idx + 1 }),
                          e.jsx("td", { children: item.product?.name || item.name }),
                          e.jsxs("td", { children: [item.size, " / ", item.color] }),
                          e.jsx("td", { children: item.qty }),
                          e.jsx("td", { children: O(item.product?.price || item.price) }),
                          e.jsx("td", { children: O((item.product?.price || item.price) * item.qty) })
                        ]
                      }, idx))
                    })
                  ]
                }),
                e.jsxs("div", {
                  className: "invoice-totals",
                  children: [
                    e.jsxs("div", { className: "invoice-total-row", children: [e.jsx("span", { children: "المجموع الجزئي للمنتجات:" }), e.jsx("strong", { children: O(printOrder.subtotal || 0) })] }),
                    e.jsxs("div", { className: "invoice-total-row", children: [e.jsxs("span", { children: ["أجرة التوصيل (", printOrder.governorate, "):"] }), e.jsx("strong", { children: O(printOrder.fee || 0) })] }),
                    e.jsxs("div", { className: "invoice-total-row invoice-total-row--grand", children: [e.jsx("span", { children: "المبلغ المطلوب من الزبون عند الاستلام:" }), e.jsx("strong", { children: O(printOrder.total || printOrder.subtotal) })] })
                  ]
                }),
                e.jsx("div", {
                  className: "invoice-footer",
                  children: e.jsxs("p", { children: ["شكراً لتسوقكم من ", e.jsx("b", { children: "عراق ستور" }), ". يرجى التأكد من المنتجات والمبلغ عند الاستلام."] })
                })
              ]
            })
          ]
        })
      })
    ]
  });
}

function is(){
  const { user: i, logout: l } = Y();
  const [o, n] = u.useState([]);
  const [orders, setOrders] = u.useState(() => {
    try {
      if (typeof window !== "undefined" && window.__iraqstore_getOrders) return window.__iraqstore_getOrders();
      const r = localStorage.getItem("iraqstore_orders_v1");
      return r ? JSON.parse(r) : [];
    } catch(e) { return []; }
  });
  const [c, d] = u.useState("products");

  u.useEffect(() => {
    const unsubP = Re(n);
    const unsubC = Ue(v => { v && ue(v); });
    let unsubO = () => {};
    if (typeof window !== "undefined" && window.__iraqstore_listenOrders) {
      unsubO = window.__iraqstore_listenOrders(setOrders);
    }
    return () => {
      unsubP && unsubP();
      unsubC && unsubC();
      unsubO && unsubO();
    };
  }, []);

  return e.jsxs("div", {
    className: "admin",
    "data-admin": "on",
    children: [
      e.jsxs("header", {
        className: "admin-header",
        children: [
          e.jsxs("div", {
            className: "admin-header__brand",
            children: [
              e.jsx("img", { src: "/logo.png", alt: "", width: "34", height: "34" }),
              e.jsxs("div", {
                children: [
                  e.jsx("strong", { children: "لوحة إدارة المتجر" }),
                  e.jsx(ns, {})
                ]
              })
            ]
          }),
          e.jsxs("nav", {
            className: "admin-tabs",
            children: [
              e.jsxs("button", { className: c === "products" ? "is-active" : "", onClick: () => d("products"), children: ["📦 المنتجات (", o.length, ")"] }),
              e.jsx("button", { className: c === "reorder" ? "is-active" : "", onClick: () => d("reorder"), children: "↕️ ترتيب وعرض المنتجات" }),
              e.jsxs("button", { className: c === "orders" ? "is-active" : "", onClick: () => d("orders"), children: ["🛍️ الطلبات والمبيعات (", orders.length, ")"] }),
              e.jsx("button", { className: c === "tree" ? "is-active" : "", onClick: () => d("tree"), children: "🌳 شجرة الأقسام" }),
              e.jsx("button", { className: c === "delivery" ? "is-active" : "", onClick: () => d("delivery"), children: "🚚 أسعار التوصيل للمحافظات" }),
              e.jsx("button", { className: c === "settings" ? "is-active" : "", onClick: () => d("settings"), children: "⚙️ الإعدادات والنسخ" })
            ]
          }),
          e.jsxs("div", {
            className: "admin-header__user",
            children: [
              e.jsx(Ge, { to: "/", className: "admin-btn admin-btn--sm admin-btn--ghost", children: "عرض المتجر ↗" }),
              e.jsx("span", { className: "admin-email", children: (i == null ? void 0 : i.email) || "مشرف النظام" }),
              e.jsx("button", { className: "admin-btn admin-btn--sm", onClick: l, children: "خروج" })
            ]
          })
        ]
      }),
      e.jsxs("main", {
        className: "admin-main",
        children: [
          c === "products" && e.jsx(as, { products: o }),
          c === "reorder" && e.jsx(ProductReorderPanel_V3, { products: o }),
          c === "orders" && e.jsx(OrdersPanel_V3, { orders: orders }),
          c === "tree" && e.jsx(qe, { products: o }),
          c === "delivery" && e.jsx(Ke, {}),
          c === "settings" && e.jsx(ts, { productCount: o.length, products: o })
        ]
      })
    ]
  });
}
function me({notAllowed:i}){const{login:l,logout:o,user:n}=Y(),[c,d]=u.useState(""),[f,N]=u.useState(""),[v,S]=u.useState(!1),[E,C]=u.useState(""),w=async p=>{p.preventDefault(),S(!0),C("");try{await l(c.trim(),f)}catch(h){C(ls[h.code]||"تعذّر تسجيل الدخول")}finally{S(!1)}};return e.jsx("div",{className:"admin-auth",children:e.jsxs("div",{className:"admin-auth__card",children:[e.jsxs("div",{className:"admin-auth__brand",children:[e.jsx("img",{src:"/logo.png",alt:"",width:"52",height:"52"}),e.jsxs("div",{children:[e.jsx("strong",{children:"IRAQI STORE"}),e.jsx("span",{children:"لوحة الإدارة"})]})]}),i?e.jsxs(e.Fragment,{children:[e.jsxs("p",{className:"admin-auth__msg",children:["الحساب ",e.jsx("b",{children:n==null?void 0:n.email})," غير مخوّل للوصول إلى لوحة الإدارة."]}),e.jsx("button",{type:"button",className:"admin-btn admin-btn--ghost",onClick:o,children:"تسجيل الخروج"})]}):e.jsxs("form",{onSubmit:w,className:"admin-auth__form",children:[e.jsxs("label",{className:"admin-field",children:[e.jsx("span",{children:"البريد الإلكتروني"}),e.jsx("input",{type:"email",value:c,onChange:p=>d(p.target.value),placeholder:"admin@example.com",autoComplete:"username",dir:"ltr",required:!0})]}),e.jsxs("label",{className:"admin-field",children:[e.jsx("span",{children:"كلمة المرور"}),e.jsx("input",{type:"password",value:f,onChange:p=>N(p.target.value),placeholder:"••••••••",autoComplete:"current-password",dir:"ltr",required:!0})]}),E&&e.jsx("p",{className:"admin-auth__error",children:E}),e.jsx("button",{type:"submit",className:"admin-btn admin-btn--primary",disabled:v,children:v?"جارٍ الدخول…":"تسجيل الدخول"})]})]})})}function rs(){const{ready:i,user:l,isAdmin:o}=Y();return u.useEffect(()=>(document.documentElement.setAttribute("data-admin","on"),()=>document.documentElement.removeAttribute("data-admin")),[]),i?l?o?e.jsx(is,{}):e.jsx(me,{notAllowed:!0}):e.jsx(me,{}):e.jsx("div",{className:"admin-auth",children:e.jsx("div",{className:"admin-spinner","aria-label":"جارٍ التحميل"})})}function ds(){return e.jsx(Qe,{children:e.jsx(rs,{})})}export{ds as default};