/**
 * 简历H5交互脚本
 * @author ld
 * @copyright 2026
 */

document.addEventListener('DOMContentLoaded', function() {
	const modal = document.getElementById('mediaModal');
	const modalImg = document.getElementById('modalImg');
	const modalVideo = document.getElementById('modalVideo');
	const modalClose = document.querySelector('.media-modal-close');
	const modalPrev = document.getElementById('modalPrev');
	const modalNext = document.getElementById('modalNext');
	const modalCounter = document.getElementById('modalCounter');

	// 当前媒体列表和索引
	let currentMediaList = [];
	let currentIndex = 0;

	/**
	 * 打开弹窗显示媒体
	 * @param string type 媒体类型 img/video
	 * @param string src 媒体路径
	 * @param Array mediaList 同项目媒体列表
	 * @param number index 当前索引
	 */
	function openModal(type, src, mediaList, index) {
		currentMediaList = mediaList || [{type: type, src: src}];
		currentIndex = index || 0;

		renderMedia();

		modal.classList.add('active');
		document.body.style.overflow = 'hidden';
	}

	/**
	 * 渲染当前索引的媒体
	 */
	function renderMedia() {
		const item = currentMediaList[currentIndex];
		if (!item) return;

		modalImg.classList.remove('active');
		modalVideo.classList.remove('active');
		modalVideo.pause();

		if (item.type === 'img') {
			modalImg.src = item.src;
			modalImg.classList.add('active');
		} else if (item.type === 'video') {
			modalVideo.src = item.src;
			modalVideo.classList.add('active');
			modalVideo.load();
			modalVideo.play().catch(function() {});
		}

		// 更新计数器
		modalCounter.textContent = (currentIndex + 1) + ' / ' + currentMediaList.length;

		// 控制按钮显示
		modalPrev.style.display = currentMediaList.length > 1 ? 'flex' : 'none';
		modalNext.style.display = currentMediaList.length > 1 ? 'flex' : 'none';
	}

	/**
	 * 切换到下一张
	 */
	function nextMedia() {
		if (currentMediaList.length <= 1) return;
		currentIndex = (currentIndex + 1) % currentMediaList.length;
		renderMedia();
	}

	/**
	 * 切换到上一张
	 */
	function prevMedia() {
		if (currentMediaList.length <= 1) return;
		currentIndex = (currentIndex - 1 + currentMediaList.length) % currentMediaList.length;
		renderMedia();
	}

	/**
	 * 关闭弹窗
	 */
	function closeModal() {
		modal.classList.remove('active');
		modalImg.src = '';
		modalVideo.src = '';
		modalVideo.pause();
		currentMediaList = [];
		currentIndex = 0;
		document.body.style.overflow = '';
	}

	// 占位图点击事件
	const placeholders = document.querySelectorAll('.media-placeholder');
	placeholders.forEach(function(ph) {
		ph.addEventListener('click', function() {
			const type = ph.getAttribute('data-type');
			const src = ph.getAttribute('data-src');

			if (src && src.trim() !== '') {
				// 获取同项目卡片内的所有媒体
				const card = ph.closest('.project-card');
				const cardPlaceholders = card ? card.querySelectorAll('.media-placeholder[data-src]:not([data-src=""])') : [ph];
				const mediaList = [];
				let index = 0;

				cardPlaceholders.forEach(function(item, i) {
					mediaList.push({
						type: item.getAttribute('data-type'),
						src: item.getAttribute('data-src')
					});
					if (item === ph) {
						index = i;
					}
				});

				openModal(type, src, mediaList, index);
			} else {
				// 无媒体时提示
				modalImg.classList.remove('active');
				modalVideo.classList.remove('active');
				modalPrev.style.display = 'none';
				modalNext.style.display = 'none';
				modalCounter.textContent = '';
				modal.classList.add('active');
				document.body.style.overflow = 'hidden';
			}
		});
	});

	// 关闭弹窗
	modalClose.addEventListener('click', closeModal);
	modal.addEventListener('click', function(e) {
		if (e.target === modal) {
			closeModal();
		}
	});

	// 左右切换按钮
	modalPrev.addEventListener('click', function(e) {
		e.stopPropagation();
		prevMedia();
	});
	modalNext.addEventListener('click', function(e) {
		e.stopPropagation();
		nextMedia();
	});

	// 键盘左右箭头切换
	document.addEventListener('keydown', function(e) {
		if (!modal.classList.contains('active')) return;
		if (e.key === 'ArrowLeft') {
			prevMedia();
		} else if (e.key === 'ArrowRight') {
			nextMedia();
		} else if (e.key === 'Escape') {
			closeModal();
		}
	});

	// 项目卡片滚动淡入
	const observer = new IntersectionObserver(function(entries) {
		entries.forEach(function(entry) {
			if (entry.isIntersecting) {
				entry.target.style.opacity = '1';
				entry.target.style.transform = 'translateY(0)';
			}
		});
	}, { threshold: 0.1 });

	const projectCards = document.querySelectorAll('.project-card');
	projectCards.forEach(function(card) {
		card.style.opacity = '0';
		card.style.transform = 'translateY(16px)';
		card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
		observer.observe(card);
	});

	// 技能标签点击效果
	const skillItems = document.querySelectorAll('.skill-item');
	skillItems.forEach(function(item) {
		item.addEventListener('click', function() {
			item.style.transform = 'scale(0.92)';
			setTimeout(function() {
				item.style.transform = 'scale(1)';
			}, 150);
		});
	});
});
