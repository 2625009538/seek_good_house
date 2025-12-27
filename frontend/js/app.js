/**
 * 北京看房地图 - 前端主逻辑
 * 
 * 第二阶段：房屋标注功能
 */

// ========================================
// API 基础配置
// ========================================
const API_BASE = '';  // 同源，无需前缀

// ========================================
// 全局变量
// ========================================
let map = null;  // 高德地图实例
let markers = [];  // 存储所有标记点
let allTags = [];  // 所有标签
let selectedTagIds = [];  // 已选中的标签ID
let currentRating = 0;  // 当前评分
let isEditMode = false;  // 是否编辑模式
let currentHouseId = null;  // 当前编辑的房屋ID

// 定位相关
let myLocation = null;  // 当前位置 {lng, lat}
let myLocationMarker = null;  // 当前位置标记
let geolocationInstance = null;  // 定位控件实例

// 防止误触发
let ignoreNextMapClick = false;  // 防止点击标记后触发地图点击

// 北京市中心坐标
const BEIJING_CENTER = [116.397428, 39.90923];
const DEFAULT_ZOOM = 11;

// ========================================
// 初始化
// ========================================
document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 北京看房地图启动中...');
    initMap();
    loadTags();
    initFormEvents();
});

// ========================================
// 初始化地图
// ========================================
function initMap() {
    if (typeof AMap === 'undefined') {
        showError('高德地图JS库加载失败，请检查网络连接');
        return;
    }

    try {
        map = new AMap.Map('map-container', {
            zoom: DEFAULT_ZOOM,
            center: BEIJING_CENTER,
            mapStyle: 'amap://styles/fresh',
            viewMode: '3D',
            pitch: 40,
            rotation: 0,
            features: ['bg', 'road', 'building', 'point'],
            rotateEnable: true,      // 允许键盘旋转
            pitchEnable: true,       // 允许俯仰
            dragEnable: true,        // 允许拖动
            keyboardEnable: true,    // 允许键盘控制
            doubleClickZoom: true,   // 双击缩放
            scrollWheel: true,       // 滚轮缩放
        });

        map.on('complete', function () {
            console.log('✅ 地图加载完成');
            updateFooterInfo();
            loadHouseMarkers();  // 加载所有房屋标记
        });

        addMapControls();
        bindMapEvents();
        console.log('✅ 地图初始化成功');

    } catch (error) {
        console.error('❌ 地图初始化失败:', error);
        showError('地图初始化失败: ' + error.message);
    }
}

