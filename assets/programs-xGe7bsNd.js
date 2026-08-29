import{St as e,_ as t,b as n,et as r,k as i,mt as a,qt as o,v as s,xt as c,y as l}from"./runtime-core.esm-bundler-CJOrt7RF.js";import{i as u,n as d,t as f}from"./_plugin-vue_export-helper-6dnrnbtg.js";var p=f(i({__name:`CardLink`,props:{to:{}},setup(t){return(n,r)=>{let i=e(`RouterLink`);return a(),s(i,{to:t.to,class:`card-link block cursor-pointer no-underline`},{default:o(()=>[c(n.$slots,`default`,{},void 0,!0)]),_:3},8,[`to`])}}}),[[`__scopeId`,`data-v-4820daa5`]]),m=u.extend({name:`card`,style:`
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
`,classes:{root:`p-card p-component`,header:`p-card-header`,body:`p-card-body`,caption:`p-card-caption`,title:`p-card-title`,subtitle:`p-card-subtitle`,content:`p-card-content`,footer:`p-card-footer`}}),h={name:`Card`,extends:{name:`BaseCard`,extends:d,style:m,provide:function(){return{$pcCard:this,$parentInstance:this}}},inheritAttrs:!1};function g(e,i,o,s,u,d){return a(),n(`div`,r({class:e.cx(`root`)},e.ptmi(`root`)),[e.$slots.header?(a(),n(`div`,r({key:0,class:e.cx(`header`)},e.ptm(`header`)),[c(e.$slots,`header`)],16)):l(``,!0),t(`div`,r({class:e.cx(`body`)},e.ptm(`body`)),[e.$slots.title||e.$slots.subtitle?(a(),n(`div`,r({key:0,class:e.cx(`caption`)},e.ptm(`caption`)),[e.$slots.title?(a(),n(`div`,r({key:0,class:e.cx(`title`)},e.ptm(`title`)),[c(e.$slots,`title`)],16)):l(``,!0),e.$slots.subtitle?(a(),n(`div`,r({key:1,class:e.cx(`subtitle`)},e.ptm(`subtitle`)),[c(e.$slots,`subtitle`)],16)):l(``,!0)],16)):l(``,!0),t(`div`,r({class:e.cx(`content`)},e.ptm(`content`)),[c(e.$slots,`content`)],16),e.$slots.footer?(a(),n(`div`,r({key:1,class:e.cx(`footer`)},e.ptm(`footer`)),[c(e.$slots,`footer`)],16)):l(``,!0)],16)],16)}h.render=g;var _=[{key:`singTone`,icon:`🎯`,route:`/sing-tone`},{key:`doReMi`,icon:`🎶`,route:`/do-re-mi`},{key:`graceKelly`,icon:`👑`,route:`/grace-kelly-challenge`},{key:`singFly`,icon:`🐦`,route:`/singfly`},{key:`pitchGame`,icon:`🎼`,route:`/pitch-game`}],v=[{key:`pitchDetector`,icon:`🎤`,route:`/pitch-detector`},{key:`warmUp`,icon:`🎙️`,route:`/warm-up`},{key:`notes`,icon:`🎵`,route:`/notes`},{key:`piano`,icon:`🎹`,route:`/piano`},{key:`guitar`,icon:`🎸`,route:`/guitar`},{key:`tuner`,icon:`🪕`,route:`/tuner`},{key:`toneDetector`,icon:`🎚️`,route:`/tone-detector`}],y=[{key:`singingTools`,icon:`🎛️`,route:`/tools`},{key:`singingGames`,icon:`🕹️`,route:`/games`}];export{p as a,h as i,y as n,v as r,_ as t};