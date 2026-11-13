/* Official Fade: threshold .1, once, y 25, .75s, Power3.easeOut; copy/image delay .15s. */
(() => {
 const media = window.matchMedia('(prefers-reduced-motion: reduce)');
 const pending = new Map(), completed = new WeakSet(), seenCards = new Set();
 let observer;
 function reveal(group) {
  const entry = pending.get(group);
  if (!entry) return;
  for (const {node} of entry.targets) node.classList.add('is-revealed');
  if (entry.cardId) seenCards.add(entry.cardId);
  completed.add(group);
  pending.delete(group);
  observer?.unobserve(group);
 }
 function register(group, targets, cardId) {
  if (!group || pending.has(group) || completed.has(group)) return;
  if (!observer || media.matches || (cardId && seenCards.has(cardId))) return;
  targets = targets.filter(target => target.node);
  for (const {node, delay = 0} of targets) {
   node.classList.add('scroll-reveal');
   node.style.setProperty('--reveal-delay', `${delay}s`);
  }
  pending.set(group, {targets, cardId});
  observer.observe(group);
 }
 function refresh() {
  for (const group of pending.keys()) {
   if (!group.isConnected) { observer?.unobserve(group); pending.delete(group); }
  }
  for (const section of document.querySelectorAll('#intelligence .intel-section')) {
   register(section.querySelector('.ImageBlock_block__layout__ZgEZN'), [
    {node: section.querySelector('.intel-copy')},
    {node: section.querySelector('h2')},
    {node: section.querySelector('.intel-body'), delay: .15},
    {node: section.querySelector('.ImageBlock_block__image__8n3cc'), delay: .15}
   ]);
  }
  for (const node of document.querySelectorAll('#collection #filterPanel, #collection .results-bar')) register(node, [{node}]);
  Array.from(document.querySelectorAll('#collection .grid > .card')).forEach((node, index) => {
   register(node, [{node, delay: (index % 4) * .05}], node.querySelector('[data-open]')?.dataset.open);
  });
 }
 if (typeof window.IntersectionObserver === 'function') {
  observer = new window.IntersectionObserver(entries => {
   for (const entry of entries) if (entry.isIntersecting && entry.intersectionRatio >= .1) reveal(entry.target);
  }, {threshold: .1});
 }
 media.addEventListener?.('change', () => {
  if (media.matches) for (const group of [...pending.keys()]) reveal(group);
  else refresh();
 });
 document.addEventListener('focusin', event => {
  for (const group of [...pending.keys()]) if (group.contains(event.target)) reveal(group);
 });
 window.scrollReveal = {refresh};
 refresh();
})();
