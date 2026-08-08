(function () {
    const modal = document.querySelector('[data-category-modal]');
    const form = document.querySelector('[data-category-form]');
    // Carrega o toggle responsável por iniciar uma nova categoria
    const openButton = document.querySelector('.modal-toggle[data-modal-target="#category-modal"]');
    const editButtons = document.querySelectorAll('[data-edit-category]');
    const picker = document.querySelector('[data-icon-picker]');
    const pickerToggle = document.querySelector('[data-toggle-icon-picker]');
    const grid = document.querySelector('[data-icon-grid]');
    const search = document.querySelector('[data-icon-search]');
    const idInput = document.querySelector('[data-category-id-input]');
    const nameInput = document.querySelector('[data-category-name-input]');
    const colorInput = document.querySelector('[data-category-color-input]');
    const iconInput = document.querySelector('[data-category-icon-input]');
    const selectedIconPreview = document.querySelector('[data-selected-icon-preview]');
    const selectedIconLabel = document.querySelector('[data-selected-icon-label]');
    const modalTitle = document.querySelector('[data-category-modal-title]');
    const iconsUrl = modal ? modal.dataset.iconsUrl : '';
    let icons = [];

    // Carrega a cor padrÃ£o de categoria definida pelo tema atual
    function getDefaultCategoryColor() {
        return getComputedStyle(document.body || document.documentElement).getPropertyValue('--category-default').trim();
    }

    // Carrega o controlador compartilhado do modal
    const categoryModal = window.CicloModal ? window.CicloModal.get(modal) : null;

    if (!categoryModal || !form || !openButton || !picker || !pickerToggle || !grid || !search || !idInput || !nameInput || !colorInput || !iconInput || !selectedIconPreview || !selectedIconLabel || !modalTitle || !iconsUrl) {
        return;
    }

    openButton.addEventListener('click', function () {
        resetForm();
    });

    editButtons.forEach(function (button) {
        button.addEventListener('click', function () {
            fillForm({
                id: button.dataset.categoryId || '',
                name: button.dataset.categoryName || '',
                color: button.dataset.categoryColor || getDefaultCategoryColor(),
                icon: button.dataset.categoryIcon || ''
            });

            categoryModal.open();
        });
    });

    pickerToggle.addEventListener('click', function () {
        picker.classList.toggle('hidden');
        search.focus();
    });

    search.addEventListener('input', function () {
        renderIcons(search.value);
    });

    fetch(iconsUrl)
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            icons = data;
            renderIcons('');

            if (iconInput.value) {
                setSelectedIcon(iconInput.value);
            }
        });

    function resetForm() {
        form.reset();
        idInput.value = '';
        colorInput.value = getDefaultCategoryColor();
        iconInput.value = '';
        modalTitle.textContent = window.CicloTranslate('manage.categories.new', 'nova categoria');
        selectedIconPreview.innerHTML = '<i class="fa-solid fa-icons"></i>';
        selectedIconLabel.textContent = window.CicloTranslate('manage.categories.choose_icon', 'escolha um icone');
        picker.classList.add('hidden');
        search.value = '';
        renderIcons('');
    }

    function fillForm(category) {
        idInput.value = category.id;
        nameInput.value = category.name;
        colorInput.value = category.color || getDefaultCategoryColor();
        modalTitle.textContent = window.CicloTranslate('manage.categories.edit', 'editar categoria');
        picker.classList.add('hidden');
        search.value = '';
        setSelectedIcon(category.icon);
        renderIcons('');
    }

    function renderIcons(filter) {
        const term = String(filter).trim().toLowerCase();
        const visibleIcons = icons.filter(function (icon) {
            return icon.label.toLowerCase().includes(term) || icon.style.toLowerCase().includes(term);
        });

        grid.innerHTML = '';

        visibleIcons.forEach(function (icon) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'flex h-12 items-center justify-center rounded border border-transparent text-lg text-primary transition hover:border-[var(--primary)] hover:bg-[var(--surface)]';
            button.title = icon.label;
            button.setAttribute('aria-label', icon.label);
            button.innerHTML = '<i class="' + icon.style + '"></i>';

            button.addEventListener('click', function () {
                setSelectedIcon(icon.style);
                picker.classList.add('hidden');
            });

            grid.appendChild(button);
        });
    }

    function setSelectedIcon(iconStyle) {
        const icon = icons.find(function (item) {
            return item.style === iconStyle;
        });

        iconInput.value = iconStyle;
        selectedIconPreview.innerHTML = iconStyle ? '<i class="' + iconStyle + '"></i>' : '<i class="fa-solid fa-icons"></i>';
        selectedIconLabel.textContent = icon ? icon.label : window.CicloTranslate('manage.categories.selected_icon', 'icone selecionado');
    }
})();
