/* ====================================
   periodic-table.js - Periodic Table UI
   ==================================== */
const PeriodicTable = (() => {
  let container, legendContainer;
  let onSelect = null;
  let selectedCell = null;

  // Standard periodic table layout: [period][column] -> element index
  // Lanthanides: period 8.5 (displayed as row 9), columns 4-17
  // Actinides: period 9.5 (displayed as row 10), columns 4-17

  function init(containerEl, legendEl, selectCallback) {
    container = containerEl;
    legendContainer = legendEl;
    onSelect = selectCallback;
    build();
    buildLegend();
  }

  function build() {
    container.innerHTML = '';

    // Build a grid map: row -> col -> element
    const grid = {};
    const laRow = 9; // lanthanide display row
    const acRow = 10; // actinide display row

    for (const el of ELEMENTS) {
      let row, col;

      if (el.cat === 'lanthanide' && el.n >= 58 && el.n <= 71) {
        row = laRow;
        col = 4 + (el.n - 58); // Ce=4, Pr=5, ...Lu=17
        if (el.n === 71) { row = laRow; col = 17; }
      } else if (el.cat === 'actinide' && el.n >= 90 && el.n <= 103) {
        row = acRow;
        col = 4 + (el.n - 90);
        if (el.n === 103) { row = acRow; col = 17; }
      } else if (el.n === 57) { // La
        row = laRow; col = 3;
      } else if (el.n === 89) { // Ac
        row = acRow; col = 3;
      } else {
        row = el.p;
        col = el.col;
      }

      if (!grid[row]) grid[row] = {};
      grid[row][col] = el;
    }

    // La/Ac placeholder in main table (period 6 col 3, period 7 col 3)
    // These are now in the lanthanide/actinide rows

    // Render rows 1-7 (main table) + gap row 8 + rows 9-10 (la/ac)
    const rows = [1, 2, 3, 4, 5, 6, 7, 'gap', 'la-label', 'ac-label'];
    const totalRows = 10;

    for (const rowId of [1, 2, 3, 4, 5, 6, 7]) {
      for (let col = 1; col <= 18; col++) {
        const el = grid[rowId] && grid[rowId][col];
        if (el) {
          container.appendChild(createCell(el));
        } else {
          // Check if this should be the la/ac indicator
          if (rowId === 6 && col === 3) {
            const ind = document.createElement('div');
            ind.className = 'element-cell cat-lanthanide';
            ind.style.fontSize = '0.6em';
            ind.style.opacity = '0.6';
            ind.innerHTML = '<span style="font-size:0.9em">57-71</span>';
            ind.title = '镧系元素 (点击下方查看)';
            container.appendChild(ind);
          } else if (rowId === 7 && col === 3) {
            const ind = document.createElement('div');
            ind.className = 'element-cell cat-actinide';
            ind.style.fontSize = '0.6em';
            ind.style.opacity = '0.6';
            ind.innerHTML = '<span style="font-size:0.9em">89-103</span>';
            ind.title = '锕系元素 (点击下方查看)';
            container.appendChild(ind);
          } else {
            const spacer = document.createElement('div');
            spacer.className = 'element-cell spacer';
            container.appendChild(spacer);
          }
        }
      }
    }

    // Gap row
    for (let i = 0; i < 18; i++) {
      const gap = document.createElement('div');
      gap.style.height = '6px';
      container.appendChild(gap);
    }

    // Lanthanide row (row 9)
    for (let col = 1; col <= 18; col++) {
      if (col <= 2) {
        const spacer = document.createElement('div');
        spacer.className = 'element-cell spacer';
        container.appendChild(spacer);
      } else {
        const el = grid[laRow] && grid[laRow][col];
        if (el) {
          container.appendChild(createCell(el));
        } else {
          const spacer = document.createElement('div');
          spacer.className = 'element-cell spacer';
          container.appendChild(spacer);
        }
      }
    }

    // Actinide row (row 10)
    for (let col = 1; col <= 18; col++) {
      if (col <= 2) {
        const spacer = document.createElement('div');
        spacer.className = 'element-cell spacer';
        container.appendChild(spacer);
      } else {
        const el = grid[acRow] && grid[acRow][col];
        if (el) {
          container.appendChild(createCell(el));
        } else {
          const spacer = document.createElement('div');
          spacer.className = 'element-cell spacer';
          container.appendChild(spacer);
        }
      }
    }
  }

  function createCell(el) {
    const cell = document.createElement('div');
    const catClass = 'cat-' + el.cat.replace(/\s+/g, '-');
    cell.className = `element-cell ${catClass}`;
    cell.dataset.number = el.n;
    cell.innerHTML = `
      <span class="cell-number">${el.n}</span>
      <span class="cell-symbol">${el.sym}</span>
      <span class="cell-name">${el.name}</span>
    `;
    cell.title = `${el.n}. ${el.name} (${el.en})`;
    cell.addEventListener('click', () => {
      if (selectedCell) selectedCell.classList.remove('selected');
      cell.classList.add('selected');
      selectedCell = cell;
      if (onSelect) onSelect(el);
    });
    return cell;
  }

  function buildLegend() {
    legendContainer.innerHTML = '';
    for (const [key, cat] of Object.entries(CATEGORIES)) {
      const item = document.createElement('div');
      item.className = 'legend-item';
      item.innerHTML = `<span class="legend-dot" style="background:${cat.color}"></span>${cat.name}`;
      legendContainer.appendChild(item);
    }
  }

  return { init };
})();
