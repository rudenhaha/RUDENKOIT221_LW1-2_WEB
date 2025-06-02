document.addEventListener('DOMContentLoaded', () => {
    // Предотвращаем нежелательные действия браузера по умолчанию
    document.addEventListener('touchmove', function(e) {
        if (e.target.closest('.collection__grid')) {
            e.preventDefault();
        }
    }, { passive: false });

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
    initializeCollectionSliders();
    
    document.querySelectorAll('.product-card__buy').forEach(button => {
        button.addEventListener('click', function() {
            const productCard = this.closest('.product-card');
            const productId = productCard.dataset.productId;
            addToCart(productId);
        });
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

        document.addEventListener('click', (e) => {
            if (!menu.contains(e.target) && !menuBtn.contains(e.target)) {
                menu.classList.remove('active');
                menuBtn.classList.remove('active');
            }
        });
    }
}

function initializeCardSliders() {
    document.querySelectorAll('.product-card').forEach(card => {
        const images = card.querySelectorAll('.product-card__img');
        const dots = card.querySelectorAll('.dot');
        let currentIndex = 0;
        
        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => switchImage(index));
        });
        
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

function createCollection(collectionKey, collectionData) {
    const template = document.getElementById('collection-template');
    const clone = template.content.cloneNode(true);
    
    const mainImage = clone.querySelector('.collection-main-image');
    mainImage.src = collectionData.image;
    mainImage.alt = collectionData.title + " Collection";
    
    clone.querySelectorAll('.collection-title')
        .forEach(title => title.textContent = collectionData.title);
    
    clone.querySelector('.collection-description')
        .textContent = collectionData.description;
    
    const specsList = clone.querySelector('.specs-list');
    collectionData.specs.forEach(spec => {
        const span = document.createElement('span');
        span.className = 'spec';
        span.textContent = spec;
        specsList.appendChild(span);
    });
    
    const grid = clone.querySelector('.collection__grid');
    collectionData.products.forEach(product => {
        grid.appendChild(createProductCard(product));
    });
    
    return clone;
}

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
    
    const priceBlock = card.querySelector('.product-card__price');
    if (productData.oldPrice) {
        priceBlock.innerHTML = `${productData.price} ₽<span class="product-card__price-old">${productData.oldPrice} ₽</span><span class="product-card__price-unit">/м²</span>`;
    } else {
        priceBlock.innerHTML = `${productData.price}<span class="product-card__price-unit">₽/м²</span>`;
    }
    
    return card;
}

function addToCart(productId) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    cart.push(productId);
    localStorage.setItem('cart', JSON.stringify(cart));
}

function initializeCollectionSliders() {
    const sliders = document.querySelectorAll('.collection__grid');
    
    sliders.forEach(slider => {
        let isDragging = false;
        let startX = 0;
        let scrollLeft = 0;
        let lastX = 0;
        let momentum = 0;
        let animationId = null;
        
        function handleStart(e) {
            isDragging = true;
            startX = e.type === 'mousedown' ? e.pageX : e.touches[0].pageX;
            scrollLeft = slider.scrollLeft;
            lastX = startX;
            
            cancelAnimationFrame(animationId);
            slider.style.scrollBehavior = 'auto';
        }
        
        function handleMove(e) {
            if (!isDragging) return;
            
            e.preventDefault();
            const x = e.type === 'mousemove' ? e.pageX : e.touches[0].pageX;
            const walk = x - startX;
            
            momentum = x - lastX;
            lastX = x;
            
            slider.scrollLeft = scrollLeft - walk;
        }
        
        function handleEnd() {
            if (!isDragging) return;
            isDragging = false;
            
            const cardWidth = slider.children[0].offsetWidth;
            const currentScroll = slider.scrollLeft;
            const targetIndex = Math.round(currentScroll / cardWidth);
            
            slider.style.scrollBehavior = 'smooth';
            slider.scrollLeft = targetIndex * cardWidth;
        }
        
        // Touch events
        slider.addEventListener('touchstart', handleStart, { passive: true });
        slider.addEventListener('touchmove', handleMove, { passive: false });
        slider.addEventListener('touchend', handleEnd);
        
        // Mouse events
        slider.addEventListener('mousedown', handleStart);
        slider.addEventListener('mousemove', handleMove);
        slider.addEventListener('mouseup', handleEnd);
        slider.addEventListener('mouseleave', handleEnd);
        
        // Prevent click during drag
        slider.addEventListener('click', (e) => {
            if (momentum !== 0) {
                e.preventDefault();
                e.stopPropagation();
            }
        });
    });
} 