document.addEventListener('DOMContentLoaded', () => {
    initializeLocalStorage();
    const products = getProductsFromStorage();
    
    const container = document.getElementById('collections-container');
    for (const [key, data] of Object.entries(products)) {
        container.appendChild(createCollection(key, data));
    }
    
    initializeCardSliders();
    
    document.querySelectorAll('.product-card__buy').forEach(button => {
        button.addEventListener('click', function() {
            const productCard = this.closest('.product-card');
            const productId = productCard.dataset.productId;
            addToCart(productId);
        });
    });

    initializeCollectionSliders();
});

function initializeCollectionSliders() {
    const sliders = document.querySelectorAll('.collection__grid');
    
    sliders.forEach(slider => {
        let isDragging = false;
        let startPos = 0;
        let currentTranslate = 0;
        let prevTranslate = 0;
        let animationID = null;
        let lastDragPos = 0;
        let lastDragTime = 0;
        let momentum = 0;
        let isAnimating = false;
                // Добавляем стрелки для планшетов и мобильных
        if (window.innerWidth <= 1024) {
            const prevButton = document.createElement('button');
            const nextButton = document.createElement('button');
            prevButton.className = 'slider-arrow prev';
            nextButton.className = 'slider-arrow next';
            
            slider.parentElement.appendChild(prevButton);
            slider.parentElement.appendChild(nextButton);
            
            prevButton.addEventListener('click', () => moveSlider(445));
            nextButton.addEventListener('click', () => moveSlider(-445));
        }
        
        function getVisibleCards() {
            const containerWidth = slider.parentElement.offsetWidth;
            return Math.floor(containerWidth / 445);
        }
        
        function getMaxScroll() {
            const cardWidth = 445;
            const visibleCards = getVisibleCards();
            const totalCards = slider.children.length;
            return -Math.max(0, (totalCards - visibleCards) * cardWidth);
        }
        
        function moveSlider(distance) {
            const maxScroll = getMaxScroll();
            let targetTranslate = currentTranslate + distance;
            
            if (targetTranslate > 0) targetTranslate = 0;
            if (targetTranslate < maxScroll) targetTranslate = maxScroll;
            
            smoothScroll(targetTranslate);
        }
        
        slider.addEventListener('touchstart', touchStart(e => e.touches[0].clientX));
        slider.addEventListener('touchend', touchEnd);
        slider.addEventListener('touchmove', touchMove(e => e.touches[0].clientX));
        
        slider.addEventListener('mousedown', touchStart(e => e.clientX));
        slider.addEventListener('mouseup', touchEnd);
        slider.addEventListener('mouseleave', touchEnd);
        slider.addEventListener('mousemove', touchMove(e => e.clientX));
        
        function touchStart(getPositionX) {
            return function(event) {
                event.preventDefault();
                
                if (isAnimating) {
                    cancelAnimationFrame(animationID);
                    isAnimating = false;
                }
                
                isDragging = true;
                slider.classList.remove('smooth');
                slider.classList.add('dragging');
                startPos = getPositionX(event);
                lastDragPos = startPos;
                lastDragTime = Date.now();
                momentum = 0;
                
                animationID = requestAnimationFrame(animation);
            }
        }
        
        function touchMove(getPositionX) {
            return function(event) {
                if (!isDragging) return;
                
                const currentPosition = getPositionX(event);
                const currentTime = Date.now();
                const timeElapsed = currentTime - lastDragTime;
                
                if (timeElapsed > 0) {
                    momentum = (currentPosition - lastDragPos) / timeElapsed * 16;
                }
                
                lastDragPos = currentPosition;
                lastDragTime = currentTime;
                
                const currentX = currentPosition;
                const walk = (currentX - startPos);
                currentTranslate = prevTranslate + walk;
                
                setTranslate(currentTranslate);
            }
        }
        
        function touchEnd() {
            isDragging = false;
            slider.classList.remove('dragging');
            cancelAnimationFrame(animationID);
            
            const maxScroll = getMaxScroll();
            
            if (currentTranslate > 0) {
                smoothScroll(0);
            } else if (currentTranslate < maxScroll) {
                smoothScroll(maxScroll);
            } else if (Math.abs(momentum) > 2) {
                const direction = momentum < 0 ? -1 : 1;
                const velocity = Math.min(Math.abs(momentum), 6);
                inertialScroll(direction * velocity);
            } else {
                snapToGrid();
            }
        }
        
        function inertialScroll(velocity) {
            const deceleration = 0.9;
            let currentVelocity = velocity;
            
            function animate() {
                if (Math.abs(currentVelocity) < 0.1) {
                    snapToGrid();
                    return;
                }
                
                currentVelocity *= deceleration;
                currentTranslate += currentVelocity;
                
                const maxScroll = getMaxScroll();
                if (currentTranslate > 0) {
                    smoothScroll(0);
                    return;
                }
                if (currentTranslate < maxScroll) {
                    smoothScroll(maxScroll);
                    return;
                }
                
                setTranslate(currentTranslate);
                prevTranslate = currentTranslate;
                
                animationID = requestAnimationFrame(animate);
            }
            
            animate();
        }
        
        function snapToGrid() {
            const cardWidth = 445;
            const maxScroll = getMaxScroll();
            
            if (currentTranslate > 0) {
                smoothScroll(0);
            } else if (currentTranslate < maxScroll) {
                smoothScroll(maxScroll);
            } else {
                const targetIndex = Math.round(Math.abs(currentTranslate) / cardWidth);
                const maxIndex = slider.children.length - getVisibleCards();
                const boundedIndex = Math.max(0, Math.min(targetIndex, maxIndex));
                smoothScroll(-boundedIndex * cardWidth);
            }
        }
        
        function smoothScroll(targetTranslate) {
            const startTranslate = currentTranslate;
            const startTime = Date.now();
            const duration = 800;
            
            function animate() {
                const currentTime = Date.now();
                const elapsed = currentTime - startTime;
                const progress = Math.min(1, elapsed / duration);
                const easeProgress = progress < .5 ? 
                    4 * progress * progress * progress :
                    1 - Math.pow(-2 * progress + 2, 3) / 2;
                
                const newTranslate = startTranslate + (targetTranslate - startTranslate) * easeProgress;
                setTranslate(newTranslate);
                
                if (progress < 1) {
                    animationID = requestAnimationFrame(animate);
                    isAnimating = true;
                } else {
                    isAnimating = false;
                    const maxScroll = getMaxScroll();
                    if (currentTranslate < maxScroll) {
                        smoothScroll(maxScroll);
                    } else if (currentTranslate > 0) {
                        smoothScroll(0);
                    }
                }
            }
            
            slider.classList.add('smooth');
            animate();
        }
        
        function setTranslate(translate) {
            currentTranslate = translate;
            prevTranslate = translate;
            slider.style.transform = `translate3d(${translate}px, 0, 0)`;
        }
        
        function animation() {
            if (isDragging) {
                requestAnimationFrame(animation);
            }
        }
        
        window.oncontextmenu = function(event) {
            if (event.target.closest('.collection__grid')) {
                event.preventDefault();
                event.stopPropagation();
                return false;
            }
        }
        
        window.addEventListener('resize', () => {
            const maxScroll = getMaxScroll();
            if (currentTranslate < maxScroll) {
                slider.classList.add('smooth');
                setTranslate(maxScroll);
            }
        });
        
        setTranslate(0);
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