// ========================================
// 显示错误信息
// ========================================
function showError(message) {
    document.getElementById('map-container').innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#ff4d4f;text-align:center;padding:20px;">
            <p style="font-size:18px;margin-bottom:10px;">❌ ${message}</p>
            <p style="color:#8c8c8c;font-size:14px;">请按 F12 打开开发者工具查看详细错误</p>
        </div>
    `;
}

// ========================================
// 添加地图控件
// ========================================
function addMapControls() {
    map.addControl(new AMap.Scale({ position: 'LB' }));
    map.addControl(new AMap.ToolBar({ position: 'RT' }));
    map.addControl(new AMap.HawkEye({ opened: false }));

    // 定位控件
    geolocationInstance = new AMap.Geolocation({
        enableHighAccuracy: true,
        timeout: 10000,
        buttonPosition: 'RB',
        buttonOffset: new AMap.Pixel(10, 20),
        zoomToAccuracy: false,  // 不自动缩放，我们手动控制
        showMarker: false,      // 不使用默认标记，我们自定义
        showCircle: true,
        panToLocation: true,
    });
    map.addControl(geolocationInstance);

    // 定位成功回调
    geolocationInstance.on('complete', function (data) {
        console.log('✅ 定位成功:', data.position);
        myLocation = {
            lng: data.position.lng,
            lat: data.position.lat,
            accuracy: data.accuracy
        };
        updateMyLocationMarker();
        showToast('定位成功', 'success');
    });

    // 定位失败回调
    geolocationInstance.on('error', function (data) {
        console.warn('⚠️ 定位失败:', data.message);
        showToast('定位失败: ' + data.message, 'error');
    });

    // 自动执行一次定位
    geolocationInstance.getCurrentPosition();
}

// ========================================
// 更新我的位置标记
// ========================================
function updateMyLocationMarker() {
    if (!myLocation) return;

    // 移除旧标记
    if (myLocationMarker) {
        map.remove(myLocationMarker);
    }

    // 创建新标记
    myLocationMarker = new AMap.Marker({
        position: [myLocation.lng, myLocation.lat],
        content: `
            <div class="my-location-marker">
                <div class="pulse-ring"></div>
                <div class="center-dot">📍</div>
            </div>
        `,
        anchor: 'center',
        offset: new AMap.Pixel(0, 0),
        zIndex: 999
    });

    map.add(myLocationMarker);
}

// ========================================
// 回到我的位置
// ========================================
function goToMyLocation() {
    if (myLocation) {
        map.setZoomAndCenter(16, [myLocation.lng, myLocation.lat]);
        showToast('已回到当前位置', 'info');
    } else {
        // 如果没有位置，触发重新定位
        if (geolocationInstance) {
            geolocationInstance.getCurrentPosition();
            showToast('正在定位...', 'info');
        }
    }
}

// ========================================
// 绑定地图事件
// ========================================
function bindMapEvents() {
    map.on('moveend', updateFooterInfo);
    map.on('zoomend', updateFooterInfo);

    // 地图点击事件 - 添加房屋
    map.on('click', function (e) {
        // 防抖：如果刚点击过标记，忽略这次地图点击
        if (ignoreNextMapClick) {
            ignoreNextMapClick = false;
            return;
        }

        const lng = e.lnglat.getLng();
        const lat = e.lnglat.getLat();
        console.log(`📍 点击位置: ${lng.toFixed(6)}, ${lat.toFixed(6)}`);
        openAddHouseModal(lng, lat);
    });
}

// ========================================
// 更新底部状态栏
// ========================================
function updateFooterInfo() {
    if (!map) return;
    const center = map.getCenter();
    const zoom = map.getZoom();
    document.getElementById('map-center').textContent =
        `中心: ${center.lng.toFixed(4)}, ${center.lat.toFixed(4)} | 缩放: ${zoom.toFixed(1)}`;
}

// ========================================
// API 请求封装
// ========================================
async function apiRequest(url, options = {}) {
    try {
        const response = await fetch(API_BASE + url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || '请求失败');
        }

        if (response.status === 204) {
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('API错误:', error);
        throw error;
    }
}

// ========================================
// 加载所有标签
// ========================================
async function loadTags() {
    try {
        allTags = await apiRequest('/api/tags/');
        console.log('✅ 加载标签:', allTags.length, '个');
    } catch (error) {
        console.error('加载标签失败:', error);
        allTags = [];
    }
}

// ========================================
// 加载所有房屋标记
// ========================================
async function loadHouseMarkers() {
    try {
        const houses = await apiRequest('/api/houses/markers');
        console.log('✅ 加载房屋:', houses.length, '套');

        // 清除旧标记
        markers.forEach(m => map.remove(m));
        markers = [];

        // 添加新标记
        houses.forEach(house => {
            addHouseMarker(house);
        });

        updateHouseCount(houses.length);
    } catch (error) {
        console.error('加载房屋失败:', error);
    }
}

// ========================================
// 添加房屋标记到地图
// ========================================
function addHouseMarker(house) {
    const marker = new AMap.Marker({
        position: [house.longitude, house.latitude],
        title: house.name,
        content: createMarkerContent(house),
        anchor: 'bottom-center',
        offset: new AMap.Pixel(0, 0)
    });

    marker.houseData = house;

    marker.on('click', function (e) {
        e.originEvent.stopPropagation();  // 阻止冒泡到地图
        ignoreNextMapClick = true;  // 设置防抖标志
        showHouseDetail(house.id);
    });

    map.add(marker);
    markers.push(marker);
}

// ========================================
// 创建标记点内容
// ========================================
function createMarkerContent(house) {
    const ratingStars = '★'.repeat(house.rating) + '☆'.repeat(5 - house.rating);
    const floorInfo = house.floor ? `${house.floor}层` : '';
    const buildingInfo = house.building_no || '';

    return `
        <div class="custom-marker">
            <div class="marker-icon">🏠</div>
            <div class="marker-label">${house.name}</div>
            ${floorInfo || buildingInfo ? `<div class="marker-floor">${buildingInfo} ${floorInfo}</div>` : ''}
        </div>
    `;
}

// ========================================
// 更新房屋计数
// ========================================
function updateHouseCount(count) {
    document.getElementById('house-count').textContent = `已标注 ${count} 套房源`;
}

// ========================================
// 打开添加房屋对话框
// ========================================
function openAddHouseModal(lng, lat) {
    isEditMode = false;
    currentHouseId = null;

    // 重置表单
    document.getElementById('house-form').reset();
    document.getElementById('house-id').value = '';
    document.getElementById('house-lng').value = lng;
    document.getElementById('house-lat').value = lat;
    document.getElementById('modal-title').textContent = '添加房屋';

    // 重置标签和评分
    selectedTagIds = [];
    currentRating = 0;
    renderTags();
    updateRatingDisplay();

    // 显示对话框
    document.getElementById('add-house-modal').style.display = 'flex';
}

// ========================================
// 打开编辑房屋对话框
// ========================================
async function openEditHouseModal(houseId) {
    try {
        const house = await apiRequest(`/api/houses/${houseId}`);

        isEditMode = true;
        currentHouseId = houseId;

        // 填充表单
        document.getElementById('house-id').value = house.id;
        document.getElementById('house-lng').value = house.longitude;
        document.getElementById('house-lat').value = house.latitude;
        document.getElementById('house-name').value = house.name || '';
        document.getElementById('house-building').value = house.building_no || '';
        document.getElementById('house-unit').value = house.unit_no || '';
        document.getElementById('house-floor').value = house.floor || '';
        document.getElementById('house-total-floors').value = house.total_floors || '';
        document.getElementById('house-area').value = house.area || '';
        document.getElementById('house-price').value = house.price || '';
        document.getElementById('house-address').value = house.address || '';
        document.getElementById('house-beike').value = house.beike_url || '';
        document.getElementById('house-notes').value = house.notes || '';
        document.getElementById('modal-title').textContent = '编辑房屋';

        // 设置标签
        selectedTagIds = house.tags.map(t => t.id);
        renderTags();

        // 设置评分
        currentRating = house.rating || 0;
        updateRatingDisplay();

        // 显示对话框
        document.getElementById('add-house-modal').style.display = 'flex';

    } catch (error) {
        showToast('加载房屋信息失败', 'error');
    }
}

// ========================================
// 关闭对话框
// ========================================
function closeModal() {
    document.getElementById('add-house-modal').style.display = 'none';
}

// ========================================
// 渲染标签选择器
// ========================================
function renderTags() {
    const container = document.getElementById('tag-container');
    container.innerHTML = allTags.map(tag => `
        <div class="tag-item ${selectedTagIds.includes(tag.id) ? 'selected' : ''}" 
             data-id="${tag.id}" 
             onclick="toggleTag(${tag.id})"
             style="${selectedTagIds.includes(tag.id) ? `border-color: ${tag.color}; color: ${tag.color};` : ''}">
            <span class="tag-icon">${tag.icon || ''}</span>
            ${tag.name}
        </div>
    `).join('');
}

// ========================================
// 切换标签选中状态
// ========================================
function toggleTag(tagId) {
    const index = selectedTagIds.indexOf(tagId);
    if (index > -1) {
        selectedTagIds.splice(index, 1);
    } else {
        selectedTagIds.push(tagId);

        // 大卧室标签提示
        const tag = allTags.find(t => t.id === tagId);
        if (tag && tag.name === '大卧室') {
            showTagTip('15平米以上才算大卧室');
        }
    }
    renderTags();
}

// ========================================
// 初始化表单事件
// ========================================
function initFormEvents() {
    // 表单提交
    document.getElementById('house-form').addEventListener('submit', async function (e) {
        e.preventDefault();
        await saveHouse();
    });

    // 评分点击
    document.querySelectorAll('#rating-container .star').forEach(star => {
        star.addEventListener('click', function () {
            currentRating = parseInt(this.dataset.value);
            updateRatingDisplay();
        });
    });

    // ESC键关闭对话框，空格键回到当前位置
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            closeModal();
        }
        // 空格键回到当前位置（仅当没有在输入框或对话框中时）
        if (e.key === ' ' && !isTyping() && !isModalOpen()) {
            e.preventDefault();
            goToMyLocation();
        }
    });

    // 点击遮罩关闭对话框
    document.getElementById('add-house-modal').addEventListener('click', function (e) {
        if (e.target === this) {
            closeModal();
        }
    });
}

// ========================================
// 更新评分显示
// ========================================
function updateRatingDisplay() {
    document.getElementById('house-rating').value = currentRating;
    document.querySelectorAll('#rating-container .star').forEach((star, index) => {
        star.textContent = index < currentRating ? '★' : '☆';
        star.classList.toggle('active', index < currentRating);
    });
}

// ========================================
// 保存房屋
// ========================================
async function saveHouse() {
    const data = {
        name: document.getElementById('house-name').value,
        longitude: parseFloat(document.getElementById('house-lng').value),
        latitude: parseFloat(document.getElementById('house-lat').value),
        building_no: document.getElementById('house-building').value || null,
        unit_no: document.getElementById('house-unit').value || null,
        floor: parseInt(document.getElementById('house-floor').value) || null,
        total_floors: parseInt(document.getElementById('house-total-floors').value) || null,
        area: parseFloat(document.getElementById('house-area').value) || null,
        price: parseFloat(document.getElementById('house-price').value) || null,
        address: document.getElementById('house-address').value || null,
        beike_url: document.getElementById('house-beike').value || null,
        notes: document.getElementById('house-notes').value || null,
        rating: currentRating,
        tag_ids: selectedTagIds
    };

    try {
        if (isEditMode && currentHouseId) {
            await apiRequest(`/api/houses/${currentHouseId}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            showToast('房屋更新成功！', 'success');
        } else {
            await apiRequest('/api/houses/', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            showToast('房屋添加成功！', 'success');
        }

        closeModal();
        loadHouseMarkers();  // 重新加载标记

    } catch (error) {
        showToast('保存失败: ' + error.message, 'error');
    }
}

