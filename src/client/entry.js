import './styles.css';

const mode = new URLSearchParams(location.search).get('mode');
if (mode === 'presenter') {
  Promise.all([import('./presenter.css'), import('./presenter.js')]).then(([, m]) =>
    m.initPresenter(),
  );
} else {
  import('./slides.js').then((m) => m.init());
}
