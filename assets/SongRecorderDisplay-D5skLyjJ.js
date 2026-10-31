import{B as e,E as t,G as n,J as r,L as i,Lt as a,M as o,P as s,Pt as c,R as l,Rt as u,T as d,V as f,X as p,Z as m,_ as h,_t as g,c as _,ct as v,d as y,dt as b,f as x,g as S,j as C,l as w,nt as T,r as E,u as D,v as O,w as k,z as A}from"./runtime-core.esm-bundler-De5B8hPt.js";import{a as j,d as M,g as N,t as P}from"./select-M03v98aA.js";import{n as F}from"./vue-i18n-BIuiwkC_.js";import{r as I,t as L}from"./basecomponent-vwkaJiGB.js";import{n as R,t as z}from"./button-DU2yIWrQ.js";import{t as B}from"./classnames-CRHlWn3X.js";import{c as V,f as H,l as ee,p as te,s as U,u as ne}from"./dist-Da1grKSA.js";import{r as re}from"./useSettings-CJFmjzPg.js";import{t as ie}from"./_plugin-vue_export-helper-BDNMzG2s.js";import{b as ae,f as oe,m as se,v as ce,y as le}from"./noteUtils-WUbbAqvv.js";import{r as ue}from"./voiceRanges-DVc8Ca0B.js";import{n as de,r as fe,t as W}from"./PreviewToggle-CfhSRYfM.js";import{t as G}from"./VoiceRangeSelect-B9sOW0eE.js";import{t as pe}from"./selectbutton-CZcFsUD6.js";import{n as me,t as he}from"./xstate-vue.esm-BZaywbwO.js";import{t as ge}from"./useTonePlayer-BmcBH4nO.js";import{t as _e}from"./useScrollEdgeMask-BY2zSb2u.js";import{t as ve}from"./useIdlePreview-U9Elnf5k.js";import{t as ye}from"./useVoiceRangeIndex-qIxnR2oY.js";import{a as K,i as q,n as J,r as Y,t as be}from"./useStableSungLabel-Dd26qm5i.js";import{o as xe}from"./notesScales-DZtmcJeD.js";import{r as Se,t as Ce}from"./toneLabelMode-AB5hhJKX.js";import{n as we}from"./notesAbc-DQBkYURQ.js";import{t as Te}from"./textarea-DGLerSEj.js";import{n as Ee,t as De}from"./KeyboardHintsToggle-gbrFQadY.js";import{t as Oe}from"./useKeyboardHints-DUVZl-Ce.js";import{a as ke,n as Ae,o as je,t as X}from"./noteSegmenter-DrR9C5O7.js";var Z=I.extend({name:`message`,style:`
    .p-message {
        display: grid;
        grid-template-rows: 1fr;
        border-radius: dt('message.border.radius');
        outline-width: dt('message.border.width');
        outline-style: solid;
    }

    .p-message-content-wrapper {
        min-height: 0;
    }

    .p-message-content {
        display: flex;
        align-items: center;
        padding: dt('message.content.padding');
        gap: dt('message.content.gap');
    }

    .p-message-icon {
        flex-shrink: 0;
    }

    .p-message-close-button {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        margin-inline-start: auto;
        overflow: hidden;
        position: relative;
        width: dt('message.close.button.width');
        height: dt('message.close.button.height');
        border-radius: dt('message.close.button.border.radius');
        background: transparent;
        transition:
            background dt('message.transition.duration'),
            color dt('message.transition.duration'),
            outline-color dt('message.transition.duration'),
            box-shadow dt('message.transition.duration'),
            opacity 0.3s;
        outline-color: transparent;
        color: inherit;
        padding: 0;
        border: none;
        cursor: pointer;
        user-select: none;
    }

    .p-message-close-icon {
        font-size: dt('message.close.icon.size');
        width: dt('message.close.icon.size');
        height: dt('message.close.icon.size');
    }

    .p-message-close-button:focus-visible {
        outline-width: dt('message.close.button.focus.ring.width');
        outline-style: dt('message.close.button.focus.ring.style');
        outline-offset: dt('message.close.button.focus.ring.offset');
    }

    .p-message-info {
        background: dt('message.info.background');
        outline-color: dt('message.info.border.color');
        color: dt('message.info.color');
        box-shadow: dt('message.info.shadow');
    }

    .p-message-info .p-message-close-button:focus-visible {
        outline-color: dt('message.info.close.button.focus.ring.color');
        box-shadow: dt('message.info.close.button.focus.ring.shadow');
    }

    .p-message-info .p-message-close-button:hover {
        background: dt('message.info.close.button.hover.background');
    }

    .p-message-info.p-message-outlined {
        color: dt('message.info.outlined.color');
        outline-color: dt('message.info.outlined.border.color');
    }

    .p-message-info.p-message-simple {
        color: dt('message.info.simple.color');
    }

    .p-message-success {
        background: dt('message.success.background');
        outline-color: dt('message.success.border.color');
        color: dt('message.success.color');
        box-shadow: dt('message.success.shadow');
    }

    .p-message-success .p-message-close-button:focus-visible {
        outline-color: dt('message.success.close.button.focus.ring.color');
        box-shadow: dt('message.success.close.button.focus.ring.shadow');
    }

    .p-message-success .p-message-close-button:hover {
        background: dt('message.success.close.button.hover.background');
    }

    .p-message-success.p-message-outlined {
        color: dt('message.success.outlined.color');
        outline-color: dt('message.success.outlined.border.color');
    }

    .p-message-success.p-message-simple {
        color: dt('message.success.simple.color');
    }

    .p-message-warn {
        background: dt('message.warn.background');
        outline-color: dt('message.warn.border.color');
        color: dt('message.warn.color');
        box-shadow: dt('message.warn.shadow');
    }

    .p-message-warn .p-message-close-button:focus-visible {
        outline-color: dt('message.warn.close.button.focus.ring.color');
        box-shadow: dt('message.warn.close.button.focus.ring.shadow');
    }

    .p-message-warn .p-message-close-button:hover {
        background: dt('message.warn.close.button.hover.background');
    }

    .p-message-warn.p-message-outlined {
        color: dt('message.warn.outlined.color');
        outline-color: dt('message.warn.outlined.border.color');
    }

    .p-message-warn.p-message-simple {
        color: dt('message.warn.simple.color');
    }

    .p-message-error {
        background: dt('message.error.background');
        outline-color: dt('message.error.border.color');
        color: dt('message.error.color');
        box-shadow: dt('message.error.shadow');
    }

    .p-message-error .p-message-close-button:focus-visible {
        outline-color: dt('message.error.close.button.focus.ring.color');
        box-shadow: dt('message.error.close.button.focus.ring.shadow');
    }

    .p-message-error .p-message-close-button:hover {
        background: dt('message.error.close.button.hover.background');
    }

    .p-message-error.p-message-outlined {
        color: dt('message.error.outlined.color');
        outline-color: dt('message.error.outlined.border.color');
    }

    .p-message-error.p-message-simple {
        color: dt('message.error.simple.color');
    }

    .p-message-secondary {
        background: dt('message.secondary.background');
        outline-color: dt('message.secondary.border.color');
        color: dt('message.secondary.color');
        box-shadow: dt('message.secondary.shadow');
    }

    .p-message-secondary .p-message-close-button:focus-visible {
        outline-color: dt('message.secondary.close.button.focus.ring.color');
        box-shadow: dt('message.secondary.close.button.focus.ring.shadow');
    }

    .p-message-secondary .p-message-close-button:hover {
        background: dt('message.secondary.close.button.hover.background');
    }

    .p-message-secondary.p-message-outlined {
        color: dt('message.secondary.outlined.color');
        outline-color: dt('message.secondary.outlined.border.color');
    }

    .p-message-secondary.p-message-simple {
        color: dt('message.secondary.simple.color');
    }

    .p-message-contrast {
        background: dt('message.contrast.background');
        outline-color: dt('message.contrast.border.color');
        color: dt('message.contrast.color');
        box-shadow: dt('message.contrast.shadow');
    }

    .p-message-contrast .p-message-close-button:focus-visible {
        outline-color: dt('message.contrast.close.button.focus.ring.color');
        box-shadow: dt('message.contrast.close.button.focus.ring.shadow');
    }

    .p-message-contrast .p-message-close-button:hover {
        background: dt('message.contrast.close.button.hover.background');
    }

    .p-message-contrast.p-message-outlined {
        color: dt('message.contrast.outlined.color');
        outline-color: dt('message.contrast.outlined.border.color');
    }

    .p-message-contrast.p-message-simple {
        color: dt('message.contrast.simple.color');
    }

    .p-message-text {
        font-size: dt('message.text.font.size');
        font-weight: dt('message.text.font.weight');
    }

    .p-message-icon {
        font-size: dt('message.icon.size');
        width: dt('message.icon.size');
        height: dt('message.icon.size');
    }

    .p-message-sm .p-message-content {
        padding: dt('message.content.sm.padding');
    }

    .p-message-sm .p-message-text {
        font-size: dt('message.text.sm.font.size');
    }

    .p-message-sm .p-message-icon {
        font-size: dt('message.icon.sm.size');
        width: dt('message.icon.sm.size');
        height: dt('message.icon.sm.size');
    }

    .p-message-sm .p-message-close-icon {
        font-size: dt('message.close.icon.sm.size');
        width: dt('message.close.icon.sm.size');
        height: dt('message.close.icon.sm.size');
    }

    .p-message-lg .p-message-content {
        padding: dt('message.content.lg.padding');
    }

    .p-message-lg .p-message-text {
        font-size: dt('message.text.lg.font.size');
    }

    .p-message-lg .p-message-icon {
        font-size: dt('message.icon.lg.size');
        width: dt('message.icon.lg.size');
        height: dt('message.icon.lg.size');
    }

    .p-message-lg .p-message-close-icon {
        font-size: dt('message.close.icon.lg.size');
        width: dt('message.close.icon.lg.size');
        height: dt('message.close.icon.lg.size');
    }

    .p-message-outlined {
        background: transparent;
        outline-width: dt('message.outlined.border.width');
    }

    .p-message-simple {
        background: transparent;
        outline-color: transparent;
        box-shadow: none;
    }

    .p-message-simple .p-message-content {
        padding: dt('message.simple.content.padding');
    }

    .p-message-outlined .p-message-close-button:hover,
    .p-message-simple .p-message-close-button:hover {
        background: transparent;
    }

    .p-message-enter-active {
        animation: p-animate-message-enter 0.3s ease-out forwards;
        overflow: hidden;
    }

    .p-message-leave-active {
        animation: p-animate-message-leave 0.15s ease-in forwards;
        overflow: hidden;
    }

    @keyframes p-animate-message-enter {
        from {
            opacity: 0;
            grid-template-rows: 0fr;
        }
        to {
            opacity: 1;
            grid-template-rows: 1fr;
        }
    }

    @keyframes p-animate-message-leave {
        from {
            opacity: 1;
            grid-template-rows: 1fr;
        }
        to {
            opacity: 0;
            margin: 0;
            grid-template-rows: 0fr;
        }
    }
`,classes:{root:function(e){var t=e.props;return[`p-message p-component p-message-`+t.severity,{"p-message-outlined":t.variant===`outlined`,"p-message-simple":t.variant===`simple`,"p-message-sm":t.size===`small`,"p-message-lg":t.size===`large`}]},contentWrapper:`p-message-content-wrapper`,content:`p-message-content`,icon:`p-message-icon`,text:`p-message-text`,closeButton:`p-message-close-button`,closeIcon:`p-message-close-icon`}}),Me={name:`BaseMessage`,extends:L,props:{severity:{type:String,default:`info`},closable:{type:Boolean,default:!1},life:{type:Number,default:null},icon:{type:String,default:void 0},closeIcon:{type:String,default:void 0},closeButtonProps:{type:null,default:null},size:{type:String,default:null},variant:{type:String,default:null}},style:Z,provide:function(){return{$pcMessage:this,$parentInstance:this}}};function Q(e){"@babel/helpers - typeof";return Q=typeof Symbol==`function`&&typeof Symbol.iterator==`symbol`?function(e){return typeof e}:function(e){return e&&typeof Symbol==`function`&&e.constructor===Symbol&&e!==Symbol.prototype?`symbol`:typeof e},Q(e)}function Ne(e,t,n){return(t=Pe(t))in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function Pe(e){var t=Fe(e,`string`);return Q(t)==`symbol`?t:t+``}function Fe(e,t){if(Q(e)!=`object`||!e)return e;var n=e[Symbol.toPrimitive];if(n!==void 0){var r=n.call(e,t);if(Q(r)!=`object`)return r;throw TypeError(`@@toPrimitive must return a primitive value.`)}return(t===`string`?String:Number)(e)}var Ie={name:`Message`,extends:Me,inheritAttrs:!1,emits:[`close`,`life-end`],timeout:null,data:function(){return{visible:!0}},mounted:function(){var e=this;this.life&&setTimeout(function(){e.visible=!1,e.$emit(`life-end`)},this.life)},methods:{close:function(e){this.visible=!1,this.$emit(`close`,e)}},computed:{closeAriaLabel:function(){return this.$primevue.config.locale.aria?this.$primevue.config.locale.aria.close:void 0},dataP:function(){return B(Ne(Ne({outlined:this.variant===`outlined`,simple:this.variant===`simple`},this.severity,this.severity),this.size,this.size))}},directives:{ripple:R},components:{TimesIcon:j}};function Le(e){"@babel/helpers - typeof";return Le=typeof Symbol==`function`&&typeof Symbol.iterator==`symbol`?function(e){return typeof e}:function(e){return e&&typeof Symbol==`function`&&e.constructor===Symbol&&e!==Symbol.prototype?`symbol`:typeof e},Le(e)}function Re(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter(function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable})),n.push.apply(n,r)}return n}function ze(e){for(var t=1;t<arguments.length;t++){var n=arguments[t]==null?{}:arguments[t];t%2?Re(Object(n),!0).forEach(function(t){Be(e,t,n[t])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):Re(Object(n)).forEach(function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))})}return e}function Be(e,t,n){return(t=Ve(t))in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function Ve(e){var t=He(e,`string`);return Le(t)==`symbol`?t:t+``}function He(e,t){if(Le(e)!=`object`||!e)return e;var n=e[Symbol.toPrimitive];if(n!==void 0){var r=n.call(e,t);if(Le(r)!=`object`)return r;throw TypeError(`@@toPrimitive must return a primitive value.`)}return(t===`string`?String:Number)(e)}var $=[`data-p`],Ue=[`data-p`],We=[`data-p`],Ge=[`aria-label`,`data-p`],Ke=[`data-p`];function qe(t,n,r,i,a,o){var u=A(`TimesIcon`),h=e(`ripple`);return s(),D(M,d({name:`p-message`,appear:``},t.ptmi(`transition`)),{default:p(function(){return[a.visible?(s(),x(`div`,d({key:0,class:t.cx(`root`),role:`alert`,"aria-live":`assertive`,"aria-atomic":`true`,"data-p":o.dataP},t.ptm(`root`)),[w(`div`,d({class:t.cx(`contentWrapper`)},t.ptm(`contentWrapper`)),[t.$slots.container?l(t.$slots,`container`,{key:0,closeCallback:o.close}):(s(),x(`div`,d({key:1,class:t.cx(`content`),"data-p":o.dataP},t.ptm(`content`)),[l(t.$slots,`icon`,{class:c(t.cx(`icon`))},function(){return[(s(),D(f(t.icon?`span`:null),d({class:[t.cx(`icon`),t.icon],"data-p":o.dataP},t.ptm(`icon`)),null,16,[`class`,`data-p`]))]}),t.$slots.default?(s(),x(`div`,d({key:0,class:t.cx(`text`),"data-p":o.dataP},t.ptm(`text`)),[l(t.$slots,`default`)],16,We)):y(``,!0),t.closable?m((s(),x(`button`,d({key:1,class:t.cx(`closeButton`),"aria-label":o.closeAriaLabel,type:`button`,onClick:n[0]||=function(e){return o.close(e)},"data-p":o.dataP},ze(ze({},t.closeButtonProps),t.ptm(`closeButton`))),[l(t.$slots,`closeicon`,{},function(){return[t.closeIcon?(s(),x(`i`,d({key:0,class:[t.cx(`closeIcon`),t.closeIcon],"data-p":o.dataP},t.ptm(`closeIcon`)),null,16,Ke)):(s(),D(u,d({key:1,class:[t.cx(`closeIcon`),t.closeIcon],"data-p":o.dataP},t.ptm(`closeIcon`)),null,16,[`class`,`data-p`]))]})],16,Ge)),[[h]]):y(``,!0)],16,Ue))],16)],16,$)):y(``,!0)]}),_:3},16)}Ie.render=qe;var Je={id:`song-recorder-abc-body`,class:`flex flex-col gap-2`},Ye={class:`flex flex-wrap items-center justify-between gap-2`},Xe={class:`flex flex-wrap items-center gap-2`},Ze=1500,Qe=O({__name:`SongRecorderAbcEditor`,props:k({isImportDisabled:{type:Boolean},message:{},sheetAbc:{}},{modelValue:{required:!0},modelModifiers:{}}),emits:k([`import`,`edit`],[`update:modelValue`]),setup(e,{emit:r}){let i=e,a=r,o=n(e,`modelValue`),{t:c}=F(),l=v(null),d=U(`syng.songRecorderAbcExpanded`,!1);async function f(){d.value=!d.value,d.value&&(await t(),l.value?.querySelector(`textarea`)?.focus())}let b=_(()=>o.value.trim()===``),C=H(!1,Ze);async function T(){try{await navigator.clipboard.writeText(o.value),C.value=!0}catch{l.value?.querySelector(`textarea`)?.select()}}function E(){o.value=``,a(`edit`)}function O(){i.sheetAbc!==null&&(o.value=i.sheetAbc,a(`edit`))}let k=_(()=>i.sheetAbc===null||o.value===i.sheetAbc);return(e,t)=>{let n=z,r=Te,_=Ie;return s(),x(`div`,{ref_key:`editorRef`,ref:l,class:`flex w-full flex-col gap-2`},[h(n,{severity:`secondary`,text:``,size:`small`,icon:g(d)?`pi pi-chevron-down`:`pi pi-chevron-right`,label:g(c)(`songRecorder.abcLabel`),"aria-expanded":g(d),"aria-controls":`song-recorder-abc-body`,class:`self-start`,"data-testid":`song-recorder-abc-toggle`,onClick:f},null,8,[`icon`,`label`,`aria-expanded`]),m(w(`div`,Je,[h(r,{id:`song-recorder-abc`,modelValue:o.value,"onUpdate:modelValue":t[0]||=e=>o.value=e,rows:`7`,class:`w-full font-mono text-sm`,spellcheck:`false`,autocapitalize:`off`,autocorrect:`off`,"aria-label":g(c)(`songRecorder.abcLabel`),placeholder:g(c)(`songRecorder.abcPlaceholder`),"data-testid":`song-recorder-abc`,onInput:t[1]||=e=>a(`edit`)},null,8,[`modelValue`,`aria-label`,`placeholder`]),w(`div`,Ye,[h(n,{severity:`secondary`,text:``,size:`small`,icon:`pi pi-trash`,label:g(c)(`generic.clear`),disabled:g(b),"data-testid":`song-recorder-abc-clear`,onClick:E},null,8,[`label`,`disabled`]),w(`div`,Xe,[h(n,{severity:`secondary`,size:`small`,icon:`pi pi-replay`,label:g(c)(`songRecorder.fromSheet`),title:g(c)(`songRecorder.fromSheetHint`),disabled:g(k),"data-testid":`song-recorder-abc-from-sheet`,onClick:O},null,8,[`label`,`title`,`disabled`]),h(n,{severity:`secondary`,size:`small`,icon:g(C)?`pi pi-check`:`pi pi-copy`,label:g(C)?g(c)(`generic.copied`):g(c)(`generic.copy`),disabled:g(b),"data-testid":`song-recorder-abc-copy`,onClick:T},null,8,[`icon`,`label`,`disabled`]),h(n,{size:`small`,icon:`pi pi-upload`,label:g(c)(`songRecorder.import`),disabled:i.isImportDisabled||g(b),"data-testid":`song-recorder-abc-import`,onClick:t[2]||=e=>a(`import`)},null,8,[`label`,`disabled`])])]),i.message?(s(),D(_,{key:0,severity:i.message.severity,size:`small`,"data-testid":`song-recorder-abc-message`,"data-severity":i.message.severity},{default:p(()=>[S(u(i.message.text),1)]),_:1},8,[`severity`,`data-severity`])):y(``,!0)],512),[[N,g(d)]])],512)}}}),$e={class:`flex w-full flex-col gap-2`},et={class:`mx-auto flex w-full max-w-180 flex-col`},tt={id:`song-recorder-piano-body`,class:`flex w-full flex-col gap-2`},nt={class:`flex items-center justify-center gap-2`},rt={key:0,class:`mx-auto w-full max-w-400`},it=O({__name:`SongRecorderPianoPanel`,props:{isPianoInput:{type:Boolean},previewLanes:{},isPreviewEnabled:{type:Boolean}},emits:[`notePressed`,`noteReleased`,`tonePlayed`],setup(e,{emit:t}){let n=e,i=t,{t:a}=F(),o=U(`syng.songRecorderPianoExpanded`,!1);r(()=>n.isPianoInput,e=>{e&&(o.value=!0)});let c=ye(`syng.rangeIndex`),l=_(()=>ue[c.value]),{areKeyboardHintsVisible:u}=Oe(),d=V(`(pointer: coarse)`);return(t,n)=>{let r=z,f=G,p=De,_=Ee;return s(),x(`div`,$e,[w(`div`,et,[h(r,{severity:`secondary`,text:``,size:`small`,icon:g(o)?`pi pi-chevron-down`:`pi pi-chevron-right`,label:g(a)(`songRecorder.pianoLabel`),"aria-expanded":g(o),"aria-controls":`song-recorder-piano-body`,class:`self-start`,"data-testid":`song-recorder-piano-toggle`,onClick:n[0]||=e=>o.value=!g(o)},null,8,[`icon`,`label`,`aria-expanded`])]),m(w(`div`,tt,[w(`div`,nt,[h(f,{rangeIndex:g(c),"onUpdate:rangeIndex":n[1]||=e=>T(c)?c.value=e:null,headerLabel:g(a)(`songRecorder.pianoRange`),"data-testid":`song-recorder-piano-range`},null,8,[`rangeIndex`,`headerLabel`]),g(d)?y(``,!0):(s(),D(p,{key:0,modelValue:g(u),"onUpdate:modelValue":n[2]||=e=>T(u)?u.value=e:null},null,8,[`modelValue`]))]),g(o)?(s(),x(`div`,rt,[h(_,{midiMin:g(l).midiMin,midiMax:g(l).midiMax,toneLabelMode:`simple`,isOctaveShownOnC:!0,areKeyboardHintsVisible:g(u),previewLanes:e.previewLanes,isPreviewEnabled:e.isPreviewEnabled,shouldColorByCents:``,onNotePressed:n[3]||=(e,t)=>i(`notePressed`,e,t),onNoteReleased:n[4]||=(e,t)=>i(`noteReleased`,e,t),onTonePlayed:n[5]||=e=>i(`tonePlayed`,e)},null,8,[`midiMin`,`midiMax`,`areKeyboardHintsVisible`,`previewLanes`,`isPreviewEnabled`])])):y(``,!0)],512),[[N,g(o)]])])}}}),at={class:`settings-item`},ot={class:`settings-item`},st={class:`settings-item`},ct={class:`text-sm text-(--p-text-muted-color) md:block`},lt={class:`settings-item`},ut={class:`text-sm text-(--p-text-muted-color) md:block`},dt={class:`settings-item`},ft=ie(O({__name:`SongRecorderSettingsRow`,props:k({isInputLocked:{type:Boolean},isTempoLocked:{type:Boolean},isGridLocked:{type:Boolean}},{input:{required:!0},inputModifiers:{},bpm:{required:!0},bpmModifiers:{},grid:{required:!0},gridModifiers:{},clef:{required:!0},clefModifiers:{},isClickEnabled:{type:Boolean,required:!0},isClickEnabledModifiers:{}}),emits:[`update:input`,`update:bpm`,`update:grid`,`update:clef`,`update:isClickEnabled`],setup(e){let t=e,r=n(e,`input`),i=n(e,`bpm`),a=n(e,`grid`),o=n(e,`clef`),l=n(e,`isClickEnabled`),{t:d}=F(),f={voice:`songRecorder.inputVoice`,piano:`songRecorder.inputPiano`},p=_(()=>je.map(e=>({label:d(f[e]),value:e}))),m=_(()=>xe.map(e=>({label:d(`notes.clefLabels.${e}`),value:e}))),y=[...Ae].sort((e,t)=>t-e).map(e=>({label:`${e} BPM`,value:e})),b=ke.map(e=>({label:`1/${e}`,value:e})),S=v(null),{canScrollStart:C,canScrollEnd:T}=_e(S);return(e,n)=>{let f=pe,_=P,v=de;return s(),x(`div`,{ref_key:`rowRef`,ref:S,class:c([`settings-row`,{"mask-start":g(C),"mask-end":g(T)}])},[w(`div`,at,[n[5]||=w(`div`,null,null,-1),h(f,{modelValue:r.value,"onUpdate:modelValue":n[0]||=e=>r.value=e,options:g(p),optionLabel:`label`,optionValue:`value`,allowEmpty:!1,size:`small`,disabled:t.isInputLocked,"aria-label":g(d)(`songRecorder.inputLabel`),"data-testid":`song-recorder-input`},null,8,[`modelValue`,`options`,`disabled`,`aria-label`])]),w(`div`,ot,[n[6]||=w(`div`,null,null,-1),h(f,{modelValue:o.value,"onUpdate:modelValue":n[1]||=e=>o.value=e,options:g(m),optionLabel:`label`,optionValue:`value`,allowEmpty:!1,size:`small`,"data-testid":`song-recorder-clef`},null,8,[`modelValue`,`options`])]),w(`div`,st,[w(`label`,ct,u(g(d)(`generic.tempo`)),1),h(_,{modelValue:i.value,"onUpdate:modelValue":n[2]||=e=>i.value=e,options:g(y),optionLabel:`label`,optionValue:`value`,size:`small`,disabled:t.isTempoLocked,"data-testid":`song-recorder-bpm`},null,8,[`modelValue`,`options`,`disabled`])]),w(`div`,lt,[w(`label`,ut,u(g(d)(`songRecorder.grid`)),1),h(_,{modelValue:a.value,"onUpdate:modelValue":n[3]||=e=>a.value=e,options:g(b),optionLabel:`label`,optionValue:`value`,size:`small`,disabled:t.isGridLocked,"data-testid":`song-recorder-grid`},null,8,[`modelValue`,`options`,`disabled`])]),w(`div`,dt,[n[7]||=w(`div`,null,null,-1),h(v,{modelValue:l.value,"onUpdate:modelValue":n[4]||=e=>l.value=e,iconOn:`pi pi-stopwatch`,iconOff:`pi pi-stopwatch`,label:g(d)(`generic.beat`),disabled:t.isTempoLocked,class:`justify-self-start`},null,8,[`modelValue`,`label`,`disabled`])])],2)}}}),[[`__scopeId`,`data-v-d7583de5`]]),pt=K(),mt=[0,.5,1,1.5,2,3,3.5,4,4.5,5,5.5,6],ht={treble:77,bass:57};function gt(e){let t=(e%12+12)%12;return Math.floor(e/12)*7+mt[t]}function _t(e){let t=Math.floor(e),n=e-t;return gt(t)+(gt(t+1)-gt(t))*n}function vt(e,t,n,r){return n-(_t(e)-_t(ht[t]))*r/2}var yt=[`data-piece-count`,`data-active-piece`],bt={class:`relative min-w-max`},xt=260,St=900,Ct=24,wt=40,Tt=40,Et=-6,Dt=-13,Ot=1/3,kt=ie(O({__name:`SongRecorderSheet`,props:{abc:{},activePieceIndex:{},isDone:{type:Boolean},isLive:{type:Boolean},pieceKinds:{},nowPieceIndex:{},labelMidis:{},showToneLabels:{type:Boolean},showNoteNumbers:{type:Boolean},clef:{},sungMidi:{},sungToneLabel:{},sungToneCents:{}},setup(e){let n=e,o={composerfont:J,vocalfont:Y},c=v(null),l=v(null),d=v(null),f=v([]);function p(e){let t=e.split(`|`).length;return Math.max(St,t*xt)}let h=v(null),b=v(0);function S(){let e=l.value?.querySelector(`.abcjs-staff`);if(!c.value||!e){h.value=null;return}let t=c.value.getBoundingClientRect(),n=e.getBoundingClientRect();b.value=c.value.clientHeight,h.value={topLineY:n.top-t.top,lineSpacing:n.height/4}}let T=_(()=>{let e=h.value;if(n.sungMidi==null||!e)return null;let t=vt(n.sungMidi,n.clef,e.topLineY,e.lineSpacing);return Math.max(2,Math.min(b.value-2,t))}),{colorForCents:D}=fe(),O=_(()=>n.sungToneCents==null?null:{line:{borderColor:D(n.sungToneCents,.5)},chip:{color:D(n.sungToneCents)}}),k=_(()=>n.sungToneLabel?oe(n.sungToneLabel,n.sungToneCents??0,Tt):null);function A(){f.value.forEach((e,t)=>{let r=n.pieceKinds?.[t];e.classList.toggle(`piece-active`,t===n.activePieceIndex),e.classList.toggle(`piece-now`,t===n.nowPieceIndex),e.classList.toggle(`piece-template`,r===`template`),e.classList.toggle(`piece-ghost`,r===`ghost`)})}let j=v([]),M=_(()=>n.showToneLabels?j.value:[]);function P(e,t=0){return{left:`${e.left}px`,top:`${e.top+Et+t}px`}}function F(){let e=l.value;if(!e){j.value=[];return}let t=e.getBoundingClientRect();j.value=f.value.flatMap((e,r)=>{let i=n.labelMidis?.[r];if(i==null)return[];let a=(e.querySelector(`.abcjs-notehead`)??e).getBoundingClientRect();return[{left:a.left-t.left+a.width/2,top:a.top-t.top,text:ae(i,{showOctave:n.showNoteNumbers??!1}).label,flatText:ce(i)}]})}r(()=>n.showNoteNumbers,F);function I(){let e=d.value,t=n.nowPieceIndex,r=t==null?null:f.value[t];if(!e||!r)return;let i=r.getBoundingClientRect().left-e.getBoundingClientRect().left+e.scrollLeft;e.scrollTo({left:i-e.clientWidth*Ot,behavior:`smooth`})}async function L(){let e=l.value;if(!e||e.offsetParent===null)return;(0,pt.renderAbc)(e,n.abc,{add_classes:!0,staffwidth:p(n.abc),paddingtop:wt,paddingbottom:wt,format:o}),await t();let r=q(e);r>0&&((0,pt.renderAbc)(e,n.abc,{add_classes:!0,staffwidth:Math.ceil(r)+Ct,paddingtop:wt,paddingbottom:wt,format:o}),await t()),f.value=[...e.querySelectorAll(`.abcjs-note, .abcjs-rest`)],A(),F(),S(),n.isLive&&I()}let R=!1,z=!1;async function B(){if(R)z=!0;else{R=!0;try{await L()}finally{R=!1}z&&(z=!1,B())}}C(()=>{B()});let V=te(()=>{B()},150);return r(()=>[n.abc,n.clef],()=>{n.isLive?B():V()}),ne(()=>d.value?.parentElement??null,([e])=>{e.contentRect.width>0&&V()}),r(()=>n.nowPieceIndex,()=>{A(),n.isLive&&I()}),r(()=>n.activePieceIndex,e=>{A(),e===null?!n.isDone&&d.value&&(d.value.scrollLeft=0):f.value[e]?.scrollIntoView({behavior:`smooth`,inline:`center`,block:`nearest`})}),(t,n)=>(s(),x(`div`,{ref_key:`rootRef`,ref:c,class:`relative mx-auto w-fit max-w-full`},[w(`div`,{ref_key:`scrollRef`,ref:d,class:`w-full overflow-x-auto rounded border border-(--p-content-border-color)`,"data-testid":`song-recorder-sheet`,"data-piece-count":g(f).length,"data-active-piece":e.activePieceIndex??``},[w(`div`,bt,[w(`div`,{ref_key:`containerRef`,ref:l,class:`relative z-10 py-0.5`},null,512),(s(!0),x(E,null,i(g(M),(e,t)=>(s(),x(`span`,{key:t,class:`pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded bg-(--p-content-background) px-0.5 text-xs leading-none font-semibold text-(--p-text-muted-color) tabular-nums`,style:a(P(e)),"data-testid":`song-recorder-tone-label`},u(e.text),5))),128)),(s(!0),x(E,null,i(g(M),(e,t)=>m((s(),x(`span`,{key:`flat-${t}`,class:`pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded bg-(--p-content-background) px-0.5 text-[10px] leading-none font-semibold text-(--p-text-muted-color)/70 tabular-nums`,style:a(P(e,Dt))},u(e.flatText),5)),[[N,e.flatText]])),128))])],8,yt),g(T)===null?y(``,!0):(s(),x(`div`,{key:0,class:`pointer-events-none absolute inset-x-2 h-0 border-t-3 border-dashed border-(--p-orange-400)/50 transition-colors duration-100`,style:a({top:`${g(T)}px`,...g(O)?.line}),"data-testid":`song-recorder-pitch-line`},null,4)),g(T)!==null&&g(k)?(s(),x(`div`,{key:1,class:`pointer-events-none absolute inset-x-2 z-20 flex -translate-y-1/2 justify-center`,style:a({top:`${g(T)}px`})},[w(`span`,{class:`rounded bg-(--p-content-background) px-0.5 text-xs leading-none font-semibold text-(--p-orange-400) tabular-nums transition-colors duration-100`,style:a(g(O)?.chip)},u(g(k)),5)],4)):y(``,!0)],512))}}),[[`__scopeId`,`data-v-159c3b90`]]),At=1e-6;function jt(e,t){let n=e*t;return Math.abs(n-Math.round(n))<At}function Mt(e){return e.replace(/<[^>]*>/g,``).replace(/\s+/g,` `).trim()}function Nt(e){return Ae.reduce((t,n)=>Math.abs(n-e)<Math.abs(t-e)?n:t)}function Pt(e,t){let[n]=(0,pt.parseOnly)(e);if(!n)return{ok:!1,error:`empty`};let r=n.warnings?.[0];if(r)return{ok:!1,error:`invalid`,detail:Mt(r)};let i=n.getMeterFraction();if(i.num!==4||i.den!==4)return{ok:!1,error:`meter`};let a=new Set,o=n.setUpAudio({}).tracks;o.length>1&&a.add(`voices`);let s=(o[0]??[]).filter(e=>e.cmd===`note`),c=new Map;for(let e of s){let t=c.get(e.start);t&&a.add(`chords`),(!t||e.pitch>t.pitch)&&c.set(e.start,e)}let l=[...c.values()].sort((e,t)=>e.start-t.start);if(l.length===0)return{ok:!1,error:`empty`};let u=n.metaText.tempo,d=u?.bpm&&u.duration?.[0]?u.bpm*u.duration[0]*4:t.bpm,f=Nt(d);u?.bpm&&f!==Math.round(d)&&a.add(`tempo`);let p=n.getPickupLength(),m=p>0?n.getBarLength()-p:0,h=l.flatMap(e=>[e.start+m,e.start+m+e.duration]),g=t.grid;h.every(e=>jt(e,g))||(g=16),h.every(e=>jt(e,16))||a.add(`rhythm`);let _=24e4/f;return{ok:!0,events:l.map(e=>({startMs:(e.start+m)*_,endMs:(e.start+m+e.duration)*_,midi:e.pitch})),bpm:f,clef:n.lines[0]?.staff?.[0]?.clef?.type===`bass`?`bass`:`treble`,grid:g,notices:[...a]}}function Ft(e){let{minNoteMs:t,earlyPressToleranceMs:n=0}=e,r=[],i=null;function a(e){i&&=(e>i.startMs&&r.push({startMs:i.startMs,endMs:e,midi:i.midi}),null)}function o(e){let t=r.at(-1);!t||t.endMs<=e||(e<=t.startMs?r.pop():t.endMs=e)}function s(e,t){if(t<-n)return!1;let s=Math.max(0,t),c=r.length,l=r.at(-1)?.endMs;return a(s),o(s),i={midi:e,startMs:s},r.length!==c||r.at(-1)?.endMs!==l}function c(e,n){return!i||i.midi!==e?!1:(a(Math.max(n,i.startMs+t)),!0)}function l(e){return i&&a(Math.max(e,i.startMs+t)),r}function u(){return i?.midi??null}function d(){return i?{...i}:null}return{events:r,press:s,release:c,flush:l,heldMidi:u,heldNote:d}}function It(e,t){return 24e4/(e*t)}function Lt(e,t){return e/4*t}var Rt=.2,zt=.15,Bt=.45;function Vt(e){return Math.min(Bt,Math.max(zt,e*Rt))}function Ht(e,t){let n=It(t.bpm,t.grid),r=Lt(t.grid,t.beatsPerBar),i=[],a=0,o=[...e].sort((e,t)=>e.startMs-t.startMs);for(let e of o){let t=Math.max(a,Math.round(e.startMs/n)),r=(e.endMs-e.startMs)/n,o=Math.round(e.endMs/n+Vt(r));if(o<=t){if(e.endMs-e.startMs<n/2)continue;o=t+1}t>a&&i.push({midi:null,startUnit:a,units:t-a}),i.push({midi:e.midi,startUnit:t,units:o-t}),a=o}let{padLastBar:s=!0}=t,c=Math.ceil(a/r)*r;return s&&c>a&&i.push({midi:null,startUnit:a,units:c-a}),i}var Ut=2;function Wt(e){let{captured:t,openNote:n,nowUnit:r,unitMs:i,barUnits:a,totalUnits:o}=e,s=t.map(e=>({...e,kind:`captured`})),c=t.at(-1),l=c?c.startUnit+c.units:0;function u(e){e<=l||(s.push({midi:null,startUnit:l,units:e-l,kind:`captured`}),l=e)}if(n){let e=Math.max(l,Math.round(n.startMs/i)),t=Math.max(e+1,r+1);u(e),s.push({midi:n.midi,startUnit:e,units:t-e,kind:`ghost`}),l=t}u(r);let d=Math.floor(Math.max(r,0)/a),f=Math.min(o,Math.max((d+Ut)*a,Math.ceil(l/a)*a));for(let e=l;e<f;e++)s.push({midi:null,startUnit:e,units:1,kind:`template`});return s}function Gt(e,t){if(t<0)return null;let n=e.findIndex(e=>e.startUnit<=t&&t<e.startUnit+e.units);return n===-1?null:n}function Kt(e){let t=new Set;for(let n=1;n<=e;n*=2){t.add(n);let r=n*1.5;Number.isInteger(r)&&r<=e&&t.add(r)}return[...t].sort((e,t)=>t-e)}function qt(e,t){let n=[],r=e;for(;r>0;){let e=t.find(e=>e<=r)??1;n.push(e),r-=e}return n}function Jt(e,t){let{bpm:n,grid:r,beatsPerBar:i,clef:a}=t,o=Lt(r,i),s=r/4,c=Kt(r),l=[],u=[],d=``,f=-1,p=null,m=new Set;function h(e){let t=Math.floor(e/o);t!==f&&(f>=0&&u.push(d.trim()),d=``,f=t,p=null,m=new Set)}function g(e){let t=we(e);return t.startsWith(`^`)?(m.add(t.slice(1)),t):m.has(t)?(m.delete(t),`=${t}`):t}e.forEach((e,t)=>{let n=e.startUnit,r=e.units;for(;r>0;){h(n);let i=(f+1)*o,a=Math.min(r,i-n);for(let i of qt(a,c)){let a=i===r,c=e.midi===null,u=Math.floor(n%o/s),f=!c&&i<s,m=f&&p===u,h=i===1?``:String(i),_=c?`z${h}`:`${g(e.midi)}${h}${a?``:`-`}`;d+=(m?``:` `)+_,p=f?u:null,l.push({noteIndex:t,startUnit:n,units:i,isRest:c}),n+=i,r-=i}}}),f>=0&&u.push(d.trim());let _=[`X:1`,`M:${i}/4`,`L:1/${r}`,`Q:1/4=${n}`,`K:C clef=${a}`],v=u.length>0?`${u.join(` | `)} |]`:`z${o} |]`;return{abc:[..._,v].join(`
`),pieces:l}}var Yt=me({types:{events:{}}}).createMachine({id:`songRecorder`,initial:`idle`,states:{idle:{on:{RECORD:`countIn`,IMPORT:`review`}},countIn:{on:{COUNT_IN_DONE:`recording`,STOP:`idle`,ERROR:`idle`}},recording:{on:{STOP:`review`,LIMIT_REACHED:`review`,ERROR:`idle`}},review:{initial:`stopped`,on:{RESET:`idle`,IMPORT:`.stopped`},states:{stopped:{on:{PLAY:`playing`}},playing:{on:{PAUSE:`paused`,STOP_PLAYBACK:`stopped`,PLAYBACK_DONE:`stopped`}},paused:{on:{RESUME:`playing`,STOP_PLAYBACK:`stopped`}}}}}}),Xt=.1,Zt=.92;function Qt(e){let{detection:t,bpm:n,grid:i,clef:a,isClickEnabled:s,input:c}=e,{snapshot:l,send:u}=he(Yt),{warmUp:d,playToneAt:f,playTickAt:p,getNow:m,getImmediate:h,scheduleDraw:g,cancelScheduled:y}=ge(),x=_(()=>l.value.matches(`idle`)),S=_(()=>l.value.matches(`countIn`)),C=_(()=>l.value.matches(`recording`)),w=_(()=>l.value.matches(`review`)),T=_(()=>l.value.matches({review:`playing`})),E=_(()=>l.value.matches({review:`paused`})),D=v(null),O=v(null),k=v(0),A=b([]),j=b(null),M=_(()=>60/n.value*4),N=_(()=>Math.floor(60/M.value)*M.value*1e3),P=X(),F=Ft({minNoteMs:0}),I=`voice`,L=0,R=ee(()=>{let e=performance.now()-L;if(e<0||(k.value=e,I===`piano`))return;let n=t.frequency.value,r=t.isClean.value&&n!==null?se(n):null;P.push(e,r),P.events.length!==A.value.length&&(A.value=[...P.events]);let i=P.openNote();(i?.startMs!==j.value?.startMs||i?.midi!==j.value?.midi)&&(j.value=i)},{immediate:!1}),z=_(()=>Ht(A.value,{bpm:n.value,grid:i.value,beatsPerBar:4})),B=_(()=>Jt(z.value,{bpm:n.value,grid:i.value,beatsPerBar:4,clef:a.value})),V=_(()=>A.value.length>0),H=_(()=>S.value||C.value),te=_(()=>C.value?Math.floor(k.value/It(n.value,i.value)):-1),U=_(()=>{let e=It(n.value,i.value);return Wt({captured:Ht(A.value,{bpm:n.value,grid:i.value,beatsPerBar:4,padLastBar:!1}),openNote:j.value,nowUnit:te.value,unitMs:e,barUnits:Lt(i.value,4),totalUnits:Math.round(N.value/e)})}),ne=_(()=>Jt(U.value,{bpm:n.value,grid:i.value,beatsPerBar:4,clef:a.value})),re=_(()=>H.value?ne.value:B.value),ie=_(()=>H.value?ne.value.pieces.map(e=>U.value[e.noteIndex].kind):null),ae=_(()=>{let e=H.value?U.value:z.value,{pieces:t}=re.value;return t.map((n,r)=>{let i=e[n.noteIndex],a=t[r-1]?.noteIndex===n.noteIndex;return n.isRest||i.kind===`template`||a?null:i.midi})}),oe=_(()=>H.value?Gt(ne.value.pieces,te.value):null);function ce(){let e=60/n.value,t=m()+Xt,r=t+4*e;L=performance.now()+(r-h())*1e3;for(let n=0;n<4;n++){let r=t+n*e;p(r),g(()=>{D.value=4-n},r)}g(()=>{D.value=null,u({type:`COUNT_IN_DONE`}),R.resume()},r);let i=N.value/1e3,a=Math.round(i/e);for(let t=0;t<a;t++){let n=r+t*e;s.value&&p(n),g(()=>{O.value=t%4+1},n)}g(()=>{C.value&&de(`LIMIT_REACHED`)},r+i)}async function ue(){x.value&&(await d(),I=c.value,!(I===`voice`&&(await t.start(),t.error.value))&&(P=X(),F=Ft({minNoteMs:It(n.value,Math.min(...ke))/2,earlyPressToleranceMs:150}),A.value=[],j.value=null,k.value=0,y(),u({type:`RECORD`}),ce()))}function de(e){if(R.pause(),y(),O.value=null,j.value=null,I===`voice`)t.stop(),A.value=[...P.flush()];else{let t=e===`LIMIT_REACHED`?N.value:Math.min(performance.now()-L,N.value);A.value=[...F.flush(t)]}u({type:e})}function fe(){S.value?(y(),I===`voice`&&t.stop(),D.value=null,j.value=null,u({type:`STOP`})):C.value&&de(`STOP`)}let W=v(null),G=v(!1);function pe(e){let{pieces:t}=B.value,r=z.value,a=It(n.value,i.value)/1e3,o=t[e];if(!o)return;let s=m()+Xt-o.startUnit*a;t.slice(e).forEach((n,i)=>{let o=e+i,c=s+n.startUnit*a;g(()=>{W.value=o},c);let l=r[n.noteIndex],u=i===0||t[o-1]?.noteIndex!==n.noteIndex;if(n.isRest||l.midi===null||!u)return;let d=l.startUnit+l.units-n.startUnit;f(le(l.midi),d*a*Zt,c)});let c=t[t.length-1];g(()=>{W.value=null,G.value=!0,u({type:`PLAYBACK_DONE`})},s+(c.startUnit+c.units)*a)}async function me(){!w.value||T.value||E.value||(await d(),y(),W.value=null,G.value=!1,pe(0),u({type:`PLAY`}))}function _e(){T.value&&(y(),u({type:`PAUSE`}))}async function ve(){E.value&&(await d(),y(),pe(W.value??0),u({type:`RESUME`}))}function ye(){y(),W.value=null,G.value=!1,u({type:`STOP_PLAYBACK`})}function K(){y(),W.value=null,G.value=!1,A.value=[],k.value=0,u({type:`RESET`})}function q(e,t=performance.now()){if(I!==`piano`||!(S.value||C.value))return;let n=t-L;n>=N.value||(F.press(e,n)&&(A.value=[...F.events]),j.value=F.heldNote())}function J(e,t=performance.now()){if(I!==`piano`||!(S.value||C.value))return;let n=Math.min(t-L,N.value);F.release(e,n)&&(A.value=[...F.events],j.value=null)}function Y(e){S.value||C.value||(y(),W.value=null,G.value=!1,P=X(),A.value=e,k.value=0,u({type:`IMPORT`}))}return r(t.error,e=>{I===`voice`&&e&&(S.value||C.value)&&(R.pause(),y(),D.value=null,O.value=null,j.value=null,u({type:`ERROR`}))}),o(()=>{R.pause(),y(),I===`voice`&&(S.value||C.value)&&t.stop()}),{isIdle:x,isCountingIn:S,isRecording:C,isReview:w,isPlaying:T,isPaused:E,countInBeat:D,beatInBar:O,elapsedMs:k,limitMs:N,events:A,hasNotes:V,sheet:B,displaySheet:re,pieceKinds:ie,labelMidis:ae,nowPieceIndex:oe,activePieceIndex:W,hasPlayedToEnd:G,record:ue,stop:fe,play:me,pause:_e,resume:ve,stopPlayback:ye,reset:K,importEvents:Y,pressPianoKey:q,releasePianoKey:J}}var $t=[`data-input`,`data-phase`],en={class:`flex flex-wrap items-center justify-center gap-2`},tn={class:`flex items-center gap-2`},nn={class:`hidden text-sm text-(--p-text-muted-color) md:block`},rn={key:0,class:`max-w-prose text-center text-sm text-(--p-text-muted-color)`},an={key:1,class:`text-5xl font-bold text-(--p-primary-color) tabular-nums`,"data-testid":`song-recorder-count-in`},on={key:2,class:`flex items-center gap-4`,"data-testid":`song-recorder-status`},sn={class:`flex gap-1.5`,"aria-hidden":`true`},cn={class:`text-sm text-(--p-text-muted-color) tabular-nums`},ln={class:`min-w-10 text-center font-semibold text-(--p-primary-color) tabular-nums`,"data-testid":`song-recorder-live-note`},un={key:3,class:`text-sm text-(--p-text-muted-color)`},dn={class:`w-full max-w-full`},fn=O({__name:`SongRecorderDisplay`,props:k({detection:{},simulateIdlePreview:{type:Boolean}},{bpm:{required:!0},bpmModifiers:{},grid:{required:!0},gridModifiers:{},clef:{required:!0},clefModifiers:{},isClickEnabled:{type:Boolean,required:!0},isClickEnabledModifiers:{},input:{required:!0},inputModifiers:{},toneLabelMode:{default:`simple`},toneLabelModeModifiers:{}}),emits:[`update:bpm`,`update:grid`,`update:clef`,`update:isClickEnabled`,`update:input`,`update:toneLabelMode`],setup(e,{expose:t}){let a=e,o=n(e,`bpm`),d=n(e,`grid`),f=n(e,`clef`),p=n(e,`isClickEnabled`),m=n(e,`input`),b=n(e,`toneLabelMode`),S=Se(),C=_(()=>Ce(b.value)),{t:O}=F(),k=Qt({detection:a.detection,bpm:o,grid:d,clef:f,isClickEnabled:p,input:m}),{isIdle:A,isCountingIn:j,isRecording:M,isReview:N,isPlaying:P,isPaused:I,countInBeat:L,beatInBar:R,elapsedMs:B,limitMs:V,hasNotes:H,sheet:ee,displaySheet:te,pieceKinds:U,labelMidis:ne,nowPieceIndex:ie,activePieceIndex:oe,hasPlayedToEnd:ce,record:le,stop:ue,play:de,pause:fe,resume:G,stopPlayback:me,reset:he,importEvents:ge,pressPianoKey:_e,releasePianoKey:ye}=k,K=_(()=>j.value||M.value),q=_(()=>P.value||I.value),J=_(()=>m.value===`piano`),{isPreviewEnabled:Y}=re(),xe=_({get:()=>Y.value&&!a.simulateIdlePreview,set:e=>{Y.value=e}}),{previewMidi:we,previewFrequency:Te,previewNoteLabel:Ee,rawFrequency:De,rawIsClean:Oe,isPreviewListening:ke,micPermission:Ae,triggerDeafPeriod:je}=ve({isGameActive:_(()=>K.value||q.value),isEnabled:xe}),X=_(()=>!K.value&&!a.simulateIdlePreview),Z=v(null);function Me(e,t){Z.value=e,_e(e,t)}function Q(e,t){Z.value===e&&(Z.value=null),ye(e,t)}function Ne(){je()}let Pe=_(()=>{if(J.value)return q.value?null:Z.value;if(!Y.value||q.value)return null;let e=X.value?De.value:a.detection.frequency.value,t=X.value?Oe.value:a.detection.isClean.value;return!(X.value?ke.value:a.detection.isListening.value)||!t||e===null?null:se(e)}),Fe={previewMidi:null,previewFrequency:null,previewNoteLabel:null,laneId:`low`},Ie=_(()=>{if(!Y.value||K.value||q.value)return[Fe];if(!a.simulateIdlePreview)return[{previewMidi:we.value,previewFrequency:Te.value,previewNoteLabel:Ee.value,laneId:`low`}];let e=a.detection.noteInfo.value;return!e||!a.detection.isClean.value?[Fe]:[{previewMidi:e.midiNote,previewFrequency:a.detection.frequency.value,previewNoteLabel:ae(e.midiNote).label,laneId:`low`}]}),{stableSungLabel:Le,stableSungCents:Re}=be({sungMidi:Pe,showOctave:v(!0)}),ze=_(()=>!!a.simulateIdlePreview&&Y.value&&!K.value&&!q.value);r(ze,e=>{e?a.detection.start():(!K.value||J.value)&&a.detection.stop()},{immediate:!0});let Be=_(()=>{if(J.value)return!M.value||Z.value===null?null:ae(Z.value,{showOctave:!0}).label;let e=a.detection.noteInfo.value;return!M.value||!a.detection.isClean.value||!e?null:ae(e.midiNote,{showOctave:!0}).label});function Ve(e){let t=Math.floor(e/1e3);return`${Math.floor(t/60)}:${String(t%60).padStart(2,`0`)}`}let He=Array.from({length:4},(e,t)=>t+1),$=v(``),Ue=v(null);r(()=>N.value?ee.value.abc:null,e=>{e!==null&&($.value=e)}),r(A,e=>{e&&($.value=``,Ue.value=null)});function We(){let e=Pt($.value,{bpm:o.value,grid:d.value});e.ok?(o.value=e.bpm,d.value=e.grid,f.value=e.clef,ge(e.events),$.value=ee.value.abc,Ue.value=e.notices.length>0?{severity:`warn`,text:e.notices.map(e=>O(`songRecorder.importNotices.${e}`)).join(` `)}:null):Ue.value={severity:`error`,text:O(`songRecorder.importErrors.${e.error}`,{detail:e.detail??``})}}return t({recorder:k}),(t,n)=>{let r=z,a=W,_=pe;return s(),x(`div`,{class:`mx-auto flex w-full max-w-400 flex-1 flex-col items-center gap-4 px-2 pb-4`,"data-testid":`song-recorder-display`,"data-input":m.value,"data-phase":g(A)?`idle`:g(j)?`countIn`:g(M)?`recording`:`review`},[h(ft,{bpm:o.value,"onUpdate:bpm":n[0]||=e=>o.value=e,grid:d.value,"onUpdate:grid":n[1]||=e=>d.value=e,clef:f.value,"onUpdate:clef":n[2]||=e=>f.value=e,isClickEnabled:p.value,"onUpdate:isClickEnabled":n[3]||=e=>p.value=e,input:m.value,"onUpdate:input":n[4]||=e=>m.value=e,isInputLocked:g(K),isTempoLocked:!g(A),isGridLocked:g(K)||g(q)},null,8,[`bpm`,`grid`,`clef`,`isClickEnabled`,`input`,`isInputLocked`,`isTempoLocked`,`isGridLocked`]),w(`div`,en,[g(A)?(s(),D(r,{key:0,severity:`danger`,size:`small`,rounded:``,icon:`pi pi-circle-fill`,label:g(O)(`songRecorder.record`),class:`min-w-24`,"data-testid":`song-recorder-record`,onClick:g(le)},null,8,[`label`,`onClick`])):y(``,!0),g(K)?(s(),D(r,{key:1,severity:`danger`,size:`small`,rounded:``,label:g(O)(`generic.stop`),class:`min-w-24`,"data-testid":`song-recorder-stop`,onClick:g(ue)},null,8,[`label`,`onClick`])):y(``,!0),g(N)?(s(),x(E,{key:2},[g(q)?y(``,!0):(s(),D(r,{key:0,severity:`success`,size:`small`,rounded:``,label:g(O)(`generic.play`),disabled:!g(H),class:`min-w-20`,"data-testid":`song-recorder-play`,onClick:g(de)},null,8,[`label`,`disabled`,`onClick`])),g(P)?(s(),D(r,{key:1,severity:`warn`,size:`small`,rounded:``,label:g(O)(`generic.pause`),class:`min-w-20`,"data-testid":`song-recorder-pause`,onClick:g(fe)},null,8,[`label`,`onClick`])):y(``,!0),g(I)?(s(),D(r,{key:2,severity:`success`,size:`small`,rounded:``,label:g(O)(`generic.resume`),class:`min-w-20`,"data-testid":`song-recorder-resume`,onClick:g(G)},null,8,[`label`,`onClick`])):y(``,!0),g(q)?(s(),D(r,{key:3,severity:`danger`,size:`small`,rounded:``,label:g(O)(`generic.stop`),class:`min-w-20`,"data-testid":`song-recorder-stop-playback`,onClick:g(me)},null,8,[`label`,`onClick`])):y(``,!0),h(r,{severity:`secondary`,size:`small`,rounded:``,icon:`pi pi-refresh`,label:g(O)(`songRecorder.newRecording`),"data-testid":`song-recorder-reset`,onClick:g(he)},null,8,[`label`,`onClick`])],64)):y(``,!0),h(a,{modelValue:g(Y),"onUpdate:modelValue":n[5]||=e=>T(Y)?Y.value=e:null,disabled:g(q)||g(K)&&g(J)||!e.simulateIdlePreview&&g(Ae)===`denied`},null,8,[`modelValue`,`disabled`]),w(`div`,tn,[w(`label`,nn,u(g(O)(`generic.toneLabels`)),1),h(_,{modelValue:b.value,"onUpdate:modelValue":n[6]||=e=>b.value=e,options:g(S),optionLabel:`label`,optionValue:`value`,allowEmpty:!1,size:`small`,"aria-label":g(O)(`generic.toneLabels`),"data-testid":`song-recorder-tone-labels`},null,8,[`modelValue`,`options`,`aria-label`])])]),g(A)?(s(),x(`p`,rn,u(g(O)(g(J)?`songRecorder.hintPiano`:`songRecorder.hint`,{seconds:Math.round(g(V)/1e3)})),1)):y(``,!0),g(j)?(s(),x(`div`,an,u(g(L)??``),1)):y(``,!0),g(M)?(s(),x(`div`,on,[w(`div`,sn,[(s(!0),x(E,null,i(g(He),e=>(s(),x(`span`,{key:e,class:c([`size-3 rounded-full transition-colors duration-75`,e===g(R)?`bg-(--p-primary-color)`:`bg-(--p-content-border-color)`])},null,2))),128))]),w(`span`,cn,u(Ve(g(B)))+` / `+u(Ve(g(V))),1),w(`span`,ln,u(g(Be)??`–`),1)])):y(``,!0),g(N)&&!g(H)?(s(),x(`p`,un,u(g(O)(g(J)?`songRecorder.noNotesPiano`:`songRecorder.noNotes`)),1)):y(``,!0),w(`div`,dn,[h(kt,{abc:g(te).abc,activePieceIndex:g(oe),pieceKinds:g(U),nowPieceIndex:g(ie),labelMidis:g(ne),showToneLabels:g(C).showLabels,showNoteNumbers:g(C).showOctave,isDone:g(ce),isLive:g(j)||g(M),clef:f.value,sungMidi:g(Pe),sungToneLabel:g(Le),sungToneCents:g(Re)},null,8,[`abc`,`activePieceIndex`,`pieceKinds`,`nowPieceIndex`,`labelMidis`,`showToneLabels`,`showNoteNumbers`,`isDone`,`isLive`,`clef`,`sungMidi`,`sungToneLabel`,`sungToneCents`])]),h(it,{isPianoInput:g(J),previewLanes:g(Ie),isPreviewEnabled:g(Y),onNotePressed:Me,onNoteReleased:Q,onTonePlayed:Ne},null,8,[`isPianoInput`,`previewLanes`,`isPreviewEnabled`]),h(Qe,{modelValue:g($),"onUpdate:modelValue":n[7]||=e=>T($)?$.value=e:null,isImportDisabled:g(K)||g(q),message:g(Ue),sheetAbc:g(N)?g(ee).abc:null,class:`max-w-180`,onImport:We,onEdit:n[8]||=e=>Ue.value=null},null,8,[`modelValue`,`isImportDisabled`,`message`,`sheetAbc`]),l(t.$slots,`default`)],8,$t)}}});export{fn as t};