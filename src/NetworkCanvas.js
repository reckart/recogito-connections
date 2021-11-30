import { SVG } from '@svgdotjs/svg.js';

import Arrow from './connections/Arrow';
import HoverState from './state/HoverState';
// import HoveredAnnotation from './hovered/HoveredAnnotation';

import './NetworkCanvas.scss';

const isAnnotation = element =>
  element.classList?.contains('r6o-annotation');

const isHandle = element =>
  element.closest && element.closest('.r6o-connections-handle');

export default class NetworkCanvas {

  constructor() {
    this.svg = SVG().addTo('body');
    this.svg.attr('class', 'r6o-connections-canvas');

    this.initGlobalEvents();

    this.hoverStack = [];

    this.currentArrow = null;
  }

  initGlobalEvents = () => {
    const opts = {
      capture: true,
      passive: true
    }

    document.addEventListener('mouseover', evt => {
      if (isAnnotation(evt.target))
        this.onEnterAnnotation(evt);
    }, opts);

    // Note: mouseleave is handled by the hover state.
    // This way, we'll capture when the user leaves the hover
    // element (outline, handle, etc.) and can handle
    // cases where the user clicks the element vs. the handle.
    document.addEventListener('mouseout', evt => {
      if (isAnnotation(evt.target)) {
        // Note: entering the connection handle will also cause  a
        // mouseleave event for the annotation!
        if (!isHandle(evt.relatedTarget))
          this.onLeaveAnnotation(evt.target.annotation); 
      }
    });

    document.addEventListener('mousedown', this.onMouseDown)

    document.addEventListener('mousemove', this.onMouseMove)
  }

  initHoverEvents = hoverState => {
    hoverState.on('selectAnnotation', () => console.log('select'));
    hoverState.on('startConnection', () => console.log('start connection'));
    hoverState.on('mouseout', () => this.onLeaveAnnotation(hoverState.annotation));
  }

  /**
   * When entering an annotation show hover emphasis. If there's no
   * dragged arrow, show connection handle. If there is a dragged 
   * arrow, snap it.
   */
  onEnterAnnotation = evt => {
    const element = evt.target;
    const { annotation } = element;

    const previousState = this.hoverStack.length > 0 &&
      this.hoverStack[this.hoverStack.length - 1];

    // Destroy previous, if any
    if (previousState)
      previousState.clearSVG();

    const nextState = new HoverState(annotation, element);
    this.initHoverEvents(nextState);
    this.hoverStack.push(nextState);

    nextState.renderOutline(this.svg);
    
    if (this.currentArrow) {
      this.currentArrow.snapTo(annotation, element);
    } else {
      nextState.renderHandle(this.svg, evt.clientX, evt.clientY);
    }
  }

  /**
   * When leaving an annotation, clear the hover if necessary.
   */
  onLeaveAnnotation = annotation =>  {
    const state = this.hoverStack.find(state => state.annotation.isEqual(annotation));

    if (state) {
      // Clear this state
      state.clearSVG();
      
      // Remove from the stack
      this.hoverStack = this.hoverStack.filter(s => s !== state);

      // Render previous state, if any
      if (this.hoverStack.length > 0) {
        const topState = this.hoverStack[this.hoverStack.length - 1];
        this.initHoverEvents(topState);
        topState.renderOutline(this.svg);
        topState.renderHandle(this.svg);
      }
    }
  }

  /**
   * If there is no arrow, but a current hover: start arrow. If
   * there is an arrow that's currently snapped: create connection.
   */
  onMouseDown = () => {
    if (!this.currentArrow && this.currentHover) {
      this.currentHover.destroy();
      this.currentArrow = new Arrow(this.currentHover).addTo(this.svg);
    } else if (this.currentArrow?.isSnapped()) {
      // TODO
      console.log('created');
    }
  }

  /**
   * If there is a current arrow and it's not snapped, drag it to mouse position.
   */
  onMousMove = evt => {
    if (this.currentArrow && !this.currentArrow.isSnapped()) {
      this.currentArrow.dragTo({ 
        x: evt.clientX,
        y: evt.clientY
      });
    }
  }

}