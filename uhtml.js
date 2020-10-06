window.uhtml=function(e){"use strict";var t=e=>({get:t=>e.get(t),set:(t,n)=>(e.set(t,n),n)});const n=/([^\s\\>"'=]+)\s*=\s*(['"]?)$/,r=/^(?:area|base|br|col|embed|hr|img|input|keygen|link|menuitem|meta|param|source|track|wbr)$/i,l=/<[a-z][^>]+$/i,s=/>[^<>]*$/,o=/<([a-z]+[a-z0-9:._-]*)([^>]*?)(\/>)/gi,i=/\s+$/,a=(e,t)=>0<t--&&(l.test(e[t])||!s.test(e[t])&&a(e,t)),c=(e,t,n)=>r.test(t)?e:`<${t}${n.replace(i,"")}></${t}>`;const{isArray:u}=Array,{indexOf:d,slice:p}=[],f=(e,t)=>111===e.nodeType?1/t<0?t?(({firstChild:e,lastChild:t})=>{const n=document.createRange();return n.setStartAfter(e),n.setEndAfter(t),n.deleteContents(),e})(e):e.lastChild:t?e.valueOf():e.firstChild:e;const h=e=>document.createElementNS("http://www.w3.org/1999/xhtml",e),m=(e,t)=>("svg"===t?v:g)(e),g=e=>{const t=h("template");return t.innerHTML=e,t.content},v=e=>{const{content:t}=h("template"),n=h("div");n.innerHTML='<svg xmlns="http://www.w3.org/2000/svg">'+e+"</svg>";const{childNodes:r}=n.firstChild;let{length:l}=r;for(;l--;)t.appendChild(r[0]);return t},y=({childNodes:e},t)=>e[t],w=e=>{const t=[];let{parentNode:n}=e;for(;n;)t.push(d.call(n.childNodes,e)),n=(e=n).parentNode;return t},{createTreeWalker:b,importNode:C}=document,N=1!=C.length,x=N?(e,t)=>C.call(document,m(e,t),!0):m,$=N?e=>b.call(document,e,129,null,!1):e=>b.call(document,e,129),k=(e,t,n)=>((e,t,n,r,l)=>{const s=n.length;let o=t.length,i=s,a=0,c=0,u=null;for(;a<o||c<i;)if(o===a){const t=i<s?c?r(n[c-1],-0).nextSibling:r(n[i-c],0):l;for(;c<i;)e.insertBefore(r(n[c++],1),t)}else if(i===c)for(;a<o;)u&&u.has(t[a])||e.removeChild(r(t[a],-1)),a++;else if(t[a]===n[c])a++,c++;else if(t[o-1]===n[i-1])o--,i--;else if(t[a]===n[i-1]&&n[c]===t[o-1]){const l=r(t[--o],-1).nextSibling;e.insertBefore(r(n[c++],1),r(t[a++],-1).nextSibling),e.insertBefore(r(n[--i],1),l),t[o]=n[i]}else{if(!u){u=new Map;let e=c;for(;e<i;)u.set(n[e],e++)}if(u.has(t[a])){const l=u.get(t[a]);if(c<l&&l<i){let s=a,d=1;for(;++s<o&&s<i&&u.get(t[s])===l+d;)d++;if(d>l-c){const s=r(t[a],0);for(;c<l;)e.insertBefore(r(n[c++],1),s)}else e.replaceChild(r(n[c++],1),r(t[a++],-1))}else a++}else e.removeChild(r(t[a++],-1))}return n})(e.parentNode,t,n,f,e),A=(e,t)=>"ref"===t?(e=>t=>{"function"==typeof t?t(e):t.current=e})(e):"aria"===t?(e=>t=>{for(const n in t){const r="role"===n?n:"aria-"+n,l=t[n];null==l?e.removeAttribute(r):e.setAttribute(r,l)}})(e):".dataset"===t?(({dataset:e})=>t=>{for(const n in t){const r=t[n];null==r?delete e[n]:e[n]=r}})(e):"."===t.slice(0,1)?((e,t)=>n=>{e[t]=n})(e,t.slice(1)):"on"===t.slice(0,2)?((e,t)=>{let n,r=t.slice(2);return!(t in e)&&t.toLowerCase()in e&&(r=r.toLowerCase()),t=>{const l=u(t)?t:[t,!1];n!==l[0]&&(n&&e.removeEventListener(r,n,l[1]),(n=l[0])&&e.addEventListener(r,n,l[1]))}})(e,t):((e,t)=>{let n,r=!0;const l=document.createAttributeNS(null,t);return t=>{n!==t&&(n=t,null==n?r||(e.removeAttributeNode(l),r=!0):(l.value=t,r&&(e.setAttributeNodeNS(l),r=!1)))}})(e,t);function E(e){const{type:t,path:n}=e,r=n.reduceRight(y,this);return"node"===t?(e=>{let t,n,r=[];const l=s=>{switch(typeof s){case"string":case"number":case"boolean":t!==s&&(t=s,n?n.textContent=s:n=document.createTextNode(s),r=k(e,r,[n]));break;case"object":case"undefined":if(null==s){t!=s&&(t=s,r=k(e,r,[]));break}if(u(s)){t=s,0===s.length?r=k(e,r,[]):"object"==typeof s[0]?r=k(e,r,s):l(String(s));break}"ELEMENT_NODE"in s&&t!==s&&(t=s,r=k(e,r,11===s.nodeType?p.call(s.childNodes):[s]))}};return l})(r):"attr"===t?A(r,e.name):(e=>{let t;return n=>{t!=n&&(t=n,e.textContent=null==n?"":n)}})(r)}const T="isµ",L=t(new WeakMap),M=(e,t)=>{const r=((e,t,r)=>{const l=[],{length:s}=e;for(let r=1;r<s;r++){const s=e[r-1];l.push(n.test(s)&&a(e,r)?s.replace(n,(e,n,l)=>`${t}${r-1}=${l||'"'}${n}${l?"":'"'}`):`${s}\x3c!--${t}${r-1}--\x3e`)}l.push(e[s-1]);const i=l.join("").trim();return r?i:i.replace(o,c)})(t,T,"svg"===e),l=x(r,e),s=$(l),i=[],u=t.length-1;let d=0,p="isµ"+d;for(;d<u;){const e=s.nextNode();if(!e)throw"bad template: "+r;if(8===e.nodeType)e.textContent===p&&(i.push({type:"node",path:w(e)}),p="isµ"+ ++d);else{for(;e.hasAttribute(p);)i.push({type:"attr",path:w(e),name:e.getAttribute(p)}),e.removeAttribute(p),p="isµ"+ ++d;/^(?:style|textarea)$/i.test(e.tagName)&&e.textContent.trim()===`\x3c!--${p}--\x3e`&&(i.push({type:"text",path:w(e)}),p="isµ"+ ++d)}}return{content:l,nodes:i}},O=(e,t)=>{const{content:n,nodes:r}=L.get(t)||L.set(t,M(e,t)),l=C.call(document,n,!0);return{content:l,updates:r.map(E,l)}},S=(e,{type:t,template:n,values:r})=>{const{length:l}=r;j(e,r,l);let{entry:s}=e;s&&s.template===n&&s.type===t||(e.entry=s=((e,t)=>{const{content:n,updates:r}=O(e,t);return{type:e,template:t,content:n,updates:r,wire:null}})(t,n));const{content:o,updates:i,wire:a}=s;for(let e=0;e<l;e++)i[e](r[e]);return a||(s.wire=(e=>{const{childNodes:t}=e,{length:n}=t;if(n<2)return n?t[0]:e;const r=p.call(t,0);return{ELEMENT_NODE:1,nodeType:111,firstChild:r[0],lastChild:r[n-1],valueOf(){if(t.length!==n){let t=0;for(;t<n;)e.appendChild(r[t++])}return e}}})(o))},j=({stack:e},t,n)=>{for(let r=0;r<n;r++){const n=t[r];n instanceof B?t[r]=S(e[r]||(e[r]={stack:[],entry:null,wire:null}),n):u(n)?j(e[r]||(e[r]={stack:[],entry:null,wire:null}),n,n.length):e[r]=null}n<e.length&&e.splice(n)};function B(e,t,n){this.type=e,this.template=t,this.values=n}const{create:W,defineProperties:z}=Object,H=e=>{const n=t(new WeakMap);return z((t,...n)=>new B(e,t,n),{for:{value(t,r){const l=n.get(t)||n.set(t,W(null));return l[r]||(l[r]=(t=>(n,...r)=>S(t,{type:e,template:n,values:r}))({stack:[],entry:null,wire:null}))}},node:{value:(t,...n)=>S({stack:[],entry:null,wire:null},{type:e,template:t,values:n}).valueOf()}})},_=t(new WeakMap),D=H("html"),R=H("svg");return e.Hole=B,e.html=D,e.render=(e,t)=>{const n="function"==typeof t?t():t,r=_.get(e)||_.set(e,{stack:[],entry:null,wire:null}),l=n instanceof B?S(r,n):n;return l!==r.wire&&(r.wire=l,e.textContent="",e.appendChild(l.valueOf())),e},e.svg=R,e}({});