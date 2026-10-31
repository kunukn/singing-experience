import{P as e,R as t,Rt as n,T as r,d as i,f as a,g as o}from"./runtime-core.esm-bundler-De5B8hPt.js";import{r as s,t as c}from"./basecomponent-vwkaJiGB.js";import{t as l}from"./classnames-CRHlWn3X.js";var u=s.extend({name:`progressbar`,style:`
    .p-progressbar {
        display: block;
        position: relative;
        overflow: hidden;
        height: dt('progressbar.height');
        background: dt('progressbar.background');
        border-radius: dt('progressbar.border.radius');
    }

    .p-progressbar-value {
        margin: 0;
        background: dt('progressbar.value.background');
    }

    .p-progressbar-label {
        color: dt('progressbar.label.color');
        font-size: dt('progressbar.label.font.size');
        font-weight: dt('progressbar.label.font.weight');
    }

    .p-progressbar-determinate .p-progressbar-value {
        height: 100%;
        width: 0%;
        position: absolute;
        display: none;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        transition: width 1s ease-in-out;
    }

    .p-progressbar-determinate .p-progressbar-label {
        display: inline-flex;
    }

    .p-progressbar-indeterminate .p-progressbar-value::before {
        content: '';
        position: absolute;
        background: inherit;
        inset-block-start: 0;
        inset-inline-start: 0;
        inset-block-end: 0;
        will-change: inset-inline-start, inset-inline-end;
        animation: p-progressbar-indeterminate-anim 2.1s cubic-bezier(0.65, 0.815, 0.735, 0.395) infinite;
    }

    .p-progressbar-indeterminate .p-progressbar-value::after {
        content: '';
        position: absolute;
        background: inherit;
        inset-block-start: 0;
        inset-inline-start: 0;
        inset-block-end: 0;
        will-change: inset-inline-start, inset-inline-end;
        animation: p-progressbar-indeterminate-anim-short 2.1s cubic-bezier(0.165, 0.84, 0.44, 1) infinite;
        animation-delay: 1.15s;
    }

    @keyframes p-progressbar-indeterminate-anim {
        0% {
            inset-inline-start: -35%;
            inset-inline-end: 100%;
        }
        60% {
            inset-inline-start: 100%;
            inset-inline-end: -90%;
        }
        100% {
            inset-inline-start: 100%;
            inset-inline-end: -90%;
        }
    }
    @-webkit-keyframes p-progressbar-indeterminate-anim {
        0% {
            inset-inline-start: -35%;
            inset-inline-end: 100%;
        }
        60% {
            inset-inline-start: 100%;
            inset-inline-end: -90%;
        }
        100% {
            inset-inline-start: 100%;
            inset-inline-end: -90%;
        }
    }

    @keyframes p-progressbar-indeterminate-anim-short {
        0% {
            inset-inline-start: -200%;
            inset-inline-end: 100%;
        }
        60% {
            inset-inline-start: 107%;
            inset-inline-end: -8%;
        }
        100% {
            inset-inline-start: 107%;
            inset-inline-end: -8%;
        }
    }
    @-webkit-keyframes p-progressbar-indeterminate-anim-short {
        0% {
            inset-inline-start: -200%;
            inset-inline-end: 100%;
        }
        60% {
            inset-inline-start: 107%;
            inset-inline-end: -8%;
        }
        100% {
            inset-inline-start: 107%;
            inset-inline-end: -8%;
        }
    }
`,classes:{root:function(e){var t=e.instance;return[`p-progressbar p-component`,{"p-progressbar-determinate":t.determinate,"p-progressbar-indeterminate":t.indeterminate}]},value:`p-progressbar-value`,label:`p-progressbar-label`}}),d={name:`ProgressBar`,extends:{name:`BaseProgressBar`,extends:c,props:{value:{type:Number,default:null},mode:{type:String,default:`determinate`},showValue:{type:Boolean,default:!0}},style:u,provide:function(){return{$pcProgressBar:this,$parentInstance:this}}},inheritAttrs:!1,computed:{progressStyle:function(){return{width:this.value+`%`,display:`flex`}},indeterminate:function(){return this.mode===`indeterminate`},determinate:function(){return this.mode===`determinate`},dataP:function(){return l({determinate:this.determinate,indeterminate:this.indeterminate})}}},f=[`aria-valuenow`,`data-p`],p=[`data-p`],m=[`data-p`],h=[`data-p`];function g(s,c,l,u,d,g){return e(),a(`div`,r({role:`progressbar`,class:s.cx(`root`),"aria-valuemin":`0`,"aria-valuenow":s.value,"aria-valuemax":`100`,"data-p":g.dataP},s.ptmi(`root`)),[g.determinate?(e(),a(`div`,r({key:0,class:s.cx(`value`),style:g.progressStyle,"data-p":g.dataP},s.ptm(`value`)),[s.value!=null&&s.value!==0&&s.showValue?(e(),a(`div`,r({key:0,class:s.cx(`label`),"data-p":g.dataP},s.ptm(`label`)),[t(s.$slots,`default`,{},function(){return[o(n(s.value+`%`),1)]})],16,m)):i(``,!0)],16,p)):g.indeterminate?(e(),a(`div`,r({key:1,class:s.cx(`value`),"data-p":g.dataP},s.ptm(`value`)),null,16,h)):i(``,!0)],16,f)}d.render=g;var _=1500,v=250;function y({holdMs:e=_,strayMs:t=150}={}){let n=null,r=0,i=null,a=0,o=null,s=null;function c(){i=null,a=0}function l(e,o){e===n?(c(),r+=o):(e===i?a+=o:(i=e,a=0),!(n!==null&&a<t)&&(n=e,r=a,c()))}return{get candidateMidi(){return n},get progress(){return Math.min(1,r/e)},get heldMidi(){return o},push(t,i){if(o!==null)return;if(t===null){s=null;return}let a=s===null?0:i-s;s=i,l(Math.round(t),a>v?0:a),n!==null&&r>=e&&(o=n)},reset(){n=null,r=0,o=null,s=null,c()}}}export{d as n,y as t};