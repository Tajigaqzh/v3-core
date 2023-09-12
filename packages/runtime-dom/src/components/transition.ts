export interface ElementWithTransition extends HTMLElement {
    // _vtc = Vue Transition Classes.
    // Store the temporarily-added transition classes on the element
    // so that we can avoid overwriting them if the element's class is patched
    // during the transition.
    _vtc?: Set<string>
  }
  