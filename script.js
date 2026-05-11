document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initScrollEffects();
    initForm();
    initLazyLoading();
    initPerformanceMonitoring();
    initAccessibilityEnhancements();
});

function initNavigation() {
    const navToggle = document.getElementById('nav-toggle');
    const navClose = document.getElementById('nav-close');
    const navMenu = document.getElementById('nav-menu');
    const navLinks = document.querySelectorAll('.nav__link');

    if (navToggle) {
        navToggle.addEventListener('click', () => {
            toggleMenu(true);
        });
        
        // 键盘支持：Enter和Space键触发菜单
        navToggle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleMenu(true);
            }
        });
    }

    if (navClose) {
        navClose.addEventListener('click', () => {
            toggleMenu(false);
        });
        
        // ESC键关闭菜单
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && navMenu.classList.contains('show-menu')) {
                toggleMenu(false);
                navToggle.focus();
            }
        });
    }

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            toggleMenu(false);
        });
        
        // 键盘导航增强
        link.addEventListener('keydown', (e) => {
            const linksArray = Array.from(navLinks);
            const currentIndex = linksArray.indexOf(link);
            
            if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
                e.preventDefault();
                const nextIndex = (currentIndex + 1) % linksArray.length;
                linksArray[nextIndex].focus();
            } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
                e.preventDefault();
                const prevIndex = (currentIndex - 1 + linksArray.length) % linksArray.length;
                linksArray[prevIndex].focus();
            }
        });
    });
    
    function toggleMenu(show) {
        if (show) {
            navMenu.classList.add('show-menu');
            navToggle.setAttribute('aria-expanded', 'true');
            navClose.focus();
        } else {
            navMenu.classList.remove('show-menu');
            navToggle.setAttribute('aria-expanded', 'false');
        }
    }
}

function initScrollEffects() {
    const header = document.getElementById('header');
    const scrolltop = document.getElementById('scrolltop');
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav__link');

    let ticking = false;
    
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                updateScrollState();
                ticking = false;
            });
            ticking = true;
        }
    });
    
    function updateScrollState() {
        const scrollY = window.scrollY;
        
        if (scrollY >= 50) {
            header?.classList.add('scroll-header');
        } else {
            header?.classList.remove('scroll-header');
        }

        if (scrollY >= 200) {
            scrolltop?.classList.add('show');
        } else {
            scrolltop?.classList.remove('show');
        }

        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 100;
            if (scrollY >= sectionTop) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + current) {
                link.classList.add('active');
            }
        });
    }
}

function initForm() {
    const form = document.getElementById('contact-form');
    
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // 表单验证增强
            if (!validateForm(form)) {
                return;
            }
            
            const formData = new FormData(form);
            const data = {};
            formData.forEach((value, key) => {
                data[key] = value;
            });
            
            console.log('表单提交数据:', data);
            
            // 显示提交状态
            showFormStatus(form, 'submitting');
            
            // 模拟异步提交（实际项目中替换为真实API调用）
            setTimeout(() => {
                showFormStatus(form, 'success');
                form.reset();
                
                // 3秒后隐藏成功消息
                setTimeout(() => {
                    hideFormStatus(form);
                }, 3000);
            }, 1000);
        });
        
        // 实时验证
        const inputs = form.querySelectorAll('.form__input, .form__textarea');
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                validateField(input);
            });
            
            input.addEventListener('input', () => {
                if (input.classList.contains('error')) {
                    validateField(input);
                }
            });
        });
    }
    
    function validateForm(form) {
        let isValid = true;
        const requiredFields = form.querySelectorAll('[required]');
        
        requiredFields.forEach(field => {
            if (!validateField(field)) {
                isValid = false;
            }
        });
        
        return isValid;
    }
    
    function validateField(field) {
        const value = field.value.trim();
        const type = field.type;
        let isValid = true;
        let errorMessage = '';
        
        // 移除之前的错误状态
        field.classList.remove('error');
        removeFieldError(field);
        
        // 必填字段验证
        if (field.hasAttribute('required') && !value) {
            isValid = false;
            errorMessage = '此字段为必填项';
        }
        
        // 邮箱格式验证
        if (isValid && type === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                isValid = false;
                errorMessage = '请输入有效的邮箱地址';
            }
        }
        
        // 电话格式验证（可选）
        if (isValid && type === 'tel' && value) {
            const phoneRegex = /^[\d\-\+\(\)\s]+$/;
            if (!phoneRegex.test(value)) {
                isValid = false;
                errorMessage = '请输入有效的电话号码';
            }
        }
        
        if (!isValid) {
            field.classList.add('error');
            showFieldError(field, errorMessage);
        }
        
        return isValid;
    }
    
    function showFieldError(field, message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'field-error';
        errorDiv.textContent = message;
        errorDiv.style.cssText = 'color: #dc2626; font-size: 0.875rem; margin-top: 0.25rem;';
        field.parentNode.appendChild(errorDiv);
    }
    
    function removeFieldError(field) {
        const errorDiv = field.parentNode.querySelector('.field-error');
        if (errorDiv) {
            errorDiv.remove();
        }
    }
    
    function showFormStatus(form, status) {
        let statusDiv = form.querySelector('.form-status');
        
        if (!statusDiv) {
            statusDiv = document.createElement('div');
            statusDiv.className = 'form-status';
            statusDiv.style.cssText = 'padding: 1rem; margin-bottom: 1rem; border-radius: var(--radius); text-align: center;';
            form.insertBefore(statusDiv, form.firstChild);
        }
        
        switch (status) {
            case 'submitting':
                statusDiv.style.background = '#dbeafe';
                statusDiv.style.color = '#1e40af';
                statusDiv.textContent = '正在提交...';
                break;
            case 'success':
                statusDiv.style.background = '#d1fae5';
                statusDiv.style.color = '#065f46';
                statusDiv.textContent = '✓ 感谢您的留言！我们会尽快与您联系。';
                break;
        }
    }
    
    function hideFormStatus(form) {
        const statusDiv = form.querySelector('.form-status');
        if (statusDiv) {
            statusDiv.remove();
        }
    }
}

