document.addEventListener('DOMContentLoaded', () => {
    // Фикс для iOS Safari для корректной работы 100vh
    function fixIOSViewport() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
    
    window.addEventListener('resize', fixIOSViewport);
    fixIOSViewport();

    // Отключаем zoom на iOS
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

    initializeCollectionSliders();
});

function initializeMobileMenu() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const menu = document.querySelector('.nav__menu');
    
    if (menuBtn && menu) {
        menuBtn.addEventListener('click', () => {
            menu.classList.toggle('active');
            menuBtn.classList.toggle('active');
            document.body.classList.toggle('menu-open');
        });

        // Закрываем меню при клике вне его
        document.addEventListener('click', (e) => {
            if (!menu.contains(e.target) && !menuBtn.contains(e.target)) {
                menu.classList.remove('active');
                menuBtn.classList.remove('active');
                document.body.classList.remove('menu-open');
            }
        });

        // Закрываем меню при скролле
        document.addEventListener('scroll', () => {
            if (menu.classList.contains('active')) {
                menu.classList.remove('active');
                menuBtn.classList.remove('active');
                document.body.classList.remove('menu-open');
            }
        }, { passive: true });
    }
}

function initializeCollectionSliders() {
    const sliders = document.querySelectorAll('.collection__grid');
    
    sliders.forEach(slider => {
        let startX;
        let scrollLeft;
        let isDown = false;
        let momentumID;
        let velocity = 0;
        let lastScrollLeft = 0;
        let lastTime = 0;
        let startY;
        let isScrollingHorizontally = false;
        
        function handleDragStart(e) {
            if (e.type === 'touchstart' && e.touches.length > 1) return;
            
            isDown = true;
            slider.classList.add('dragging');
            startX = e.type === 'mousedown' ? e.pageX : e.touches[0].pageX;
            startY = e.type === 'mousedown' ? e.pageY : e.touches[0].pageY;
            scrollLeft = slider.scrollLeft;
            isScrollingHorizontally = false;
            cancelMomentumTracking();
        }
        
        function handleDragMove(e) {
            if (!isDown) return;
            if (e.type === 'touchmove' && e.touches.length > 1) return;
            
            const x = e.type === 'mousemove' ? e.pageX : e.touches[0].pageX;
            const y = e.type === 'mousemove' ? e.pageY : e.touches[0].pageY;
            
            const deltaX = Math.abs(x - startX);
            const deltaY = Math.abs(y - startY);
            
            // Определяем направление прокрутки только при значительном движении
            if (!isScrollingHorizontally && (deltaX > 5 || deltaY > 5)) {
                isScrollingHorizontally = deltaX > deltaY;
                if (!isScrollingHorizontally) {
                    isDown = false;
                    slider.classList.remove('dragging');
                    return;
                }
            }
            
            // Если движение горизонтальное, предотвращаем вертикальную прокрутку
            if (isScrollingHorizontally) {
                e.preventDefault();
                const walk = (startX - x) * 1.5;
                const newScrollLeft = scrollLeft + walk;
                
                const now = Date.now();
                const dt = now - lastTime;
                if (dt > 0) {
                    velocity = (newScrollLeft - lastScrollLeft) / dt;
                }
                
                lastScrollLeft = newScrollLeft;
                lastTime = now;
                
                slider.scrollLeft = newScrollLeft;
            }
        }
        
        function handleDragEnd(e) {
            if (!isDown) return;
            isDown = false;
            slider.classList.remove('dragging');
            
            if (isScrollingHorizontally && Math.abs(velocity) > 0.5) {
                beginMomentumTracking();
            }
            isScrollingHorizontally = false;
        }
        
        function cancelMomentumTracking() {
            cancelAnimationFrame(momentumID);
        }
        
        function beginMomentumTracking() {
            const amplitude = velocity * 800;
            const step = () => {
                velocity *= 0.95;
                
                if (Math.abs(velocity) < 0.05) {
                    cancelMomentumTracking();
                    return;
                }
                
                slider.scrollLeft += velocity * 16;
                momentumID = requestAnimationFrame(step);
            };
            
            momentumID = requestAnimationFrame(step);
        }
        
        // Мобильные события
        slider.addEventListener('touchstart', handleDragStart, { passive: true });
        slider.addEventListener('touchend', handleDragEnd, { passive: true });
        slider.addEventListener('touchmove', handleDragMove, { passive: false });
        
        // Десктопные события
        slider.addEventListener('mousedown', handleDragStart);
        slider.addEventListener('mousemove', handleDragMove);
        slider.addEventListener('mouseup', handleDragEnd);
        slider.addEventListener('mouseleave', handleDragEnd);
        
        // Оптимизация для iOS
        slider.style.webkitOverflowScrolling = 'touch';
    });
}

function initializeCardSliders() {
    const cards = document.querySelectorAll('.product-card');
    
    cards.forEach(card => {
        const images = card.querySelectorAll('.product-card__img');
        const dots = card.querySelectorAll('.dot');
        const info = card.querySelector('.product-card__info');
        let currentIndex = 0;
        
        let isDragging = false;
        let startX = 0;
        let startScrollLeft = 0;
        let timeoutId = null;
        
        // Обработчики для перетаскивания
        info.addEventListener('mousedown', dragStart);
        info.addEventListener('touchstart', dragStart);
        info.addEventListener('mousemove', dragging);
        info.addEventListener('touchmove', dragging);
        info.addEventListener('mouseup', dragEnd);
        info.addEventListener('mouseleave', dragEnd);
        info.addEventListener('touchend', dragEnd);
        
        // Обработчики для точек
        dots.forEach((dot, index) => {
            dot.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                switchImage(index);
            });
        });
        
        function dragStart(e) {
            isDragging = true;
            info.classList.add('dragging');
            startX = e.type === 'mousedown' ? e.pageX : e.touches[0].pageX;
            
            if (timeoutId !== null) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
        }
        
        function dragging(e) {
            if (!isDragging) return;
            
            e.preventDefault();
            const currentX = e.type === 'mousemove' ? e.pageX : e.touches[0].pageX;
            const diff = currentX - startX;
            
            if (Math.abs(diff) > 50) {
                if (diff > 0 && currentIndex > 0) {
                    switchImage(currentIndex - 1);
                    isDragging = false;
                    info.classList.remove('dragging');
                } else if (diff < 0 && currentIndex < images.length - 1) {
                    switchImage(currentIndex + 1);
                    isDragging = false;
                    info.classList.remove('dragging');
                }
                startX = currentX;
            }
        }
        
        function dragEnd() {
            isDragging = false;
            info.classList.remove('dragging');
            
            timeoutId = setTimeout(() => {
                info.style.cursor = 'grab';
            }, 100);
        }
        
        function switchImage(newIndex) {
            if (newIndex === currentIndex) return;
            
            images[currentIndex].classList.remove('active');
            dots[currentIndex].classList.remove('active');
            images[newIndex].classList.add('active');
            dots[newIndex].classList.add('active');
            
            currentIndex = newIndex;
        }
        
        switchImage(0);
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