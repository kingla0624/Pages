/* ====================================
   app.js - Main Application Logic
   ==================================== */
(function () {
  const canvas = document.getElementById('atom-canvas');
  const detailSection = document.getElementById('detail-section');
  const placeholderSection = document.getElementById('placeholder-section');
  const viewerLabel = document.getElementById('viewer-label');
  const propHeader = document.getElementById('prop-header');
  const propBasic = document.getElementById('prop-basic');
  const propPhysical = document.getElementById('prop-physical');
  const propChemical = document.getElementById('prop-chemical');
  const propHistory = document.getElementById('prop-history');

  function initApp() {
    // Init periodic table
    PeriodicTable.init(
      document.getElementById('periodic-table'),
      document.getElementById('category-legend'),
      onElementSelected
    );

    // Init 3D viewer
    AtomViewer.init(canvas);

    // Resize handler
    window.addEventListener('resize', () => {
      const container = document.getElementById('viewer-container');
      AtomViewer.resize(container.clientWidth, container.clientHeight);
    });
  }

  function onElementSelected(el) {
    // Show detail section
    detailSection.classList.remove('hidden');
    placeholderSection.classList.add('hidden');

    // Update 3D viewer - need delay for CSS relayout after removing 'hidden'
    setTimeout(() => {
      const container = document.getElementById('viewer-container');
      const w = container.clientWidth;
      const h = container.clientHeight;
      // Explicitly set canvas dimensions
      canvas.width = w * window.devicePixelRatio;
      canvas.height = h * window.devicePixelRatio;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      AtomViewer.resize(w, h);
      AtomViewer.showElement(el);
    }, 200);
    // Secondary resize to catch any delayed layout
    setTimeout(() => {
      const container = document.getElementById('viewer-container');
      AtomViewer.resize(container.clientWidth, container.clientHeight);
    }, 500);

    // Update label
    viewerLabel.innerHTML = `<span style="opacity:0.5">${el.n}</span> ${el.sym} · ${el.name}`;

    // Update properties
    updateProperties(el);
  }

  function fmt(val, unit) {
    if (val === null || val === undefined) return '<span style="opacity:0.35">—</span>';
    return val + (unit ? ` <span style="opacity:0.5;font-size:0.85em">${unit}</span>` : '');
  }

  function updateProperties(el) {
    const catInfo = CATEGORIES[el.cat] || { name: el.cat };

    // Header
    propHeader.innerHTML = `
      <div class="prop-symbol-large" style="color:${catInfo.color || '#fff'}">${el.sym}</div>
      <div class="prop-name-cn">${el.name}</div>
      <div class="prop-name-en">${el.en}</div>
    `;

    // Basic info
    propBasic.innerHTML = `
      <div class="prop-group-title">基本信息</div>
      ${propRow('原子序数', el.n)}
      ${propRow('元素分类', catInfo.name)}
      ${propRow('原子量', fmt(el.mass, 'u'))}
      ${propRow('电子排布', el.ec)}
      ${propRow('电子层', shellsVisual(el.shells))}
    `;

    // Physical
    propPhysical.innerHTML = `
      <div class="prop-group-title">物理性质</div>
      ${propRow('密度', fmt(el.den, 'g/cm³'))}
      ${propRow('熔点', fmt(el.mp, '°C'))}
      ${propRow('沸点', fmt(el.bp, '°C'))}
    `;

    // Chemical
    propChemical.innerHTML = `
      <div class="prop-group-title">化学性质</div>
      ${propRow('电负性', fmt(el.en_, '(Pauling)'))}
      ${propRow('族', fmt(el.g))}
      ${propRow('周期', fmt(el.p))}
    `;

    // History
    propHistory.innerHTML = `
      <div class="prop-group-title">发现历史</div>
      ${propRow('发现者', el.disc || '—')}
      ${propRow('发现年份', el.year || '古代已知')}
    `;
  }

  function propRow(label, value) {
    return `<div class="prop-row"><span class="prop-label">${label}</span><span class="prop-value">${value}</span></div>`;
  }

  function shellsVisual(shells) {
    return '<div class="shells-visual">' +
      shells.map((s, i) => `<span class="shell-badge">${s}</span>`).join('') +
      '</div>';
  }

  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();