function initLazyLoading() {
    // 原生懒加载支持检测
    if ('loading' in HTMLImageElement.prototype) {
        // 浏览器支持原生懒加载
        const images = document.querySelectorAll('img[loading="lazy"]');
        images.forEach(img => {
            img.src = img.dataset.src || img.src;
        });
    } else {
        // 回退到Intersection Observer
        if ('IntersectionObserver' in window) {
            const lazyImages = document.querySelectorAll('img[data-src]');
            
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        imageObserver.unobserve(img);
                    }
                });
            }, {
                rootMargin: '50px 0px',
                threshold: 0.01
            });
            
            lazyImages.forEach(img => {
                imageObserver.observe(img);
            });
        }
    }
    
    // 预加载关键资源（首屏内容不需要懒加载，但可以预加载其他资源）
    preloadCriticalResources();
}

function preloadCriticalResources() {
    // 预加载字体文件（如果有的话）
    const fonts = [
        // 可以添加需要预加载的字体URL
    ];
    
    fonts.forEach(fontUrl => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'font';
        link.type = 'font/woff2';
        link.href = fontUrl;
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
    });
}

function initPerformanceMonitoring() {
    // Core Web Vitals 监控
    if ('PerformanceObserver' in window) {
        // LCP (Largest Contentful Paint)
        try {
            const lcpObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                const lastEntry = entries[entries.length - 1];
                console.log(`LCP: ${lastEntry.startTime.toFixed(2)}ms`);
                
                // 可以将数据发送到分析服务
                reportWebVital('LCP', lastEntry.startTime);
            });
            lcpObserver.observe({type: 'largest-contentful-paint', buffered: true});
        } catch (e) {
            console.warn('LCP monitoring not supported');
        }
        
        // FID (First Input Delay) / INP (Interaction to Next Paint)
        try {
            const fidObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach(entry => {
                    console.log(`FID/INP: ${entry.processingStart - entry.startTime.toFixed(2)}ms`);
                    reportWebVital('FID', entry.processingStart - entry.startTime);
                });
            });
            fidObserver.observe({type: 'first-input', buffered: true});
        } catch (e) {
            console.warn('FID monitoring not supported');
        }
        
        // CLS (Cumulative Layout Shift)
        try {
            let clsValue = 0;
            const clsObserver = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (!entry.hadRecentInput) {
                        clsValue += entry.value;
                    }
                }
                console.log(`CLS: ${clsValue.toFixed(4)}`);
                reportWebVital('CLS', clsValue);
            });
            clsObserver.observe({type: 'layout-shift', buffered: true});
        } catch (e) {
            console.warn('CLS monitoring not supported');
        }
    }
    
    // 页面加载完成事件
    window.addEventListener('load', () => {
        // 记录页面加载时间
        const pageLoadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        console.log(`页面总加载时间: ${pageLoadTime}ms`);
        
        // DOMContentLoaded时间
        const domContentLoaded = performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart;
        console.log(`DOM解析完成时间: ${domContentLoaded}ms`);
    });
    
    function reportWebVital(name, value) {
        // 这里可以将数据发送到分析服务，如Google Analytics、百度统计等
        // 示例：使用navigator.sendBeacon或fetch API
        
        const vitalData = {
            name: name,
            value: value,
            url: window.location.href,
            timestamp: Date.now(),
            userAgent: navigator.userAgent
        };
        
        console.log('Web Vital:', vitalData);
        
        // 取消注释以下代码以发送数据到服务器
        /*
        if ('sendBeacon' in navigator) {
            navigator.sendBeacon('/api/web-vitals', JSON.stringify(vitalData));
        }
        */
    }
}

