document.addEventListener('DOMContentLoaded', () => {
    function fixIOSViewport() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
    
    window.addEventListener('resize', fixIOSViewport);
    fixIOSViewport();

    document.addEventListener('gesturestart', function(e) {
        e.preventDefault();
    });

    initializeLocalStorage();
    const products = getProductsFromStorage();
    
    const container = document.getElementById('collections-container');
    for (const [key, data] of Object.entries(products)) {
        container.appendChild(createCollection(key, data));
    }
    
    initializeCardSliders();
    initializeMobileMenu();
    
    document.querySelectorAll('.product-card__buy').forEach(button => {
        button.addEventListener('click', function() {
            const productCard = this.closest('.product-card');
            const productId = productCard.dataset.productId;
            addToCart(productId);
        });
    });

    document.querySelectorAll('.collection__grid').forEach(slider => {
        slider.addEventListener('touchmove', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });
    });
});

function initializeMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const menu = document.querySelector('.nav__menu');
    
    if (menuBtn && menu) {
        menuBtn.addEventListener('click', () => {
            menu.classList.toggle('active');
            menuBtn.classList.toggle('active');
        });

        // Закрываем меню при клике вне его
        document.addEventListener('click', (e) => {
            if (!menu.contains(e.target) && !menuBtn.contains(e.target)) {
                menu.classList.remove('active');
                menuBtn.classList.remove('active');
            }
        });
    }
}

function initializeCardSliders() {
    const cards = document.querySelectorAll('.product-card');
    
    cards.forEach(card => {
        const images = card.querySelectorAll('.product-card__img');
        const dots = card.querySelectorAll('.dot');
        let currentIndex = 0;
        
        // Обработчики для точек
        dots.forEach((dot, index) => {
            dot.addEventListener('click', (e) => {
                e.preventDefault();
                switchImage(index);
            });
        });
        
        function switchImage(newIndex) {
            if (newIndex === currentIndex) return;
            
            images[currentIndex].classList.remove('active');
            dots[currentIndex].classList.remove('active');
            images[newIndex].classList.add('active');
            dots[newIndex].classList.add('active');
            
            currentIndex = newIndex;
        }
        
        // Инициализация первого изображения
        switchImage(0);
        
        // Добавляем свайп для переключения изображений
        let touchStartX = 0;
        let touchEndX = 0;
        
        card.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
        }, { passive: true });
        
        card.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].clientX;
            handleSwipe();
        }, { passive: true });
        
        function handleSwipe() {
            const swipeThreshold = 50;
            const diff = touchEndX - touchStartX;
            
            if (Math.abs(diff) > swipeThreshold) {
                if (diff > 0 && currentIndex > 0) {
                    switchImage(currentIndex - 1);
                } else if (diff < 0 && currentIndex < images.length - 1) {
                    switchImage(currentIndex + 1);
                }
            }
        }
    });
}

function initializeLocalStorage() {
    if (!localStorage.getItem('products')) {
        localStorage.setItem('products', JSON.stringify(productsData));
    }
}

function getProductsFromStorage() {
    return JSON.parse(localStorage.getItem('products'));
}

function updateProductsInStorage(products) {
    localStorage.setItem('products', JSON.stringify(products));
}

function createCollection(collectionKey, collectionData) {
    const template = document.getElementById('collection-template');
    const clone = template.content.cloneNode(true);
    const mainImage = clone.querySelector('.collection-main-image');
    mainImage.src = collectionData.image;
    mainImage.alt = collectionData.title + " Collection";
    
    const titles = clone.querySelectorAll('.collection-title');
    titles.forEach(title => title.textContent = collectionData.title);
    
    const description = clone.querySelector('.collection-description');
    description.textContent = collectionData.description;
    
    const specsList = clone.querySelector('.specs-list');
    collectionData.specs.forEach(spec => {
        const span = document.createElement('span');
        span.className = 'spec';
        span.textContent = spec;
        specsList.appendChild(span);
    });
    
    // Добавляем карточки товаров
    const grid = clone.querySelector('.collection__grid');
    collectionData.products.forEach(product => {
        grid.appendChild(createProductCard(product));
    });
    
    return clone;
}

// Функция для создания карточки товара
function createProductCard(productData) {
    const template = document.getElementById('product-card-template');
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.product-card');
    card.dataset.productId = productData.id;

    if (productData.isNew || productData.isSale) {
        const stickers = card.querySelector('.product-card__stickers');
        if (productData.isSale) {
            const saleSticker = document.createElement('div');
            saleSticker.className = 'product-card__sticker product-card__sticker--sale';
            saleSticker.textContent = '%';
            stickers.appendChild(saleSticker);
        }
        if (productData.isNew) {
            const newSticker = document.createElement('div');
            newSticker.className = 'product-card__sticker product-card__sticker--new';
            newSticker.textContent = 'New';
            stickers.appendChild(newSticker);
        }
    }
    
    // Добавляем изображения
    const slider = card.querySelector('.product-card__slider');
    const dots = card.querySelector('.product-card__dots');
    
    productData.images.forEach((image, index) => {
        const img = document.createElement('img');
        img.src = image;
        img.alt = productData.title;
        img.className = 'product-card__img' + (index === 0 ? ' active' : '');
        slider.insertBefore(img, dots);
        
        const dot = document.createElement('span');
        dot.className = 'dot' + (index === 0 ? ' active' : '');
        dots.appendChild(dot);
    });
    
    card.querySelector('.product-card__title').textContent = productData.title;
    card.querySelector('.product-card__specs').textContent = productData.specs;
    
    // Формируем цену
    const priceBlock = card.querySelector('.product-card__price');
    if (productData.oldPrice) {
        priceBlock.innerHTML = `${productData.price} ₽<span class="product-card__price-old">${productData.oldPrice} ₽</span><span class="product-card__price-unit">/м²</span>`;
    } else {
        priceBlock.innerHTML = `${productData.price}<span class="product-card__price-unit">₽/м²</span>`;
    }
    
    return card;
}

// Функция для добавления товара в корзину
function addToCart(productId) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart.push(productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartButton();
}

// Обновление отображения количества товаров в корзине
function updateCartButton() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
}

// Улучшение прокрутки на мобильных устройствах
const collectionsContainer = document.getElementById('collections-container');
if (collectionsContainer) {
    let isScrolling = false;
    let startX;
    let scrollLeft;

    collectionsContainer.addEventListener('touchstart', (e) => {
        isScrolling = true;
        startX = e.touches[0].pageX - collectionsContainer.offsetLeft;
        scrollLeft = collectionsContainer.scrollLeft;
    });

    collectionsContainer.addEventListener('touchmove', (e) => {
        if (!isScrolling) return;
        e.preventDefault();
        const x = e.touches[0].pageX - collectionsContainer.offsetLeft;
        const walk = (x - startX) * 2;
        collectionsContainer.scrollLeft = scrollLeft - walk;
    });

    collectionsContainer.addEventListener('touchend', () => {
        isScrolling = false;
    });
} 