// ========================================
// 显示房屋详情
// ========================================
async function showHouseDetail(houseId) {
    try {
        const house = await apiRequest(`/api/houses/${houseId}`);

        // 构建详情HTML
        const tagsHtml = house.tags.map(t =>
            `<span class="tag-item selected" style="border-color:${t.color};color:${t.color}">
                ${t.icon || ''} ${t.name}
            </span>`
        ).join('');

        const ratingHtml = '★'.repeat(house.rating) + '☆'.repeat(5 - house.rating);

        const detailHtml = `
            <div class="house-detail">
                <h3>${house.name}</h3>
                ${house.building_no || house.unit_no || house.floor ? `<p>📍 ${house.building_no || ''} ${house.unit_no || ''} ${house.floor ? house.floor + '层' : ''}</p>` : ''}
                ${house.area ? `<p>📐 ${house.area} ㎡</p>` : ''}
                ${house.price ? `<p>💰 ${house.price} 万元</p>` : ''}
                ${house.address ? `<p>🗺️ ${house.address}</p>` : ''}
                <p>⭐ ${ratingHtml}</p>
                ${tagsHtml ? `<div class="tags-display">${tagsHtml}</div>` : ''}
                ${house.notes ? `<p class="notes">📝 ${house.notes}</p>` : ''}
                ${house.beike_url ? `<p><a href="${house.beike_url}" target="_blank">🔗 查看贝壳链接</a></p>` : ''}
                <div class="detail-actions">
                    <button class="btn btn-primary" onclick="openEditHouseModal(${house.id})">编辑</button>
                    <button class="btn btn-danger" onclick="deleteHouse(${house.id})">删除</button>
                </div>
            </div>
        `;

        // 显示在侧边栏
        document.getElementById('panel-content').innerHTML = detailHtml;
        document.getElementById('info-panel').style.display = 'flex';

        // 修复鼠标拖动bug：触发mouseup重置地图拖动状态
        const mapContainer = document.getElementById('map-container');
        const mouseUpEvent = new MouseEvent('mouseup', {
            bubbles: true,
            cancelable: true,
            view: window
        });
        mapContainer.dispatchEvent(mouseUpEvent);

        // 关闭按钮事件
        document.getElementById('close-panel').onclick = function () {
            document.getElementById('info-panel').style.display = 'none';
        };

    } catch (error) {
        showToast('加载详情失败', 'error');
    }
}

