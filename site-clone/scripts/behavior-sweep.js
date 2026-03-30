// Behavior Sweep Script — run via Chrome MCP evaluate_script
// Detects interaction models: scroll-driven animations, click-driven state changes,
// hover effects, CSS transitions, and animation timelines.
//
// Usage: Copy the function body into evaluate_script's `function` parameter.
// Returns: { url, scrollBehaviors, transitions, animations, hoverTargets, interactionModel, summary }

// eslint-disable-next-line no-unused-vars
const behaviorSweep = () => {
  const result = {
    url: window.location.href,
    scrollBehaviors: [],
    transitions: [],
    animations: [],
    hoverTargets: [],
    intersectionTargets: [],
    interactionModel: 'static'
  };

  const seen = new Set();

  // 1. Detect elements with CSS transitions
  document.querySelectorAll('*').forEach(el => {
    const s = getComputedStyle(el);
    const transition = s.transition || s.webkitTransition || '';
    if (transition && transition !== 'all 0s ease 0s' && transition !== 'none') {
      const tag = el.tagName.toLowerCase();
      const cls = el.className ? String(el.className).slice(0, 60) : '';
      const key = `transition:${tag}:${cls}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.transitions.push({
          element: tag,
          classes: cls,
          transition: transition.slice(0, 150),
          properties: s.transitionProperty?.split(',').map(p => p.trim()).slice(0, 5) || []
        });
      }
    }
  });

  // 2. Detect elements with CSS animations
  document.querySelectorAll('*').forEach(el => {
    const s = getComputedStyle(el);
    const anim = s.animationName || s.webkitAnimationName || '';
    if (anim && anim !== 'none') {
      const tag = el.tagName.toLowerCase();
      const cls = el.className ? String(el.className).slice(0, 60) : '';
      const key = `anim:${anim}:${tag}:${cls}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.animations.push({
          element: tag,
          classes: cls,
          name: anim,
          duration: s.animationDuration,
          iterationCount: s.animationIterationCount,
          timeline: s.animationTimeline || 'auto'
        });
      }
    }
  });

  // 3. Detect scroll-driven patterns
  // Check for scroll-snap
  const htmlSnap = getComputedStyle(document.documentElement).scrollSnapType;
  const bodySnap = getComputedStyle(document.body).scrollSnapType;
  if ((htmlSnap && htmlSnap !== 'none') || (bodySnap && bodySnap !== 'none')) {
    result.scrollBehaviors.push({
      type: 'scroll-snap',
      value: htmlSnap !== 'none' ? htmlSnap : bodySnap
    });
  }

  // Check for scroll-snap children
  document.querySelectorAll('[style*="scroll-snap"], [class*="snap"]').forEach(el => {
    const snap = getComputedStyle(el).scrollSnapAlign;
    if (snap && snap !== 'none') {
      result.scrollBehaviors.push({
        type: 'scroll-snap-child',
        element: el.tagName.toLowerCase(),
        classes: el.className ? String(el.className).slice(0, 60) : '',
        align: snap
      });
    }
  });

  // Check for elements with animation-timeline (scroll-driven animations)
  document.querySelectorAll('*').forEach(el => {
    const s = getComputedStyle(el);
    const timeline = s.animationTimeline || '';
    if (timeline && timeline !== 'auto' && timeline !== 'none') {
      result.scrollBehaviors.push({
        type: 'animation-timeline',
        element: el.tagName.toLowerCase(),
        classes: el.className ? String(el.className).slice(0, 60) : '',
        timeline
      });
    }
  });

  // Detect parallax indicators
  document.querySelectorAll('[class*="parallax"], [data-parallax], [data-speed], [data-rellax]').forEach(el => {
    result.scrollBehaviors.push({
      type: 'parallax',
      element: el.tagName.toLowerCase(),
      classes: el.className ? String(el.className).slice(0, 60) : '',
      dataAttrs: {
        speed: el.dataset.speed || el.dataset.rellax || null
      }
    });
  });

  // 4. Detect hover-interactive elements (elements with hover-related transitions)
  const hoverCandidates = document.querySelectorAll(
    'a, button, [role="button"], [class*="card"], [class*="link"], ' +
    '[class*="btn"], [class*="hover"], [class*="interactive"]'
  );
  hoverCandidates.forEach(el => {
    const s = getComputedStyle(el);
    const hasTransition = s.transition && s.transition !== 'all 0s ease 0s' && s.transition !== 'none';
    const hasTransform = s.transform && s.transform !== 'none';
    const hasCursor = s.cursor === 'pointer';
    if (hasTransition && hasCursor) {
      const tag = el.tagName.toLowerCase();
      const cls = el.className ? String(el.className).slice(0, 60) : '';
      const key = `hover:${tag}:${cls}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.hoverTargets.push({
          element: tag,
          classes: cls,
          text: el.textContent.trim().slice(0, 40),
          transition: s.transition.slice(0, 100),
          hasTransform,
          properties: s.transitionProperty?.split(',').map(p => p.trim()).slice(0, 5) || []
        });
      }
    }
  });

  // 5. Detect IntersectionObserver targets (data attributes commonly used)
  document.querySelectorAll(
    '[data-animate], [data-aos], [data-scroll], [data-reveal], ' +
    '[class*="animate-on-scroll"], [class*="fade-in"], [class*="slide-in"], ' +
    '[class*="reveal"], [data-inview], [data-intersection]'
  ).forEach(el => {
    result.intersectionTargets.push({
      element: el.tagName.toLowerCase(),
      classes: el.className ? String(el.className).slice(0, 80) : '',
      dataAttrs: {
        animate: el.dataset.animate || null,
        aos: el.dataset.aos || null,
        scroll: el.dataset.scroll || null,
        reveal: el.dataset.reveal || null
      }
    });
  });

  // 6. Determine overall interaction model
  const hasScrollDriven = result.scrollBehaviors.length > 0 || result.intersectionTargets.length > 0;
  const hasAnimations = result.animations.length > 0;
  const hasHover = result.hoverTargets.length > 2;
  const hasTransitions = result.transitions.length > 3;

  if (hasScrollDriven && hasAnimations) {
    result.interactionModel = 'scroll-driven + animated';
  } else if (hasScrollDriven) {
    result.interactionModel = 'scroll-driven';
  } else if (hasAnimations && hasHover) {
    result.interactionModel = 'animated + hover';
  } else if (hasAnimations) {
    result.interactionModel = 'animated';
  } else if (hasHover || hasTransitions) {
    result.interactionModel = 'hover + transitions';
  } else {
    result.interactionModel = 'static';
  }

  return {
    ...result,
    transitions: result.transitions.slice(0, 25),
    hoverTargets: result.hoverTargets.slice(0, 20),
    intersectionTargets: result.intersectionTargets.slice(0, 20),
    summary: {
      interactionModel: result.interactionModel,
      scrollBehaviors: result.scrollBehaviors.length,
      transitions: result.transitions.length,
      animations: result.animations.length,
      hoverTargets: result.hoverTargets.length,
      intersectionTargets: result.intersectionTargets.length
    }
  };
};
