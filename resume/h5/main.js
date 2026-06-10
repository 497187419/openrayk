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

	/**
	 * 打开弹窗显示媒体
	 * @param string type 媒体类型 img/video
	 * @param string src 媒体路径
	 */
	function openModal(type, src) {
		modalImg.classList.remove('active');
		modalVideo.classList.remove('active');
		modalVideo.pause();

		if (type === 'img') {
			modalImg.src = src;
			modalImg.classList.add('active');
		} else if (type === 'video') {
			modalVideo.src = src;
			modalVideo.classList.add('active');
		}

		modal.classList.add('active');
		document.body.style.overflow = 'hidden';
	}

	/**
	 * 关闭弹窗
	 */
	function closeModal() {
		modal.classList.remove('active');
		modalImg.src = '';
		modalVideo.src = '';
		modalVideo.pause();
		document.body.style.overflow = '';
	}

	// 占位图点击事件
	const placeholders = document.querySelectorAll('.media-placeholder');
	placeholders.forEach(function(ph) {
		ph.addEventListener('click', function() {
			const type = ph.getAttribute('data-type');
			const src = ph.getAttribute('data-src');

			if (src && src.trim() !== '') {
				openModal(type, src);
				// 视频类型在弹窗打开后延迟加载播放，确保DOM已渲染
				if (type === 'video') {
					modalVideo.load();
					modalVideo.play().catch(function() {});
				}
			} else {
				// 无媒体时提示用户如何添加
				modalImg.classList.remove('active');
				modalVideo.classList.remove('active');
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
