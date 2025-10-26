// ==UserScript==
// @name         Volume Wheel Control for Anilibria
// @version      1.1
// @description  Скрипт для удобного управления громкостью на сайте Anilibria с помощью колесика мыши и UI-интерфейсом.
// @author       https://github.com/ilfae
// @match        https://anilibria.top/anime/video/episode/*
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    GM_addStyle(`
        .custom-volume-ui {
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            border-radius: 10px;
            padding: 15px;
            z-index: 10000;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            transition: opacity 0.3s ease, transform 0.3s ease;
            opacity: 0;
            transform: translateY(-10px);
            pointer-events: none;
        }

        .custom-volume-ui.visible {
            opacity: 1;
            transform: translateY(0);
        }

        .volume-title {
            color: white;
            font-size: 12px;
            margin-bottom: 8px;
            text-align: center;
            font-family: Arial, sans-serif;
        }

        .volume-slider-container {
            width: 120px;
            height: 6px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 3px;
            position: relative;
            cursor: pointer;
        }

        .volume-slider-fill {
            position: absolute;
            left: 0;
            top: 0;
            height: 100%;
            background: #ff4081;
            border-radius: 3px;
            transition: width 0.1s ease;
        }

        .volume-slider-thumb {
            position: absolute;
            top: 50%;
            width: 12px;
            height: 12px;
            background: white;
            border-radius: 50%;
            transform: translate(-50%, -50%);
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .volume-percentage {
            color: white;
            font-size: 11px;
            text-align: center;
            margin-top: 8px;
            font-family: Arial, sans-serif;
            font-weight: bold;
        }
    `);

    let volumeUI = null;
    let hideUITimer = null;
    let currentVolume = 0.5;
    let isDragging = false;

    function createVolumeUI() {
        if (volumeUI) return volumeUI;

        volumeUI = document.createElement('div');
        volumeUI.className = 'custom-volume-ui';
        volumeUI.innerHTML = `
            <div class="volume-title">ГРОМКОСТЬ</div>
            <div class="volume-slider-container" id="volume-track">
                <div class="volume-slider-fill" id="volume-fill"></div>
                <div class="volume-slider-thumb" id="volume-thumb"></div>
            </div>
            <div class="volume-percentage" id="volume-percent">50%</div>
        `;

        document.body.appendChild(volumeUI);

        const track = volumeUI.querySelector('#volume-track');
        track.addEventListener('mousedown', startDrag);
        track.addEventListener('touchstart', startDrag);

        return volumeUI;
    }

    function startDrag(e) {
        e.preventDefault();
        isDragging = true;
        updateVolumeFromEvent(e);

        document.addEventListener('mousemove', onDrag);
        document.addEventListener('touchmove', onDrag);
        document.addEventListener('mouseup', stopDrag);
        document.addEventListener('touchend', stopDrag);
    }

    function onDrag(e) {
        if (!isDragging) return;
        updateVolumeFromEvent(e);
        showVolumeUI();
    }

    function stopDrag() {
        isDragging = false;
        document.removeEventListener('mousemove', onDrag);
        document.removeEventListener('touchmove', onDrag);
        document.removeEventListener('mouseup', stopDrag);
        document.removeEventListener('touchend', stopDrag);
        resetHideTimer();
    }

    function updateVolumeFromEvent(e) {
        const track = volumeUI.querySelector('#volume-track');
        const rect = track.getBoundingClientRect();
        let clientX;

        if (e.type.includes('touch')) {
            clientX = e.touches[0].clientX;
        } else {
            clientX = e.clientX;
        }

        let percentage = (clientX - rect.left) / rect.width;
        percentage = Math.max(0, Math.min(1, percentage));

        setVolume(percentage);
    }

    function showVolumeUI() {
        if (!volumeUI) createVolumeUI();

        volumeUI.classList.add('visible');
        resetHideTimer();
    }

    function hideVolumeUI() {
        if (volumeUI) {
            volumeUI.classList.remove('visible');
        }
    }

    function resetHideTimer() {
        clearTimeout(hideUITimer);
        hideUITimer = setTimeout(hideVolumeUI, 1000);
    }

    function updateVolumeUI(volume) {
        if (!volumeUI) return;

        const percentage = Math.round(volume * 100);
        const fill = volumeUI.querySelector('#volume-fill');
        const thumb = volumeUI.querySelector('#volume-thumb');
        const percentText = volumeUI.querySelector('#volume-percent');

        fill.style.width = `${percentage}%`;
        thumb.style.left = `${percentage}%`;
        percentText.textContent = `${percentage}%`;
    }

    function setVolume(volume) {
        currentVolume = Math.max(0, Math.min(1, volume));

        const video = document.querySelector('video');
        if (video) {
            video.volume = currentVolume;
        }

        const siteVolumeSlider = document.querySelector('.v-input.v-slider input');
        if (siteVolumeSlider) {
            siteVolumeSlider.value = currentVolume;
            siteVolumeSlider.dispatchEvent(new Event('input', { bubbles: true }));
        }

        updateVolumeUI(currentVolume);
        showVolumeUI();
    }

    function changeVolume(delta) {
        const newVolume = currentVolume + delta;
        setVolume(newVolume);
    }

    function initialize() {
        const video = document.querySelector('video');
        if (!video) {
            setTimeout(initialize, 1000);
            return;
        }

        currentVolume = video.volume;
        createVolumeUI();
        updateVolumeUI(currentVolume);

        let lastScrollTime = 0;
        let scrollAccumulator = 0;

        function handleWheel(e) {
            const player = document.querySelector('.native-player, .plyr, .interface, video');
            if (!player || !player.contains(e.target)) return;

            e.preventDefault();
            e.stopPropagation();

            const now = Date.now();
            const timeDiff = now - lastScrollTime;

            let speedMultiplier = 1;
            if (timeDiff < 50) {
                scrollAccumulator += Math.abs(e.deltaY);
                speedMultiplier = Math.min(1 + (scrollAccumulator * 0.001), 3);
            } else {
                scrollAccumulator = 0;
            }

            lastScrollTime = now;

            const baseStep = 0.004;
            const adjustedStep = baseStep * speedMultiplier;
            const delta = e.deltaY > 0 ? -adjustedStep : adjustedStep;

            changeVolume(delta);
        }

        function handleMouseMove(e) {
            const player = document.querySelector('.native-player, .plyr, .interface, video');
            if (player && player.contains(e.target)) {
                showVolumeUI();
            }
        }

        const player = document.querySelector('.native-player, .plyr, .interface') || video;
        player.addEventListener('wheel', handleWheel, { passive: false });
        player.addEventListener('mousemove', handleMouseMove);

        document.addEventListener('wheel', function(e) {
            const player = document.querySelector('.native-player, .plyr, .interface, video');
            if (player && player.contains(e.target)) {
                e.preventDefault();

                const now = Date.now();
                const timeDiff = now - lastScrollTime;

                let speedMultiplier = 1;
                if (timeDiff < 50) {
                    scrollAccumulator += Math.abs(e.deltaY);
                    speedMultiplier = Math.min(1 + (scrollAccumulator * 0.001), 3);
                } else {
                    scrollAccumulator = 0;
                }

                lastScrollTime = now;

                const baseStep = 0.008;
                const adjustedStep = baseStep * speedMultiplier;
                const delta = e.deltaY > 0 ? -adjustedStep : adjustedStep;

                changeVolume(delta);
            }
        }, { passive: false });

        document.addEventListener('mousemove', function(e) {
            const player = document.querySelector('.native-player, .plyr, .interface, video');
            if (player && player.contains(e.target)) {
                showVolumeUI();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    const observer = new MutationObserver(function(mutations) {
        if (!document.querySelector('.custom-volume-ui')) {
            initialize();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
})();
