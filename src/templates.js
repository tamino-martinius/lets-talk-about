export const builtinTemplates = {
  default(slots) {
    return slots.default || '';
  },

  'two-column'(slots) {
    const left = slots.left || slots.default || '';
    const right = slots.right || '';
    return `<div class="template-two-column">
        <div class="template-col">${left}</div>
        <div class="template-col">${right}</div>
      </div>`;
  },

  'title-content'(slots) {
    const title = slots.title || '';
    const content = slots.default || '';
    return `<div class="template-title-content">
        <div class="template-title-area">${title}</div>
        <div class="template-content-area">${content}</div>
      </div>`;
  },
};
