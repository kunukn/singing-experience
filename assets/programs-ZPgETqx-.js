import{L as e,N as t,R as n,Y as r,_ as i,d as a,f as o,l as s,u as c,w as l}from"./runtime-core.esm-bundler-DrRprvDE.js";import{i as u,n as d,t as f}from"./_plugin-vue_export-helper-CERK7lc3.js";var p=f(i({__name:`CardLink`,props:{to:{}},setup(i){return(a,o)=>{let s=n(`RouterLink`);return t(),c(s,{to:i.to,class:`card-link block cursor-pointer no-underline`},{default:r(()=>[e(a.$slots,`default`,{},void 0,!0)]),_:3},8,[`to`])}}}),[[`__scopeId`,`data-v-4820daa5`]]),m=u.extend({name:`card`,style:`
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
`,classes:{root:`p-card p-component`,header:`p-card-header`,body:`p-card-body`,caption:`p-card-caption`,title:`p-card-title`,subtitle:`p-card-subtitle`,content:`p-card-content`,footer:`p-card-footer`}}),h={name:`Card`,extends:{name:`BaseCard`,extends:d,style:m,provide:function(){return{$pcCard:this,$parentInstance:this}}},inheritAttrs:!1};function g(n,r,i,c,u,d){return t(),o(`div`,l({class:n.cx(`root`)},n.ptmi(`root`)),[n.$slots.header?(t(),o(`div`,l({key:0,class:n.cx(`header`)},n.ptm(`header`)),[e(n.$slots,`header`)],16)):a(``,!0),s(`div`,l({class:n.cx(`body`)},n.ptm(`body`)),[n.$slots.title||n.$slots.subtitle?(t(),o(`div`,l({key:0,class:n.cx(`caption`)},n.ptm(`caption`)),[n.$slots.title?(t(),o(`div`,l({key:0,class:n.cx(`title`)},n.ptm(`title`)),[e(n.$slots,`title`)],16)):a(``,!0),n.$slots.subtitle?(t(),o(`div`,l({key:1,class:n.cx(`subtitle`)},n.ptm(`subtitle`)),[e(n.$slots,`subtitle`)],16)):a(``,!0)],16)):a(``,!0),s(`div`,l({class:n.cx(`content`)},n.ptm(`content`)),[e(n.$slots,`content`)],16),n.$slots.footer?(t(),o(`div`,l({key:1,class:n.cx(`footer`)},n.ptm(`footer`)),[e(n.$slots,`footer`)],16)):a(``,!0)],16)],16)}h.render=g;var _=[{key:`singTone`,icon:`🎯`,route:`/sing-tone`},{key:`doReMi`,icon:`🎶`,route:`/do-re-mi`},{key:`singTheKeys`,icon:`🎹`,route:`/sing-the-keys`},{key:`graceKelly`,icon:`👑`,route:`/grace-kelly-challenge`},{key:`singFly`,icon:`🐦`,route:`/singfly`},{key:`pitchGame`,icon:`🎼`,route:`/pitch-game`}],v=[{key:`pitchDetector`,icon:`🎤`,route:`/pitch-detector`},{key:`warmUp`,icon:`🎙️`,route:`/warm-up`},{key:`notes`,icon:`🎵`,route:`/notes`},{key:`piano`,icon:`🎹`,route:`/piano`},{key:`guitar`,icon:`🎸`,route:`/guitar`},{key:`tuner`,icon:`🪕`,route:`/tuner`},{key:`toneDetector`,icon:`🎚️`,route:`/tone-detector`}],y=[{key:`singingTools`,icon:`🎛️`,route:`/tools`},{key:`singingGames`,icon:`🕹️`,route:`/games`}];export{p as a,h as i,y as n,v as r,_ as t};