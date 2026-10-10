import{P as e,T as t,d as n,f as r,l as i}from"./runtime-core.esm-bundler-Yj51g2kL.js";import{a}from"./select-vPTDITC8.js";import{i as o}from"./_plugin-vue_export-helper-D3JGZI6p.js";import{D as s,M as c,y as l,z as u}from"./button-qQQdDC9h.js";import{t as d}from"./classnames-CRHlWn3X.js";var f=o.extend({name:`slider`,style:`
    .p-slider {
        display: block;
        position: relative;
        background: dt('slider.track.background');
        border-radius: dt('slider.track.border.radius');
    }

    .p-slider-handle {
        cursor: grab;
        touch-action: none;
        user-select: none;
        display: flex;
        justify-content: center;
        align-items: center;
        height: dt('slider.handle.height');
        width: dt('slider.handle.width');
        background: dt('slider.handle.background');
        border-radius: dt('slider.handle.border.radius');
        transition:
            background dt('slider.transition.duration'),
            color dt('slider.transition.duration'),
            border-color dt('slider.transition.duration'),
            box-shadow dt('slider.transition.duration'),
            outline-color dt('slider.transition.duration');
        outline-color: transparent;
    }

    .p-slider-handle::before {
        content: '';
        width: dt('slider.handle.content.width');
        height: dt('slider.handle.content.height');
        display: block;
        background: dt('slider.handle.content.background');
        border-radius: dt('slider.handle.content.border.radius');
        box-shadow: dt('slider.handle.content.shadow');
        transition: background dt('slider.transition.duration');
    }

    .p-slider:not(.p-disabled) .p-slider-handle:hover {
        background: dt('slider.handle.hover.background');
    }

    .p-slider:not(.p-disabled) .p-slider-handle:hover::before {
        background: dt('slider.handle.content.hover.background');
    }

    .p-slider-handle:focus-visible {
        box-shadow: dt('slider.handle.focus.ring.shadow');
        outline: dt('slider.handle.focus.ring.width') dt('slider.handle.focus.ring.style') dt('slider.handle.focus.ring.color');
        outline-offset: dt('slider.handle.focus.ring.offset');
    }

    .p-slider-range {
        display: block;
        background: dt('slider.range.background');
        border-radius: dt('slider.track.border.radius');
    }

    .p-slider.p-slider-horizontal {
        height: dt('slider.track.size');
    }

    .p-slider-horizontal .p-slider-range {
        inset-block-start: 0;
        inset-inline-start: 0;
        height: 100%;
    }

    .p-slider-horizontal .p-slider-handle {
        inset-block-start: 50%;
        margin-block-start: calc(-1 * calc(dt('slider.handle.height') / 2));
        margin-inline-start: calc(-1 * calc(dt('slider.handle.width') / 2));
    }

    .p-slider-vertical {
        min-height: 100px;
        width: dt('slider.track.size');
    }

    .p-slider-vertical .p-slider-handle {
        inset-inline-start: 50%;
        margin-inline-start: calc(-1 * calc(dt('slider.handle.width') / 2));
        margin-block-end: calc(-1 * calc(dt('slider.handle.height') / 2));
    }

    .p-slider-vertical .p-slider-range {
        inset-block-end: 0;
        inset-inline-start: 0;
        width: 100%;
    }
`,classes:{root:function(e){var t=e.instance,n=e.props;return[`p-slider p-component`,{"p-disabled":n.disabled,"p-invalid":t.$invalid,"p-slider-horizontal":n.orientation===`horizontal`,"p-slider-vertical":n.orientation===`vertical`}]},range:`p-slider-range`,handle:`p-slider-handle`},inlineStyles:{handle:{position:`absolute`},range:{position:`absolute`}}}),p={name:`BaseSlider`,extends:a,props:{min:{type:Number,default:0},max:{type:Number,default:100},orientation:{type:String,default:`horizontal`},step:{type:Number,default:null},range:{type:Boolean,default:!1},tabindex:{type:Number,default:0},ariaLabelledby:{type:String,default:null},ariaLabel:{type:String,default:null}},style:f,provide:function(){return{$pcSlider:this,$parentInstance:this}}};function m(e){"@babel/helpers - typeof";return m=typeof Symbol==`function`&&typeof Symbol.iterator==`symbol`?function(e){return typeof e}:function(e){return e&&typeof Symbol==`function`&&e.constructor===Symbol&&e!==Symbol.prototype?`symbol`:typeof e},m(e)}function h(e,t,n){return(t=g(t))in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function g(e){var t=_(e,`string`);return m(t)==`symbol`?t:t+``}function _(e,t){if(m(e)!=`object`||!e)return e;var n=e[Symbol.toPrimitive];if(n!==void 0){var r=n.call(e,t);if(m(r)!=`object`)return r;throw TypeError(`@@toPrimitive must return a primitive value.`)}return(t===`string`?String:Number)(e)}function v(e){return S(e)||x(e)||b(e)||y()}function y(){throw TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function b(e,t){if(e){if(typeof e==`string`)return C(e,t);var n={}.toString.call(e).slice(8,-1);return n===`Object`&&e.constructor&&(n=e.constructor.name),n===`Map`||n===`Set`?Array.from(e):n===`Arguments`||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)?C(e,t):void 0}}function x(e){if(typeof Symbol<`u`&&e[Symbol.iterator]!=null||e[`@@iterator`]!=null)return Array.from(e)}function S(e){if(Array.isArray(e))return C(e)}function C(e,t){(t==null||t>e.length)&&(t=e.length);for(var n=0,r=Array(t);n<t;n++)r[n]=e[n];return r}var w={name:`Slider`,extends:p,inheritAttrs:!1,emits:[`change`,`slideend`],dragging:!1,handleIndex:null,initX:null,initY:null,barWidth:null,barHeight:null,dragListener:null,dragEndListener:null,beforeUnmount:function(){this.unbindDragListeners()},methods:{updateDomData:function(){var e=this.$el.getBoundingClientRect();this.initX=e.left+u(),this.initY=e.top+l(),this.barWidth=this.$el.offsetWidth,this.barHeight=this.$el.offsetHeight},setValue:function(e){var t,n=e.touches?e.touches[0].pageX:e.pageX,r=e.touches?e.touches[0].pageY:e.pageY;t=this.orientation===`horizontal`?c(this.$el)?(this.initX+this.barWidth-n)*100/this.barWidth:(n-this.initX)*100/this.barWidth:(this.initY+this.barHeight-r)*100/this.barHeight;var i=(this.max-this.min)*(t/100)+this.min;if(this.step){var a=this.range?this.value[this.handleIndex]:this.value,o=i-a;o<0?i=a+Math.ceil(i/this.step-a/this.step)*this.step:o>0&&(i=a+Math.floor(i/this.step-a/this.step)*this.step)}else i=Math.floor(i);this.updateModel(e,i)},updateModel:function(e,t){var n=Math.round(t*100)/100,r;this.range?(r=this.value?v(this.value):[],this.handleIndex==0?(n<this.min?n=this.min:n>=this.max&&(n=this.max),r[0]=n):(n>this.max?n=this.max:n<=this.min&&(n=this.min),r[1]=n)):(n<this.min?n=this.min:n>this.max&&(n=this.max),r=n),this.writeValue(r,e),this.$emit(`change`,r)},onDragStart:function(e,t){this.disabled||(this.$el.setAttribute(`data-p-sliding`,!0),this.dragging=!0,this.updateDomData(),this.handleIndex=this.range&&this.value[0]===this.max?0:t,e.currentTarget.focus())},onDrag:function(e){this.dragging&&this.setValue(e)},onDragEnd:function(e){this.dragging&&(this.dragging=!1,this.$el.setAttribute(`data-p-sliding`,!1),this.$emit(`slideend`,{originalEvent:e,value:this.value}))},onBarClick:function(e){this.disabled||s(e.target,`data-pc-section`)!==`handle`&&(this.updateDomData(),this.setValue(e))},onMouseDown:function(e,t){this.bindDragListeners(),this.onDragStart(e,t)},onKeyDown:function(e,t){switch(this.handleIndex=t,e.code){case`ArrowDown`:case`ArrowLeft`:this.decrementValue(e,t),e.preventDefault();break;case`ArrowUp`:case`ArrowRight`:this.incrementValue(e,t),e.preventDefault();break;case`PageDown`:this.decrementValue(e,t,!0),e.preventDefault();break;case`PageUp`:this.incrementValue(e,t,!0),e.preventDefault();break;case`Home`:this.updateModel(e,this.min),e.preventDefault();break;case`End`:this.updateModel(e,this.max),e.preventDefault()}},onBlur:function(e,t){var n,r;(n=(r=this.formField).onBlur)==null||n.call(r,e)},decrementValue:function(e,t){var n=arguments.length>2&&arguments[2]!==void 0&&arguments[2],r=this.range?this.step?this.value[t]-this.step:this.value[t]-1:this.step?this.value-this.step:!this.step&&n?this.value-10:this.value-1;this.updateModel(e,r),e.preventDefault()},incrementValue:function(e,t){var n=arguments.length>2&&arguments[2]!==void 0&&arguments[2],r=this.range?this.step?this.value[t]+this.step:this.value[t]+1:this.step?this.value+this.step:!this.step&&n?this.value+10:this.value+1;this.updateModel(e,r),e.preventDefault()},bindDragListeners:function(){this.dragListener||(this.dragListener=this.onDrag.bind(this),document.addEventListener(`mousemove`,this.dragListener)),this.dragEndListener||(this.dragEndListener=this.onDragEnd.bind(this),document.addEventListener(`mouseup`,this.dragEndListener))},unbindDragListeners:function(){this.dragListener&&=(document.removeEventListener(`mousemove`,this.dragListener),null),this.dragEndListener&&=(document.removeEventListener(`mouseup`,this.dragEndListener),null)},rangeStyle:function(){if(this.range){var e=this.rangeEndPosition>this.rangeStartPosition?this.rangeEndPosition-this.rangeStartPosition:this.rangeStartPosition-this.rangeEndPosition,t=this.rangeEndPosition>this.rangeStartPosition?this.rangeStartPosition:this.rangeEndPosition;return this.horizontal?{"inset-inline-start":t+`%`,width:e+`%`}:{bottom:t+`%`,height:e+`%`}}return this.horizontal?{width:this.handlePosition+`%`}:{height:this.handlePosition+`%`}},handleStyle:function(){return this.horizontal?{"inset-inline-start":this.handlePosition+`%`}:{bottom:this.handlePosition+`%`}},rangeStartHandleStyle:function(){return this.horizontal?{"inset-inline-start":this.rangeStartPosition+`%`}:{bottom:this.rangeStartPosition+`%`}},rangeEndHandleStyle:function(){return this.horizontal?{"inset-inline-start":this.rangeEndPosition+`%`}:{bottom:this.rangeEndPosition+`%`}}},computed:{value:function(){return this.range?[this.d_value?.[0]??this.min,this.d_value?.[1]??this.max]:this.d_value??this.min},horizontal:function(){return this.orientation===`horizontal`},vertical:function(){return this.orientation===`vertical`},handlePosition:function(){return this.value<this.min?0:this.value>this.max?100:(this.value-this.min)*100/(this.max-this.min)},rangeStartPosition:function(){return this.value&&this.value[0]!==void 0?this.value[0]<this.min?0:(this.value[0]-this.min)*100/(this.max-this.min):0},rangeEndPosition:function(){return this.value&&this.value.length===2&&this.value[1]!==void 0?this.value[1]>this.max?100:(this.value[1]-this.min)*100/(this.max-this.min):100},dataP:function(){return d(h({},this.orientation,this.orientation))}}},T=[`data-p`],E=[`data-p`],D=[`tabindex`,`aria-valuemin`,`aria-valuenow`,`aria-valuemax`,`aria-labelledby`,`aria-label`,`aria-orientation`,`data-p`],O=[`tabindex`,`aria-valuemin`,`aria-valuenow`,`aria-valuemax`,`aria-labelledby`,`aria-label`,`aria-orientation`,`data-p`],k=[`tabindex`,`aria-valuemin`,`aria-valuenow`,`aria-valuemax`,`aria-labelledby`,`aria-label`,`aria-orientation`,`data-p`];function A(a,o,s,c,l,u){return e(),r(`div`,t({class:a.cx(`root`),onClick:o[18]||=function(){return u.onBarClick&&u.onBarClick.apply(u,arguments)}},a.ptmi(`root`),{"data-p-sliding":!1,"data-p":u.dataP}),[i(`span`,t({class:a.cx(`range`),style:[a.sx(`range`),u.rangeStyle()]},a.ptm(`range`),{"data-p":u.dataP}),null,16,E),a.range?n(``,!0):(e(),r(`span`,t({key:0,class:a.cx(`handle`),style:[a.sx(`handle`),u.handleStyle()],onTouchstartPassive:o[0]||=function(e){return u.onDragStart(e)},onTouchmovePassive:o[1]||=function(e){return u.onDrag(e)},onTouchend:o[2]||=function(e){return u.onDragEnd(e)},onMousedown:o[3]||=function(e){return u.onMouseDown(e)},onKeydown:o[4]||=function(e){return u.onKeyDown(e)},onBlur:o[5]||=function(e){return u.onBlur(e)},tabindex:a.tabindex,role:`slider`,"aria-valuemin":a.min,"aria-valuenow":a.d_value,"aria-valuemax":a.max,"aria-labelledby":a.ariaLabelledby,"aria-label":a.ariaLabel,"aria-orientation":a.orientation},a.ptm(`handle`),{"data-p":u.dataP}),null,16,D)),a.range?(e(),r(`span`,t({key:1,class:a.cx(`handle`),style:[a.sx(`handle`),u.rangeStartHandleStyle()],onTouchstartPassive:o[6]||=function(e){return u.onDragStart(e,0)},onTouchmovePassive:o[7]||=function(e){return u.onDrag(e)},onTouchend:o[8]||=function(e){return u.onDragEnd(e)},onMousedown:o[9]||=function(e){return u.onMouseDown(e,0)},onKeydown:o[10]||=function(e){return u.onKeyDown(e,0)},onBlur:o[11]||=function(e){return u.onBlur(e,0)},tabindex:a.tabindex,role:`slider`,"aria-valuemin":a.min,"aria-valuenow":a.d_value?a.d_value[0]:null,"aria-valuemax":a.max,"aria-labelledby":a.ariaLabelledby,"aria-label":a.ariaLabel,"aria-orientation":a.orientation},a.ptm(`startHandler`),{"data-p":u.dataP}),null,16,O)):n(``,!0),a.range?(e(),r(`span`,t({key:2,class:a.cx(`handle`),style:[a.sx(`handle`),u.rangeEndHandleStyle()],onTouchstartPassive:o[12]||=function(e){return u.onDragStart(e,1)},onTouchmovePassive:o[13]||=function(e){return u.onDrag(e)},onTouchend:o[14]||=function(e){return u.onDragEnd(e)},onMousedown:o[15]||=function(e){return u.onMouseDown(e,1)},onKeydown:o[16]||=function(e){return u.onKeyDown(e,1)},onBlur:o[17]||=function(e){return u.onBlur(e,1)},tabindex:a.tabindex,role:`slider`,"aria-valuemin":a.min,"aria-valuenow":a.d_value?a.d_value[1]:null,"aria-valuemax":a.max,"aria-labelledby":a.ariaLabelledby,"aria-label":a.ariaLabel,"aria-orientation":a.orientation},a.ptm(`endHandler`),{"data-p":u.dataP}),null,16,k)):n(``,!0)],16,T)}w.render=A;export{w as t};