function initAccessibilityEnhancements() {
    // 跳转到主内容链接
    addSkipLink();
    
    // 焦点管理增强
    enhanceFocusManagement();
    
    // ARIA实时区域更新
    setupLiveRegions();
    
    function addSkipLink() {
        const skipLink = document.createElement('a');
        skipLink.href = '#main';
        skipLink.className = 'skip-link';
        skipLink.textContent = '跳转到主内容';
        document.body.insertBefore(skipLink, document.body.firstChild);
    }
    
    function enhanceFocusManagement() {
        // 为所有可交互元素添加更好的焦点样式
        const interactiveElements = document.querySelectorAll(
            'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])'
        );
        
        interactiveElements.forEach(el => {
            el.addEventListener('focus', () => {
                el.dataset.focused = 'true';
            });
            
            el.addEventListener('blur', () => {
                delete el.dataset.focused;
            });
        });
    }
    
    function setupLiveRegions() {
        // 创建用于屏幕阅读器的实时区域
        const liveRegion = document.createElement('div');
        liveRegion.setAttribute('role', 'status');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'sr-only';
        liveRegion.style.cssText = `
            position: absolute;
            width: 1px;
            height: 1px;
            padding: 0;
            margin: -1px;
            overflow: hidden;
            clip: rect(0, 0, 0, 0);
            white-space: nowrap;
            border: 0;
        `;
        document.body.appendChild(liveRegion);
        
        // 暴露全局函数供其他地方调用
        window.announceToScreenReader = (message) => {
            liveRegion.textContent = '';
            setTimeout(() => {
                liveRegion.textContent = message;
            }, 100);
        };
    }
}

// SEO工具函数
const SEOUtils = {
    // 平滑滚动到指定元素
    smoothScrollTo: function(targetId) {
        const target = document.getElementById(targetId);
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            
            // 更新URL（不触发页面刷新）
            history.pushState(null, null, `#${targetId}`);
        }
    },
    
    // 更新页面标题（SPA应用中常用）
    updatePageTitle: function(title) {
        document.title = `${title} | OpenRayk 欧朋雷克科技`;
    },
    
    // 追踪用户行为（用于分析）
    trackEvent: function(category, action, label) {
        console.log(`Track Event: ${category} / ${action} / ${label}`);
        
        // Google Analytics 示例
        /*
        if (typeof gtag !== 'undefined') {
            gtag('event', action, {
                'event_category': category,
                'event_label': label
            });
        }
        */
        
        // 百度统计示例
        /*
        if (typeof _hmt !== 'undefined') {
            _hmt.push(['_trackEvent', category, action, label]);
        }
        */
    },
    
    // 检测设备类型
    getDeviceType: function() {
        const ua = navigator.userAgent;
        if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
            return 'tablet';
        }
        if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) {
            return 'mobile';
        }
        return 'desktop';
    },
    
    // 检测网络连接速度
    getConnectionSpeed: function() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (connection) {
            return connection.effectiveType || 'unknown';
        }
        return 'unknown';
    }
};

// 导出工具函数供全局使用
window.SEOUtils = SEOUtils;

// 错误监控
window.onerror = function(message, source, lineno, colno, error) {
    console.error('JavaScript Error:', {
        message: message,
        source: source,
        line: lineno,
        column: colno,
        error: error
    });
    
    // 可以将错误信息发送到错误监控服务
    /*
    fetch('/api/log-error', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            message: message,
            source: source,
            line: lineno,
            column: colno,
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: Date.now()
        })
    });
    */
    
    return false;
};

// Promise未捕获的拒绝处理
window.onunhandledrejection = function(event) {
    console.error('Unhandled Promise Rejection:', event.reason);
    
    // 可以将错误信息发送到错误监控服务
};
