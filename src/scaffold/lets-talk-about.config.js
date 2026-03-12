export default {
  slides: 'slides.md',
  theme: {
    colorTheme: '#6c6',
    colorForeground: '#000',
    colorBackground: '#fff',
    colorVignette: '#765',
    colorSectionForeground: '#fff',
  },

  // Layout: persistent elements on every slide
  // layout: {
  //   header: '<span>My Talk</span>',
  //   footer: '<span>{{slideNumber}} / {{totalSlides}}</span>',
  //   watermark: '<span>DRAFT</span>',
  // },

  // Layout can also be a function:
  // layout: (slideNumber, totalSlides) => ({
  //   footer: `<span>${slideNumber} / ${totalSlides}</span>`,
  // }),

  // Custom templates: reusable slide content arrangements
  // templates: {
  //   'my-template': (slots) => `
  //     <div class="my-layout">
  //       <div class="sidebar">${slots.sidebar || ''}</div>
  //       <div class="main">${slots.default || ''}</div>
  //     </div>
  //   `,
  // },
};
