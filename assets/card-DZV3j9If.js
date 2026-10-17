import{P as e,R as t,T as n,X as r,d as i,f as a,l as o,u as s,v as c,z as l}from"./runtime-core.esm-bundler-Yj51g2kL.js";import{i as u,n as d,t as f}from"./_plugin-vue_export-helper-D3JGZI6p.js";var p=f(c({__name:`CardLink`,props:{to:{}},setup(n){return(i,a)=>{let o=l(`RouterLink`);return e(),s(o,{to:n.to,class:`card-link block cursor-pointer no-underline`},{default:r(()=>[t(i.$slots,`default`,{},void 0,!0)]),_:3},8,[`to`])}}}),[[`__scopeId`,`data-v-4820daa5`]]),m=u.extend({name:`card`,style:`
    .p-card {
        background: dt('card.background');
        color: dt('card.color');
        box-shadow: dt('card.shadow');
        border-radius: dt('card.border.radius');
        display: flex;
        flex-direction: column;
    }

    .p-card-caption {
        display: flex;
        flex-direction: column;
        gap: dt('card.caption.gap');
    }

    .p-card-body {
        padding: dt('card.body.padding');
        display: flex;
        flex-direction: column;
        gap: dt('card.body.gap');
    }

    .p-card-title {
        font-size: dt('card.title.font.size');
        font-weight: dt('card.title.font.weight');
    }

    .p-card-subtitle {
        color: dt('card.subtitle.color');
    }
`,classes:{root:`p-card p-component`,header:`p-card-header`,body:`p-card-body`,caption:`p-card-caption`,title:`p-card-title`,subtitle:`p-card-subtitle`,content:`p-card-content`,footer:`p-card-footer`}}),h={name:`Card`,extends:{name:`BaseCard`,extends:d,style:m,provide:function(){return{$pcCard:this,$parentInstance:this}}},inheritAttrs:!1};function g(r,s,c,l,u,d){return e(),a(`div`,n({class:r.cx(`root`)},r.ptmi(`root`)),[r.$slots.header?(e(),a(`div`,n({key:0,class:r.cx(`header`)},r.ptm(`header`)),[t(r.$slots,`header`)],16)):i(``,!0),o(`div`,n({class:r.cx(`body`)},r.ptm(`body`)),[r.$slots.title||r.$slots.subtitle?(e(),a(`div`,n({key:0,class:r.cx(`caption`)},r.ptm(`caption`)),[r.$slots.title?(e(),a(`div`,n({key:0,class:r.cx(`title`)},r.ptm(`title`)),[t(r.$slots,`title`)],16)):i(``,!0),r.$slots.subtitle?(e(),a(`div`,n({key:1,class:r.cx(`subtitle`)},r.ptm(`subtitle`)),[t(r.$slots,`subtitle`)],16)):i(``,!0)],16)):i(``,!0),o(`div`,n({class:r.cx(`content`)},r.ptm(`content`)),[t(r.$slots,`content`)],16),r.$slots.footer?(e(),a(`div`,n({key:1,class:r.cx(`footer`)},r.ptm(`footer`)),[t(r.$slots,`footer`)],16)):i(``,!0)],16)],16)}h.render=g;export{p as n,h as t};