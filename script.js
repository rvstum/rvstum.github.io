const FILTER_ORDER = [
  "Overworld", "Snow", "Cavern", "Big City",
  "0", "1", "2", "3", "4", "5", "6", "7", "8", "9",
  "Tree", "Red Tree", "Trunk", "Grass", "Bush", "Flower", "Water", "Dirt",
  "Sign", "Stone", "Building", "Doorway", "Path", "Boundary", "Fence",
  "Hedge", "Boulder", "Rail", "Mushroom", "Void", "Baddy", "NPC", "Bug", "Other"
];

document.addEventListener('DOMContentLoaded', () => {
  const filterContainer = document.getElementById('filters');
  const galleryContainer = document.getElementById('gallery');

  if (!filterContainer || !galleryContainer) return;

  fetch('maps.csv')
    .then(response => response.text())
    .then(csvText => {
      const maps = parseCSV(csvText);
      createFilters(maps);
      renderGallery(maps);
    });

  function parseCSV(text) {
    // Remove BOM if present to prevent issues with the first line
    if (text.charCodeAt(0) === 0xFEFF) {
      text = text.slice(1);
    }
    const lines = text.trim().split('\n');
    // The new CSV format is ragged and has no header row.
    // Col 0: Thumbnail (map ID)
    // Col 1: Full Image (location ID)
    // Col 2: Biome (Overworld, Cavern, etc.)
    // Col 3: Tree Count (Number)
    // Col 4+: Tags
    return lines
      .filter(line => line.trim() !== '')
      .map(line => {
      const parts = line.split(',').map(p => p.trim());
      const tags = new Set();
      
      // Add Biome as a tag for filtering
      if (parts[2]) tags.add(parts[2]);
      
      // Add Tree Count as a tag
      if (parts[3]) tags.add(parts[3]);
      
      // Add remaining columns as tags
      for (let i = 4; i < parts.length; i++) {
        if (parts[i]) tags.add(parts[i]);
      }

      return {
        Thumbnail: parts[0],
        'Full Image': parts[1],
        TreeCount: parts[3],
        Tags: Array.from(tags)
      };
    });
  }

  function createFilters(maps) {
    if (maps.length === 0) return;
    
    // Collect all unique tags present in the data
    const allTags = new Set();
    maps.forEach(map => map.Tags.forEach(tag => allTags.add(tag)));

    // Filter the predefined order list to only include tags that actually exist in the data
    // This ensures we respect the requested order but don't show empty filters
    const activeFilters = FILTER_ORDER.filter(f => allTags.has(f));

    filterContainer.innerHTML = '';
    activeFilters.forEach(key => {
      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = key;
      checkbox.addEventListener('change', () => filterMaps(maps));
      
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(` ${key} `));
      filterContainer.appendChild(label);
    });
  }

  function filterMaps(maps) {
    const activeFilters = Array.from(filterContainer.querySelectorAll('input:checked')).map(cb => cb.value);
    const filtered = maps.filter(map => activeFilters.every(filter => map.Tags.includes(filter)));
    renderGallery(filtered);
  }

  function renderGallery(maps) {
    galleryContainer.innerHTML = maps.map(map => `
      <div class="map-item">
        <img src="maps/${map.Thumbnail}.png" alt="${map['Full Image']}" loading="lazy">
      </div>
    `).join('');
  }

  function setupGalleryModal() {
    const modal = document.createElement('div');
    modal.style.cssText = 'display:none;position:fixed;z-index:1000;left:0;top:0;width:100%;height:100%;overflow:auto;background-color:rgba(0,0,0,0.9);justify-content:center;align-items:center;';
    
    const modalImg = document.createElement('img');
    modalImg.style.cssText = 'margin:auto;display:block;max-width:90%;max-height:90%;min-width:300px;object-fit:contain;image-rendering:pixelated;';
    
    modal.appendChild(modalImg);
    document.body.appendChild(modal);
    
    modal.addEventListener('click', () => modal.style.display = 'none');
    
    galleryContainer.addEventListener('click', (e) => {
      if (e.target.tagName === 'IMG') {
        modal.style.display = 'flex';
        const fullImg = e.target.alt;
        modalImg.src = fullImg ? `maps/${fullImg}.png` : e.target.src;
        modalImg.onerror = () => { modalImg.src = e.target.src; };
      }
    });
  }

  setupGalleryModal();
});