// ========================================
// 删除房屋
// ========================================
async function deleteHouse(houseId) {
    if (!confirm('确定要删除这个房屋吗？')) {
        return;
    }

    try {
        await apiRequest(`/api/houses/${houseId}`, { method: 'DELETE' });
        showToast('删除成功', 'success');
        document.getElementById('info-panel').style.display = 'none';
        loadHouseMarkers();
    } catch (error) {
        showToast('删除失败: ' + error.message, 'error');
    }
}

// ========================================
// Toast 消息提示
// ========================================
function showToast(message, type = 'info') {
    // 创建toast容器（如果不存在）
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    // 3秒后自动消失
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ========================================
// 辅助函数：判断是否在输入框中
// ========================================
function isTyping() {
    const activeElement = document.activeElement;
    return activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.isContentEditable
    );
}

// ========================================
// 辅助函数：判断对话框是否打开
// ========================================
function isModalOpen() {
    const modal = document.getElementById('add-house-modal');
    return modal && modal.style.display !== 'none';
}

// ========================================
// 显示标签提示（短暂显示，自动消失）
// ========================================
function showTagTip(message) {
    // 创建提示元素
    const tip = document.createElement('div');
    tip.className = 'tag-tip';
    tip.textContent = message;
    tip.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        z-index: 2000;
        animation: tipFadeIn 0.3s ease;
    `;
    document.body.appendChild(tip);

    // 1.5秒后自动消失
    setTimeout(() => {
        tip.style.opacity = '0';
        tip.style.transition = 'opacity 0.3s';
        setTimeout(() => tip.remove(), 300);
    }, 1500);
}
