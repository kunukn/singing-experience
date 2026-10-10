import{B as e,E as t,Ft as n,G as r,It as i,J as a,L as o,M as s,Mt as c,P as l,R as u,T as d,V as f,X as p,Z as m,_ as h,c as g,d as _,f as v,g as y,ht as b,j as x,l as S,nt as C,r as w,st as T,u as E,ut as D,v as O,w as k,z as A}from"./runtime-core.esm-bundler-Yj51g2kL.js";import{i as j,l as M,m as N,t as P}from"./select-vPTDITC8.js";import{n as F}from"./vue-i18n-xLtiqugS.js";import{i as I,n as L,t as R}from"./_plugin-vue_export-helper-D3JGZI6p.js";import{n as z,t as B}from"./button-qQQdDC9h.js";import{t as V}from"./classnames-CRHlWn3X.js";import{a as H,c as U,d as ee,o as te,s as ne,u as re}from"./dist-D1cZv6ba.js";import{r as ie}from"./useSettings-CR96gXSA.js";import{_ as ae,f as oe,g as se,u as ce,v as le}from"./noteUtils-DpI_NI3q.js";import{n as ue,t as de}from"./xstate-vue.esm-ydMJS8eA.js";import{n as fe,r as pe,t as W}from"./PreviewToggle-BasSl80O.js";import{t as me}from"./useTonePlayer-CV4_k7Ix.js";import{t as G}from"./useScrollEdgeMask-vZvxcasB.js";import{t as he}from"./useIdlePreview-D0yVDElx.js";import{a as ge,i as _e,n as ve,r as K,t as ye}from"./useStableSungLabel-aaoPxmTC.js";import{o as q}from"./notesScales-DZtmcJeD.js";import{t as be}from"./selectbutton-Df-2E-Xo.js";import{r as xe,t as Se}from"./toneLabelMode-CJpMcc7h.js";import{n as J}from"./notesAbc-DQBkYURQ.js";import{t as Y}from"./textarea-B96nsGvW.js";import{n as Ce,t as we}from"./KeyboardHintsToggle-B1vS6GTl.js";import{n as Te}from"./voiceRanges-CU9iAoWp.js";import{t as Ee}from"./VoiceRangeSelect-CXE6Ch5a.js";import{t as De}from"./useVoiceRangeIndex-D5Dpb6s8.js";import{t as Oe}from"./useKeyboardHints-BOclujJf.js";import{a as ke,n as Ae,o as je,t as X}from"./noteSegmenter-DrR9C5O7.js";var Z=I.extend({name:`message`,style:`
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
`,classes:{root:function(e){var t=e.props;return[`p-message p-component p-message-`+t.severity,{"p-message-outlined":t.variant===`outlined`,"p-message-simple":t.variant===`simple`,"p-message-sm":t.size===`small`,"p-message-lg":t.size===`large`}]},contentWrapper:`p-message-content-wrapper`,content:`p-message-content`,icon:`p-message-icon`,text:`p-message-text`,closeButton:`p-message-close-button`,closeIcon:`p-message-close-icon`}}),Me={name:`BaseMessage`,extends:L,props:{severity:{type:String,default:`info`},closable:{type:Boolean,default:!1},life:{type:Number,default:null},icon:{type:String,default:void 0},closeIcon:{type:String,default:void 0},closeButtonProps:{type:null,default:null},size:{type:String,default:null},variant:{type:String,default:null}},style:Z,provide:function(){return{$pcMessage:this,$parentInstance:this}}};function Q(e){"@babel/helpers - typeof";return Q=typeof Symbol==`function`&&typeof Symbol.iterator==`symbol`?function(e){return typeof e}:function(e){return e&&typeof Symbol==`function`&&e.constructor===Symbol&&e!==Symbol.prototype?`symbol`:typeof e},Q(e)}function Ne(e,t,n){return(t=Pe(t))in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function Pe(e){var t=Fe(e,`string`);return Q(t)==`symbol`?t:t+``}function Fe(e,t){if(Q(e)!=`object`||!e)return e;var n=e[Symbol.toPrimitive];if(n!==void 0){var r=n.call(e,t);if(Q(r)!=`object`)return r;throw TypeError(`@@toPrimitive must return a primitive value.`)}return(t===`string`?String:Number)(e)}var Ie={name:`Message`,extends:Me,inheritAttrs:!1,emits:[`close`,`life-end`],timeout:null,data:function(){return{visible:!0}},mounted:function(){var e=this;this.life&&setTimeout(function(){e.visible=!1,e.$emit(`life-end`)},this.life)},methods:{close:function(e){this.visible=!1,this.$emit(`close`,e)}},computed:{closeAriaLabel:function(){return this.$primevue.config.locale.aria?this.$primevue.config.locale.aria.close:void 0},dataP:function(){return V(Ne(Ne({outlined:this.variant===`outlined`,simple:this.variant===`simple`},this.severity,this.severity),this.size,this.size))}},directives:{ripple:z},components:{TimesIcon:j}};function Le(e){"@babel/helpers - typeof";return Le=typeof Symbol==`function`&&typeof Symbol.iterator==`symbol`?function(e){return typeof e}:function(e){return e&&typeof Symbol==`function`&&e.constructor===Symbol&&e!==Symbol.prototype?`symbol`:typeof e},Le(e)}function Re(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter(function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable})),n.push.apply(n,r)}return n}function ze(e){for(var t=1;t<arguments.length;t++){var n=arguments[t]==null?{}:arguments[t];t%2?Re(Object(n),!0).forEach(function(t){Be(e,t,n[t])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):Re(Object(n)).forEach(function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))})}return e}function Be(e,t,n){return(t=Ve(t))in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function Ve(e){var t=He(e,`string`);return Le(t)==`symbol`?t:t+``}function He(e,t){if(Le(e)!=`object`||!e)return e;var n=e[Symbol.toPrimitive];if(n!==void 0){var r=n.call(e,t);if(Le(r)!=`object`)return r;throw TypeError(`@@toPrimitive must return a primitive value.`)}return(t===`string`?String:Number)(e)}var $=[`data-p`],Ue=[`data-p`],We=[`data-p`],Ge=[`aria-label`,`data-p`],Ke=[`data-p`];function qe(t,n,r,i,a,o){var s=A(`TimesIcon`),h=e(`ripple`);return l(),E(M,d({name:`p-message`,appear:``},t.ptmi(`transition`)),{default:p(function(){return[a.visible?(l(),v(`div`,d({key:0,class:t.cx(`root`),role:`alert`,"aria-live":`assertive`,"aria-atomic":`true`,"data-p":o.dataP},t.ptm(`root`)),[S(`div`,d({class:t.cx(`contentWrapper`)},t.ptm(`contentWrapper`)),[t.$slots.container?u(t.$slots,`container`,{key:0,closeCallback:o.close}):(l(),v(`div`,d({key:1,class:t.cx(`content`),"data-p":o.dataP},t.ptm(`content`)),[u(t.$slots,`icon`,{class:c(t.cx(`icon`))},function(){return[(l(),E(f(t.icon?`span`:null),d({class:[t.cx(`icon`),t.icon],"data-p":o.dataP},t.ptm(`icon`)),null,16,[`class`,`data-p`]))]}),t.$slots.default?(l(),v(`div`,d({key:0,class:t.cx(`text`),"data-p":o.dataP},t.ptm(`text`)),[u(t.$slots,`default`)],16,We)):_(``,!0),t.closable?m((l(),v(`button`,d({key:1,class:t.cx(`closeButton`),"aria-label":o.closeAriaLabel,type:`button`,onClick:n[0]||=function(e){return o.close(e)},"data-p":o.dataP},ze(ze({},t.closeButtonProps),t.ptm(`closeButton`))),[u(t.$slots,`closeicon`,{},function(){return[t.closeIcon?(l(),v(`i`,d({key:0,class:[t.cx(`closeIcon`),t.closeIcon],"data-p":o.dataP},t.ptm(`closeIcon`)),null,16,Ke)):(l(),E(s,d({key:1,class:[t.cx(`closeIcon`),t.closeIcon],"data-p":o.dataP},t.ptm(`closeIcon`)),null,16,[`class`,`data-p`]))]})],16,Ge)),[[h]]):_(``,!0)],16,Ue))],16)],16,$)):_(``,!0)]}),_:3},16)}Ie.render=qe;var Je={id:`song-recorder-abc-body`,class:`flex flex-col gap-2`},Ye={class:`flex flex-wrap items-center justify-between gap-2`},Xe={class:`flex flex-wrap items-center gap-2`},Ze=1500,Qe=O({__name:`SongRecorderAbcEditor`,props:k({isImportDisabled:{type:Boolean},message:{},sheetAbc:{}},{modelValue:{required:!0},modelModifiers:{}}),emits:k([`import`,`edit`],[`update:modelValue`]),setup(e,{emit:n}){let a=e,o=n,s=r(e,`modelValue`),{t:c}=F(),u=T(null),d=H(`syng.songRecorderAbcExpanded`,!1);async function f(){d.value=!d.value,d.value&&(await t(),u.value?.querySelector(`textarea`)?.focus())}let x=g(()=>s.value.trim()===``),C=re(!1,Ze);async function w(){try{await navigator.clipboard.writeText(s.value),C.value=!0}catch{u.value?.querySelector(`textarea`)?.select()}}function D(){s.value=``,o(`edit`)}function O(){a.sheetAbc!==null&&(s.value=a.sheetAbc,o(`edit`))}let k=g(()=>a.sheetAbc===null||s.value===a.sheetAbc);return(e,t)=>{let n=B,r=Y,g=Ie;return l(),v(`div`,{ref_key:`editorRef`,ref:u,class:`flex w-full flex-col gap-2`},[h(n,{severity:`secondary`,text:``,size:`small`,icon:b(d)?`pi pi-chevron-down`:`pi pi-chevron-right`,label:b(c)(`songRecorder.abcLabel`),"aria-expanded":b(d),"aria-controls":`song-recorder-abc-body`,class:`self-start`,"data-testid":`song-recorder-abc-toggle`,onClick:f},null,8,[`icon`,`label`,`aria-expanded`]),m(S(`div`,Je,[h(r,{id:`song-recorder-abc`,modelValue:s.value,"onUpdate:modelValue":t[0]||=e=>s.value=e,rows:`7`,class:`w-full font-mono text-sm`,spellcheck:`false`,autocapitalize:`off`,autocorrect:`off`,"aria-label":b(c)(`songRecorder.abcLabel`),placeholder:b(c)(`songRecorder.abcPlaceholder`),"data-testid":`song-recorder-abc`,onInput:t[1]||=e=>o(`edit`)},null,8,[`modelValue`,`aria-label`,`placeholder`]),S(`div`,Ye,[h(n,{severity:`secondary`,text:``,size:`small`,icon:`pi pi-trash`,label:b(c)(`generic.clear`),disabled:b(x),"data-testid":`song-recorder-abc-clear`,onClick:D},null,8,[`label`,`disabled`]),S(`div`,Xe,[h(n,{severity:`secondary`,size:`small`,icon:`pi pi-replay`,label:b(c)(`songRecorder.fromSheet`),title:b(c)(`songRecorder.fromSheetHint`),disabled:b(k),"data-testid":`song-recorder-abc-from-sheet`,onClick:O},null,8,[`label`,`title`,`disabled`]),h(n,{severity:`secondary`,size:`small`,icon:b(C)?`pi pi-check`:`pi pi-copy`,label:b(C)?b(c)(`generic.copied`):b(c)(`generic.copy`),disabled:b(x),"data-testid":`song-recorder-abc-copy`,onClick:w},null,8,[`icon`,`label`,`disabled`]),h(n,{size:`small`,icon:`pi pi-upload`,label:b(c)(`songRecorder.import`),disabled:a.isImportDisabled||b(x),"data-testid":`song-recorder-abc-import`,onClick:t[2]||=e=>o(`import`)},null,8,[`label`,`disabled`])])]),a.message?(l(),E(g,{key:0,severity:a.message.severity,size:`small`,"data-testid":`song-recorder-abc-message`,"data-severity":a.message.severity},{default:p(()=>[y(i(a.message.text),1)]),_:1},8,[`severity`,`data-severity`])):_(``,!0)],512),[[N,b(d)]])],512)}}}),$e={class:`flex w-full flex-col gap-2`},et={class:`mx-auto flex w-full max-w-180 flex-col`},tt={id:`song-recorder-piano-body`,class:`flex w-full flex-col gap-2`},nt={class:`flex items-center justify-center gap-2`},rt={key:0,class:`mx-auto w-full max-w-400`},it=O({__name:`SongRecorderPianoPanel`,props:{isPianoInput:{type:Boolean},previewLanes:{},isPreviewEnabled:{type:Boolean}},emits:[`notePressed`,`noteReleased`,`tonePlayed`],setup(e,{emit:t}){let n=e,r=t,{t:i}=F(),o=H(`syng.songRecorderPianoExpanded`,!1);a(()=>n.isPianoInput,e=>{e&&(o.value=!0)});let s=De(`syng.rangeIndex`),c=g(()=>Te[s.value]),{areKeyboardHintsVisible:u}=Oe(),d=te(`(pointer: coarse)`);return(t,n)=>{let a=B,f=Ee,p=we,g=Ce;return l(),v(`div`,$e,[S(`div`,et,[h(a,{severity:`secondary`,text:``,size:`small`,icon:b(o)?`pi pi-chevron-down`:`pi pi-chevron-right`,label:b(i)(`songRecorder.pianoLabel`),"aria-expanded":b(o),"aria-controls":`song-recorder-piano-body`,class:`self-start`,"data-testid":`song-recorder-piano-toggle`,onClick:n[0]||=e=>o.value=!b(o)},null,8,[`icon`,`label`,`aria-expanded`])]),m(S(`div`,tt,[S(`div`,nt,[h(f,{rangeIndex:b(s),"onUpdate:rangeIndex":n[1]||=e=>C(s)?s.value=e:null,headerLabel:b(i)(`songRecorder.pianoRange`),"data-testid":`song-recorder-piano-range`},null,8,[`rangeIndex`,`headerLabel`]),b(d)?_(``,!0):(l(),E(p,{key:0,modelValue:b(u),"onUpdate:modelValue":n[2]||=e=>C(u)?u.value=e:null},null,8,[`modelValue`]))]),b(o)?(l(),v(`div`,rt,[h(g,{midiMin:b(c).midiMin,midiMax:b(c).midiMax,toneLabelMode:`simple`,isOctaveShownOnC:!0,areKeyboardHintsVisible:b(u),previewLanes:e.previewLanes,isPreviewEnabled:e.isPreviewEnabled,shouldColorByCents:``,onNotePressed:n[3]||=(e,t)=>r(`notePressed`,e,t),onNoteReleased:n[4]||=(e,t)=>r(`noteReleased`,e,t),onTonePlayed:n[5]||=e=>r(`tonePlayed`,e)},null,8,[`midiMin`,`midiMax`,`areKeyboardHintsVisible`,`previewLanes`,`isPreviewEnabled`])])):_(``,!0)],512),[[N,b(o)]])])}}}),at={class:`settings-item`},ot={class:`settings-item`},st={class:`settings-item`},ct={class:`text-sm text-(--p-text-muted-color) md:block`},lt={class:`settings-item`},ut={class:`text-sm text-(--p-text-muted-color) md:block`},dt={class:`settings-item`},ft=R(O({__name:`SongRecorderSettingsRow`,props:k({isInputLocked:{type:Boolean},isTempoLocked:{type:Boolean},isGridLocked:{type:Boolean}},{input:{required:!0},inputModifiers:{},bpm:{required:!0},bpmModifiers:{},grid:{required:!0},gridModifiers:{},clef:{required:!0},clefModifiers:{},isClickEnabled:{type:Boolean,required:!0},isClickEnabledModifiers:{}}),emits:[`update:input`,`update:bpm`,`update:grid`,`update:clef`,`update:isClickEnabled`],setup(e){let t=e,n=r(e,`input`),a=r(e,`bpm`),o=r(e,`grid`),s=r(e,`clef`),u=r(e,`isClickEnabled`),{t:d}=F(),f={voice:`songRecorder.inputVoice`,piano:`songRecorder.inputPiano`},p=g(()=>je.map(e=>({label:d(f[e]),value:e}))),m=g(()=>q.map(e=>({label:d(`notes.clefLabels.${e}`),value:e}))),_=[...Ae].sort((e,t)=>t-e).map(e=>({label:`${e} BPM`,value:e})),y=ke.map(e=>({label:`1/${e}`,value:e})),x=T(null),{canScrollStart:C,canScrollEnd:w}=G(x);return(e,r)=>{let f=be,g=P,T=fe;return l(),v(`div`,{ref_key:`rowRef`,ref:x,class:c([`settings-row`,{"mask-start":b(C),"mask-end":b(w)}])},[S(`div`,at,[r[5]||=S(`div`,null,null,-1),h(f,{modelValue:n.value,"onUpdate:modelValue":r[0]||=e=>n.value=e,options:b(p),optionLabel:`label`,optionValue:`value`,allowEmpty:!1,size:`small`,disabled:t.isInputLocked,"aria-label":b(d)(`songRecorder.inputLabel`),"data-testid":`song-recorder-input`},null,8,[`modelValue`,`options`,`disabled`,`aria-label`])]),S(`div`,ot,[r[6]||=S(`div`,null,null,-1),h(f,{modelValue:s.value,"onUpdate:modelValue":r[1]||=e=>s.value=e,options:b(m),optionLabel:`label`,optionValue:`value`,allowEmpty:!1,size:`small`,"data-testid":`song-recorder-clef`},null,8,[`modelValue`,`options`])]),S(`div`,st,[S(`label`,ct,i(b(d)(`generic.tempo`)),1),h(g,{modelValue:a.value,"onUpdate:modelValue":r[2]||=e=>a.value=e,options:b(_),optionLabel:`label`,optionValue:`value`,size:`small`,disabled:t.isTempoLocked,"data-testid":`song-recorder-bpm`},null,8,[`modelValue`,`options`,`disabled`])]),S(`div`,lt,[S(`label`,ut,i(b(d)(`songRecorder.grid`)),1),h(g,{modelValue:o.value,"onUpdate:modelValue":r[3]||=e=>o.value=e,options:b(y),optionLabel:`label`,optionValue:`value`,size:`small`,disabled:t.isGridLocked,"data-testid":`song-recorder-grid`},null,8,[`modelValue`,`options`,`disabled`])]),S(`div`,dt,[r[7]||=S(`div`,null,null,-1),h(T,{modelValue:u.value,"onUpdate:modelValue":r[4]||=e=>u.value=e,iconOn:`pi pi-stopwatch`,iconOff:`pi pi-stopwatch`,label:b(d)(`generic.beat`),disabled:t.isTempoLocked,class:`justify-self-start`},null,8,[`modelValue`,`label`,`disabled`])])],2)}}}),[[`__scopeId`,`data-v-d7583de5`]]),pt=ge(),mt=[0,.5,1,1.5,2,3,3.5,4,4.5,5,5.5,6],ht={treble:77,bass:57};function gt(e){let t=(e%12+12)%12;return Math.floor(e/12)*7+mt[t]}function _t(e){let t=Math.floor(e),n=e-t;return gt(t)+(gt(t+1)-gt(t))*n}function vt(e,t,n,r){return n-(_t(e)-_t(ht[t]))*r/2}var yt=[`data-piece-count`,`data-active-piece`],bt={class:`relative min-w-max`},xt=260,St=900,Ct=24,wt=40,Tt=40,Et=-6,Dt=-13,Ot=1/3,kt=R(O({__name:`SongRecorderSheet`,props:{abc:{},activePieceIndex:{},isDone:{type:Boolean},isLive:{type:Boolean},pieceKinds:{},nowPieceIndex:{},labelMidis:{},showToneLabels:{type:Boolean},showNoteNumbers:{type:Boolean},clef:{},sungMidi:{},sungToneLabel:{},sungToneCents:{}},setup(e){let r=e,s={composerfont:ve,vocalfont:K},c=T(null),u=T(null),d=T(null),f=T([]);function p(e){let t=e.split(`|`).length;return Math.max(St,t*xt)}let h=T(null),y=T(0);function C(){let e=u.value?.querySelector(`.abcjs-staff`);if(!c.value||!e){h.value=null;return}let t=c.value.getBoundingClientRect(),n=e.getBoundingClientRect();y.value=c.value.clientHeight,h.value={topLineY:n.top-t.top,lineSpacing:n.height/4}}let E=g(()=>{let e=h.value;if(r.sungMidi==null||!e)return null;let t=vt(r.sungMidi,r.clef,e.topLineY,e.lineSpacing);return Math.max(2,Math.min(y.value-2,t))}),{colorForCents:D}=pe(),O=g(()=>r.sungToneCents==null?null:{line:{borderColor:D(r.sungToneCents,.5)},chip:{color:D(r.sungToneCents)}}),k=g(()=>r.sungToneLabel?ce(r.sungToneLabel,r.sungToneCents??0,Tt):null);function A(){f.value.forEach((e,t)=>{let n=r.pieceKinds?.[t];e.classList.toggle(`piece-active`,t===r.activePieceIndex),e.classList.toggle(`piece-now`,t===r.nowPieceIndex),e.classList.toggle(`piece-template`,n===`template`),e.classList.toggle(`piece-ghost`,n===`ghost`)})}let j=T([]),M=g(()=>r.showToneLabels?j.value:[]);function P(e,t=0){return{left:`${e.left}px`,top:`${e.top+Et+t}px`}}function F(){let e=u.value;if(!e){j.value=[];return}let t=e.getBoundingClientRect();j.value=f.value.flatMap((e,n)=>{let i=r.labelMidis?.[n];if(i==null)return[];let a=(e.querySelector(`.abcjs-notehead`)??e).getBoundingClientRect();return[{left:a.left-t.left+a.width/2,top:a.top-t.top,text:le(i,{showOctave:r.showNoteNumbers??!1}).label,flatText:se(i)}]})}a(()=>r.showNoteNumbers,F);function I(){let e=d.value,t=r.nowPieceIndex,n=t==null?null:f.value[t];if(!e||!n)return;let i=n.getBoundingClientRect().left-e.getBoundingClientRect().left+e.scrollLeft;e.scrollTo({left:i-e.clientWidth*Ot,behavior:`smooth`})}async function L(){let e=u.value;if(!e||e.offsetParent===null)return;(0,pt.renderAbc)(e,r.abc,{add_classes:!0,staffwidth:p(r.abc),paddingtop:wt,paddingbottom:wt,format:s}),await t();let n=_e(e);n>0&&((0,pt.renderAbc)(e,r.abc,{add_classes:!0,staffwidth:Math.ceil(n)+Ct,paddingtop:wt,paddingbottom:wt,format:s}),await t()),f.value=[...e.querySelectorAll(`.abcjs-note, .abcjs-rest`)],A(),F(),C(),r.isLive&&I()}let R=!1,z=!1;async function B(){if(R){z=!0;return}R=!0;try{await L()}finally{R=!1}z&&(z=!1,B())}x(()=>{B()});let V=ee(()=>{B()},150);return a(()=>[r.abc,r.clef],()=>{r.isLive?B():V()}),U(()=>d.value?.parentElement??null,([e])=>{e.contentRect.width>0&&V()}),a(()=>r.nowPieceIndex,()=>{A(),r.isLive&&I()}),a(()=>r.activePieceIndex,e=>{if(A(),e===null){!r.isDone&&d.value&&(d.value.scrollLeft=0);return}f.value[e]?.scrollIntoView({behavior:`smooth`,inline:`center`,block:`nearest`})}),(t,r)=>(l(),v(`div`,{ref_key:`rootRef`,ref:c,class:`relative mx-auto w-fit max-w-full`},[S(`div`,{ref_key:`scrollRef`,ref:d,class:`w-full overflow-x-auto rounded border border-(--p-content-border-color)`,"data-testid":`song-recorder-sheet`,"data-piece-count":b(f).length,"data-active-piece":e.activePieceIndex??``},[S(`div`,bt,[S(`div`,{ref_key:`containerRef`,ref:u,class:`relative z-10 py-0.5`},null,512),(l(!0),v(w,null,o(b(M),(e,t)=>(l(),v(`span`,{key:t,class:`pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded bg-(--p-content-background) px-0.5 text-xs leading-none font-semibold text-(--p-text-muted-color) tabular-nums`,style:n(P(e)),"data-testid":`song-recorder-tone-label`},i(e.text),5))),128)),(l(!0),v(w,null,o(b(M),(e,t)=>m((l(),v(`span`,{key:`flat-${t}`,class:`pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded bg-(--p-content-background) px-0.5 text-[10px] leading-none font-semibold text-(--p-text-muted-color)/70 tabular-nums`,style:n(P(e,Dt))},i(e.flatText),5)),[[N,e.flatText]])),128))])],8,yt),b(E)===null?_(``,!0):(l(),v(`div`,{key:0,class:`pointer-events-none absolute inset-x-2 h-0 border-t-3 border-dashed border-(--p-orange-400)/50 transition-colors duration-100`,style:n({top:`${b(E)}px`,...b(O)?.line}),"data-testid":`song-recorder-pitch-line`},null,4)),b(E)!==null&&b(k)?(l(),v(`div`,{key:1,class:`pointer-events-none absolute inset-x-2 z-20 flex -translate-y-1/2 justify-center`,style:n({top:`${b(E)}px`})},[S(`span`,{class:`rounded bg-(--p-content-background) px-0.5 text-xs leading-none font-semibold text-(--p-orange-400) tabular-nums transition-colors duration-100`,style:n(b(O)?.chip)},i(b(k)),5)],4)):_(``,!0)],512))}}),[[`__scopeId`,`data-v-159c3b90`]]),At=1e-6;function jt(e,t){let n=e*t;return Math.abs(n-Math.round(n))<At}function Mt(e){return e.replace(/<[^>]*>/g,``).replace(/\s+/g,` `).trim()}function Nt(e){return Ae.reduce((t,n)=>Math.abs(n-e)<Math.abs(t-e)?n:t)}function Pt(e,t){let[n]=(0,pt.parseOnly)(e);if(!n)return{ok:!1,error:`empty`};let r=n.warnings?.[0];if(r)return{ok:!1,error:`invalid`,detail:Mt(r)};let i=n.getMeterFraction();if(i.num!==4||i.den!==4)return{ok:!1,error:`meter`};let a=new Set,o=n.setUpAudio({}).tracks;o.length>1&&a.add(`voices`);let s=(o[0]??[]).filter(e=>e.cmd===`note`),c=new Map;for(let e of s){let t=c.get(e.start);t&&a.add(`chords`),(!t||e.pitch>t.pitch)&&c.set(e.start,e)}let l=[...c.values()].sort((e,t)=>e.start-t.start);if(l.length===0)return{ok:!1,error:`empty`};let u=n.metaText.tempo,d=u?.bpm&&u.duration?.[0]?u.bpm*u.duration[0]*4:t.bpm,f=Nt(d);u?.bpm&&f!==Math.round(d)&&a.add(`tempo`);let p=n.getPickupLength(),m=p>0?n.getBarLength()-p:0,h=l.flatMap(e=>[e.start+m,e.start+m+e.duration]),g=t.grid;h.every(e=>jt(e,g))||(g=16),h.every(e=>jt(e,16))||a.add(`rhythm`);let _=24e4/f;return{ok:!0,events:l.map(e=>({startMs:(e.start+m)*_,endMs:(e.start+m+e.duration)*_,midi:e.pitch})),bpm:f,clef:n.lines[0]?.staff?.[0]?.clef?.type===`bass`?`bass`:`treble`,grid:g,notices:[...a]}}function Ft(e){let{minNoteMs:t,earlyPressToleranceMs:n=0}=e,r=[],i=null;function a(e){i&&=(e>i.startMs&&r.push({startMs:i.startMs,endMs:e,midi:i.midi}),null)}function o(e){let t=r.at(-1);!t||t.endMs<=e||(e<=t.startMs?r.pop():t.endMs=e)}function s(e,t){if(t<-n)return!1;let s=Math.max(0,t),c=r.length,l=r.at(-1)?.endMs;return a(s),o(s),i={midi:e,startMs:s},r.length!==c||r.at(-1)?.endMs!==l}function c(e,n){return!i||i.midi!==e?!1:(a(Math.max(n,i.startMs+t)),!0)}function l(e){return i&&a(Math.max(e,i.startMs+t)),r}function u(){return i?.midi??null}function d(){return i?{...i}:null}return{events:r,press:s,release:c,flush:l,heldMidi:u,heldNote:d}}function It(e,t){return 24e4/(e*t)}function Lt(e,t){return e/4*t}var Rt=.2,zt=.15,Bt=.45;function Vt(e){return Math.min(Bt,Math.max(zt,e*Rt))}function Ht(e,t){let n=It(t.bpm,t.grid),r=Lt(t.grid,t.beatsPerBar),i=[],a=0,o=[...e].sort((e,t)=>e.startMs-t.startMs);for(let e of o){let t=Math.max(a,Math.round(e.startMs/n)),r=(e.endMs-e.startMs)/n,o=Math.round(e.endMs/n+Vt(r));if(o<=t){if(e.endMs-e.startMs<n/2)continue;o=t+1}t>a&&i.push({midi:null,startUnit:a,units:t-a}),i.push({midi:e.midi,startUnit:t,units:o-t}),a=o}let{padLastBar:s=!0}=t,c=Math.ceil(a/r)*r;return s&&c>a&&i.push({midi:null,startUnit:a,units:c-a}),i}var Ut=2;function Wt(e){let{captured:t,openNote:n,nowUnit:r,unitMs:i,barUnits:a,totalUnits:o}=e,s=t.map(e=>({...e,kind:`captured`})),c=t.at(-1),l=c?c.startUnit+c.units:0;function u(e){e<=l||(s.push({midi:null,startUnit:l,units:e-l,kind:`captured`}),l=e)}if(n){let e=Math.max(l,Math.round(n.startMs/i)),t=Math.max(e+1,r+1);u(e),s.push({midi:n.midi,startUnit:e,units:t-e,kind:`ghost`}),l=t}u(r);let d=Math.floor(Math.max(r,0)/a),f=Math.min(o,Math.max((d+Ut)*a,Math.ceil(l/a)*a));for(let e=l;e<f;e++)s.push({midi:null,startUnit:e,units:1,kind:`template`});return s}function Gt(e,t){if(t<0)return null;let n=e.findIndex(e=>e.startUnit<=t&&t<e.startUnit+e.units);return n===-1?null:n}function Kt(e){let t=new Set;for(let n=1;n<=e;n*=2){t.add(n);let r=n*1.5;Number.isInteger(r)&&r<=e&&t.add(r)}return[...t].sort((e,t)=>t-e)}function qt(e,t){let n=[],r=e;for(;r>0;){let e=t.find(e=>e<=r)??1;n.push(e),r-=e}return n}function Jt(e,t){let{bpm:n,grid:r,beatsPerBar:i,clef:a}=t,o=Lt(r,i),s=r/4,c=Kt(r),l=[],u=[],d=``,f=-1,p=null,m=new Set;function h(e){let t=Math.floor(e/o);t!==f&&(f>=0&&u.push(d.trim()),d=``,f=t,p=null,m=new Set)}function g(e){let t=J(e);return t.startsWith(`^`)?(m.add(t.slice(1)),t):m.has(t)?(m.delete(t),`=${t}`):t}e.forEach((e,t)=>{let n=e.startUnit,r=e.units;for(;r>0;){h(n);let i=(f+1)*o,a=Math.min(r,i-n);for(let i of qt(a,c)){let a=i===r,c=e.midi===null,u=Math.floor(n%o/s),f=!c&&i<s,m=f&&p===u,h=i===1?``:String(i),_=c?`z${h}`:`${g(e.midi)}${h}${a?``:`-`}`;d+=(m?``:` `)+_,p=f?u:null,l.push({noteIndex:t,startUnit:n,units:i,isRest:c}),n+=i,r-=i}}}),f>=0&&u.push(d.trim());let _=[`X:1`,`M:${i}/4`,`L:1/${r}`,`Q:1/4=${n}`,`K:C clef=${a}`],v=u.length>0?`${u.join(` | `)} |]`:`z${o} |]`;return{abc:[..._,v].join(`
`),pieces:l}}var Yt=ue({types:{events:{}}}).createMachine({id:`songRecorder`,initial:`idle`,states:{idle:{on:{RECORD:`countIn`,IMPORT:`review`}},countIn:{on:{COUNT_IN_DONE:`recording`,STOP:`idle`,ERROR:`idle`}},recording:{on:{STOP:`review`,LIMIT_REACHED:`review`,ERROR:`idle`}},review:{initial:`stopped`,on:{RESET:`idle`,IMPORT:`.stopped`},states:{stopped:{on:{PLAY:`playing`}},playing:{on:{PAUSE:`paused`,STOP_PLAYBACK:`stopped`,PLAYBACK_DONE:`stopped`}},paused:{on:{RESUME:`playing`,STOP_PLAYBACK:`stopped`}}}}}}),Xt=.1,Zt=.92;function Qt(e){let{detection:t,bpm:n,grid:r,clef:i,isClickEnabled:o,input:c}=e,{snapshot:l,send:u}=de(Yt),{warmUp:d,playToneAt:f,playTickAt:p,getNow:m,getImmediate:h,scheduleDraw:_,cancelScheduled:v}=me(),y=g(()=>l.value.matches(`idle`)),b=g(()=>l.value.matches(`countIn`)),x=g(()=>l.value.matches(`recording`)),S=g(()=>l.value.matches(`review`)),C=g(()=>l.value.matches({review:`playing`})),w=g(()=>l.value.matches({review:`paused`})),E=T(null),O=T(null),k=T(0),A=D([]),j=D(null),M=g(()=>60/n.value*4),N=g(()=>Math.floor(60/M.value)*M.value*1e3),P=X(),F=Ft({minNoteMs:0}),I=`voice`,L=0,R=ne(()=>{let e=performance.now()-L;if(e<0||(k.value=e,I===`piano`))return;let n=t.frequency.value,r=t.isClean.value&&n!==null?oe(n):null;P.push(e,r),P.events.length!==A.value.length&&(A.value=[...P.events]);let i=P.openNote();(i?.startMs!==j.value?.startMs||i?.midi!==j.value?.midi)&&(j.value=i)},{immediate:!1}),z=g(()=>Ht(A.value,{bpm:n.value,grid:r.value,beatsPerBar:4})),B=g(()=>Jt(z.value,{bpm:n.value,grid:r.value,beatsPerBar:4,clef:i.value})),V=g(()=>A.value.length>0),H=g(()=>b.value||x.value),U=g(()=>x.value?Math.floor(k.value/It(n.value,r.value)):-1),ee=g(()=>{let e=It(n.value,r.value);return Wt({captured:Ht(A.value,{bpm:n.value,grid:r.value,beatsPerBar:4,padLastBar:!1}),openNote:j.value,nowUnit:U.value,unitMs:e,barUnits:Lt(r.value,4),totalUnits:Math.round(N.value/e)})}),te=g(()=>Jt(ee.value,{bpm:n.value,grid:r.value,beatsPerBar:4,clef:i.value})),re=g(()=>H.value?te.value:B.value),ie=g(()=>H.value?te.value.pieces.map(e=>ee.value[e.noteIndex].kind):null),se=g(()=>{let e=H.value?ee.value:z.value,{pieces:t}=re.value;return t.map((n,r)=>{let i=e[n.noteIndex],a=t[r-1]?.noteIndex===n.noteIndex;return n.isRest||i.kind===`template`||a?null:i.midi})}),ce=g(()=>H.value?Gt(te.value.pieces,U.value):null);function le(){let e=60/n.value,t=m()+Xt,r=t+4*e;L=performance.now()+(r-h())*1e3;for(let n=0;n<4;n++){let r=t+n*e;p(r),_(()=>{E.value=4-n},r)}_(()=>{E.value=null,u({type:`COUNT_IN_DONE`}),R.resume()},r);let i=N.value/1e3,a=Math.round(i/e);for(let t=0;t<a;t++){let n=r+t*e;o.value&&p(n),_(()=>{O.value=t%4+1},n)}_(()=>{x.value&&fe(`LIMIT_REACHED`)},r+i)}async function ue(){y.value&&(await d(),I=c.value,!(I===`voice`&&(await t.start(),t.error.value))&&(P=X(),F=Ft({minNoteMs:It(n.value,Math.min(...ke))/2,earlyPressToleranceMs:150}),A.value=[],j.value=null,k.value=0,v(),u({type:`RECORD`}),le()))}function fe(e){if(R.pause(),v(),O.value=null,j.value=null,I===`voice`)t.stop(),A.value=[...P.flush()];else{let t=e===`LIMIT_REACHED`?N.value:Math.min(performance.now()-L,N.value);A.value=[...F.flush(t)]}u({type:e})}function pe(){if(b.value){v(),I===`voice`&&t.stop(),E.value=null,j.value=null,u({type:`STOP`});return}x.value&&fe(`STOP`)}let W=T(null),G=T(!1);function he(e){let{pieces:t}=B.value,i=z.value,a=It(n.value,r.value)/1e3,o=t[e];if(!o)return;let s=m()+Xt-o.startUnit*a;t.slice(e).forEach((n,r)=>{let o=e+r,c=s+n.startUnit*a;_(()=>{W.value=o},c);let l=i[n.noteIndex],u=r===0||t[o-1]?.noteIndex!==n.noteIndex;if(n.isRest||l.midi===null||!u)return;let d=l.startUnit+l.units-n.startUnit;f(ae(l.midi),d*a*Zt,c)});let c=t[t.length-1];_(()=>{W.value=null,G.value=!0,u({type:`PLAYBACK_DONE`})},s+(c.startUnit+c.units)*a)}async function ge(){!S.value||C.value||w.value||(await d(),v(),W.value=null,G.value=!1,he(0),u({type:`PLAY`}))}function _e(){C.value&&(v(),u({type:`PAUSE`}))}async function ve(){w.value&&(await d(),v(),he(W.value??0),u({type:`RESUME`}))}function K(){v(),W.value=null,G.value=!1,u({type:`STOP_PLAYBACK`})}function ye(){v(),W.value=null,G.value=!1,A.value=[],k.value=0,u({type:`RESET`})}function q(e,t=performance.now()){if(I!==`piano`||!(b.value||x.value))return;let n=t-L;n>=N.value||(F.press(e,n)&&(A.value=[...F.events]),j.value=F.heldNote())}function be(e,t=performance.now()){if(I!==`piano`||!(b.value||x.value))return;let n=Math.min(t-L,N.value);F.release(e,n)&&(A.value=[...F.events],j.value=null)}function xe(e){b.value||x.value||(v(),W.value=null,G.value=!1,P=X(),A.value=e,k.value=0,u({type:`IMPORT`}))}return a(t.error,e=>{I===`voice`&&e&&(b.value||x.value)&&(R.pause(),v(),E.value=null,O.value=null,j.value=null,u({type:`ERROR`}))}),s(()=>{R.pause(),v(),I===`voice`&&(b.value||x.value)&&t.stop()}),{isIdle:y,isCountingIn:b,isRecording:x,isReview:S,isPlaying:C,isPaused:w,countInBeat:E,beatInBar:O,elapsedMs:k,limitMs:N,events:A,hasNotes:V,sheet:B,displaySheet:re,pieceKinds:ie,labelMidis:se,nowPieceIndex:ce,activePieceIndex:W,hasPlayedToEnd:G,record:ue,stop:pe,play:ge,pause:_e,resume:ve,stopPlayback:K,reset:ye,importEvents:xe,pressPianoKey:q,releasePianoKey:be}}var $t=[`data-input`,`data-phase`],en={class:`flex flex-wrap items-center justify-center gap-2`},tn={class:`flex items-center gap-2`},nn={class:`hidden text-sm text-(--p-text-muted-color) md:block`},rn={key:0,class:`max-w-prose text-center text-sm text-(--p-text-muted-color)`},an={key:1,class:`text-5xl font-bold text-(--p-primary-color) tabular-nums`,"data-testid":`song-recorder-count-in`},on={key:2,class:`flex items-center gap-4`,"data-testid":`song-recorder-status`},sn={class:`flex gap-1.5`,"aria-hidden":`true`},cn={class:`text-sm text-(--p-text-muted-color) tabular-nums`},ln={class:`min-w-10 text-center font-semibold text-(--p-primary-color) tabular-nums`,"data-testid":`song-recorder-live-note`},un={key:3,class:`text-sm text-(--p-text-muted-color)`},dn={class:`w-full max-w-full`},fn=O({__name:`SongRecorderDisplay`,props:k({detection:{},simulateIdlePreview:{type:Boolean}},{bpm:{required:!0},bpmModifiers:{},grid:{required:!0},gridModifiers:{},clef:{required:!0},clefModifiers:{},isClickEnabled:{type:Boolean,required:!0},isClickEnabledModifiers:{},input:{required:!0},inputModifiers:{},toneLabelMode:{default:`simple`},toneLabelModeModifiers:{}}),emits:[`update:bpm`,`update:grid`,`update:clef`,`update:isClickEnabled`,`update:input`,`update:toneLabelMode`],setup(e,{expose:t}){let n=e,s=r(e,`bpm`),d=r(e,`grid`),f=r(e,`clef`),p=r(e,`isClickEnabled`),m=r(e,`input`),y=r(e,`toneLabelMode`),x=xe(),D=g(()=>Se(y.value)),{t:O}=F(),k=Qt({detection:n.detection,bpm:s,grid:d,clef:f,isClickEnabled:p,input:m}),{isIdle:A,isCountingIn:j,isRecording:M,isReview:N,isPlaying:P,isPaused:I,countInBeat:L,beatInBar:R,elapsedMs:z,limitMs:V,hasNotes:H,sheet:U,displaySheet:ee,pieceKinds:te,labelMidis:ne,nowPieceIndex:re,activePieceIndex:ae,hasPlayedToEnd:se,record:ce,stop:ue,play:de,pause:fe,resume:pe,stopPlayback:me,reset:G,importEvents:ge,pressPianoKey:_e,releasePianoKey:ve}=k,K=g(()=>j.value||M.value),q=g(()=>P.value||I.value),J=g(()=>m.value===`piano`),{isPreviewEnabled:Y}=ie(),Ce=g({get:()=>Y.value&&!n.simulateIdlePreview,set:e=>{Y.value=e}}),{previewMidi:we,previewFrequency:Te,previewNoteLabel:Ee,rawFrequency:De,rawIsClean:Oe,isPreviewListening:ke,micPermission:Ae,triggerDeafPeriod:je}=he({isGameActive:g(()=>K.value||q.value),isEnabled:Ce}),X=g(()=>!K.value&&!n.simulateIdlePreview),Z=T(null);function Me(e,t){Z.value=e,_e(e,t)}function Q(e,t){Z.value===e&&(Z.value=null),ve(e,t)}function Ne(){je()}let Pe=g(()=>{if(J.value)return q.value?null:Z.value;if(!Y.value||q.value)return null;let e=X.value?De.value:n.detection.frequency.value,t=X.value?Oe.value:n.detection.isClean.value;return!(X.value?ke.value:n.detection.isListening.value)||!t||e===null?null:oe(e)}),Fe={previewMidi:null,previewFrequency:null,previewNoteLabel:null,laneId:`low`},Ie=g(()=>{if(!Y.value||K.value||q.value)return[Fe];if(!n.simulateIdlePreview)return[{previewMidi:we.value,previewFrequency:Te.value,previewNoteLabel:Ee.value,laneId:`low`}];let e=n.detection.noteInfo.value;return!e||!n.detection.isClean.value?[Fe]:[{previewMidi:e.midiNote,previewFrequency:n.detection.frequency.value,previewNoteLabel:le(e.midiNote).label,laneId:`low`}]}),{stableSungLabel:Le,stableSungCents:Re}=ye({sungMidi:Pe,showOctave:T(!0)}),ze=g(()=>!!n.simulateIdlePreview&&Y.value&&!K.value&&!q.value);a(ze,e=>{e?n.detection.start():(!K.value||J.value)&&n.detection.stop()},{immediate:!0});let Be=g(()=>{if(J.value)return!M.value||Z.value===null?null:le(Z.value,{showOctave:!0}).label;let e=n.detection.noteInfo.value;return!M.value||!n.detection.isClean.value||!e?null:le(e.midiNote,{showOctave:!0}).label});function Ve(e){let t=Math.floor(e/1e3);return`${Math.floor(t/60)}:${String(t%60).padStart(2,`0`)}`}let He=Array.from({length:4},(e,t)=>t+1),$=T(``),Ue=T(null);a(()=>N.value?U.value.abc:null,e=>{e!==null&&($.value=e)}),a(A,e=>{e&&($.value=``,Ue.value=null)});function We(){let e=Pt($.value,{bpm:s.value,grid:d.value});if(!e.ok){Ue.value={severity:`error`,text:O(`songRecorder.importErrors.${e.error}`,{detail:e.detail??``})};return}s.value=e.bpm,d.value=e.grid,f.value=e.clef,ge(e.events),$.value=U.value.abc,Ue.value=e.notices.length>0?{severity:`warn`,text:e.notices.map(e=>O(`songRecorder.importNotices.${e}`)).join(` `)}:null}return t({recorder:k}),(t,n)=>{let r=B,a=W,g=be;return l(),v(`div`,{class:`mx-auto flex w-full max-w-400 flex-1 flex-col items-center gap-4 px-2 pb-4`,"data-testid":`song-recorder-display`,"data-input":m.value,"data-phase":b(A)?`idle`:b(j)?`countIn`:b(M)?`recording`:`review`},[h(ft,{bpm:s.value,"onUpdate:bpm":n[0]||=e=>s.value=e,grid:d.value,"onUpdate:grid":n[1]||=e=>d.value=e,clef:f.value,"onUpdate:clef":n[2]||=e=>f.value=e,isClickEnabled:p.value,"onUpdate:isClickEnabled":n[3]||=e=>p.value=e,input:m.value,"onUpdate:input":n[4]||=e=>m.value=e,isInputLocked:b(K),isTempoLocked:!b(A),isGridLocked:b(K)||b(q)},null,8,[`bpm`,`grid`,`clef`,`isClickEnabled`,`input`,`isInputLocked`,`isTempoLocked`,`isGridLocked`]),S(`div`,en,[b(A)?(l(),E(r,{key:0,severity:`danger`,size:`small`,rounded:``,icon:`pi pi-circle-fill`,label:b(O)(`songRecorder.record`),class:`min-w-24`,"data-testid":`song-recorder-record`,onClick:b(ce)},null,8,[`label`,`onClick`])):_(``,!0),b(K)?(l(),E(r,{key:1,severity:`danger`,size:`small`,rounded:``,label:b(O)(`generic.stop`),class:`min-w-24`,"data-testid":`song-recorder-stop`,onClick:b(ue)},null,8,[`label`,`onClick`])):_(``,!0),b(N)?(l(),v(w,{key:2},[b(q)?_(``,!0):(l(),E(r,{key:0,severity:`success`,size:`small`,rounded:``,label:b(O)(`generic.play`),disabled:!b(H),class:`min-w-20`,"data-testid":`song-recorder-play`,onClick:b(de)},null,8,[`label`,`disabled`,`onClick`])),b(P)?(l(),E(r,{key:1,severity:`warn`,size:`small`,rounded:``,label:b(O)(`generic.pause`),class:`min-w-20`,"data-testid":`song-recorder-pause`,onClick:b(fe)},null,8,[`label`,`onClick`])):_(``,!0),b(I)?(l(),E(r,{key:2,severity:`success`,size:`small`,rounded:``,label:b(O)(`generic.resume`),class:`min-w-20`,"data-testid":`song-recorder-resume`,onClick:b(pe)},null,8,[`label`,`onClick`])):_(``,!0),b(q)?(l(),E(r,{key:3,severity:`danger`,size:`small`,rounded:``,label:b(O)(`generic.stop`),class:`min-w-20`,"data-testid":`song-recorder-stop-playback`,onClick:b(me)},null,8,[`label`,`onClick`])):_(``,!0),h(r,{severity:`secondary`,size:`small`,rounded:``,icon:`pi pi-refresh`,label:b(O)(`songRecorder.newRecording`),"data-testid":`song-recorder-reset`,onClick:b(G)},null,8,[`label`,`onClick`])],64)):_(``,!0),h(a,{modelValue:b(Y),"onUpdate:modelValue":n[5]||=e=>C(Y)?Y.value=e:null,disabled:b(q)||b(K)&&b(J)||!e.simulateIdlePreview&&b(Ae)===`denied`},null,8,[`modelValue`,`disabled`]),S(`div`,tn,[S(`label`,nn,i(b(O)(`generic.toneLabels`)),1),h(g,{modelValue:y.value,"onUpdate:modelValue":n[6]||=e=>y.value=e,options:b(x),optionLabel:`label`,optionValue:`value`,allowEmpty:!1,size:`small`,"aria-label":b(O)(`generic.toneLabels`),"data-testid":`song-recorder-tone-labels`},null,8,[`modelValue`,`options`,`aria-label`])])]),b(A)?(l(),v(`p`,rn,i(b(O)(b(J)?`songRecorder.hintPiano`:`songRecorder.hint`,{seconds:Math.round(b(V)/1e3)})),1)):_(``,!0),b(j)?(l(),v(`div`,an,i(b(L)??``),1)):_(``,!0),b(M)?(l(),v(`div`,on,[S(`div`,sn,[(l(!0),v(w,null,o(b(He),e=>(l(),v(`span`,{key:e,class:c([`size-3 rounded-full transition-colors duration-75`,e===b(R)?`bg-(--p-primary-color)`:`bg-(--p-content-border-color)`])},null,2))),128))]),S(`span`,cn,i(Ve(b(z)))+` / `+i(Ve(b(V))),1),S(`span`,ln,i(b(Be)??`–`),1)])):_(``,!0),b(N)&&!b(H)?(l(),v(`p`,un,i(b(O)(b(J)?`songRecorder.noNotesPiano`:`songRecorder.noNotes`)),1)):_(``,!0),S(`div`,dn,[h(kt,{abc:b(ee).abc,activePieceIndex:b(ae),pieceKinds:b(te),nowPieceIndex:b(re),labelMidis:b(ne),showToneLabels:b(D).showLabels,showNoteNumbers:b(D).showOctave,isDone:b(se),isLive:b(j)||b(M),clef:f.value,sungMidi:b(Pe),sungToneLabel:b(Le),sungToneCents:b(Re)},null,8,[`abc`,`activePieceIndex`,`pieceKinds`,`nowPieceIndex`,`labelMidis`,`showToneLabels`,`showNoteNumbers`,`isDone`,`isLive`,`clef`,`sungMidi`,`sungToneLabel`,`sungToneCents`])]),h(it,{isPianoInput:b(J),previewLanes:b(Ie),isPreviewEnabled:b(Y),onNotePressed:Me,onNoteReleased:Q,onTonePlayed:Ne},null,8,[`isPianoInput`,`previewLanes`,`isPreviewEnabled`]),h(Qe,{modelValue:b($),"onUpdate:modelValue":n[7]||=e=>C($)?$.value=e:null,isImportDisabled:b(K)||b(q),message:b(Ue),sheetAbc:b(N)?b(U).abc:null,class:`max-w-180`,onImport:We,onEdit:n[8]||=e=>Ue.value=null},null,8,[`modelValue`,`isImportDisabled`,`message`,`sheetAbc`]),u(t.$slots,`default`)],8,$t)}}});export{fn as t};