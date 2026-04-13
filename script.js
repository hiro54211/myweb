// 密码加密存储 (Base64)
const ENCRYPTED_PASSWORD = 'emhvdXl1bmZlaTIwMDY=';

// 全局状态
let isAuthenticated = false;
let currentEditingAnimeId = null;
let currentFilterYear = 'all';
let currentCoverData = null;

// JSONBin 配置
let jsonbinConfig = null;
let dataCache = { anime: {}, comments: {} };

// 初始化
document.addEventListener('DOMContentLoaded', async function() {
    jsonbinConfig = window.JSONBIN_CONFIG;
    if (!jsonbinConfig) {
        showNotification('配置加载失败', 'error');
        return;
    }
    
    await loadData();
    bindEvents();
    updateYearSidebar();
});

// JSONBin API 请求
async function jsonbinApi(method = 'GET', body = null) {
    const url = `https://api.jsonbin.io/v3/b/${jsonbinConfig.binId}/latest`;
    const headers = {
        'X-Master-Key': jsonbinConfig.apiKey,
        'Content-Type': 'application/json'
    };
    
    const options = { method, headers };
    if (body && method !== 'GET') {
        options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`JSONBin API error: ${response.status}`);
    }
    return response.json();
}

// 加载数据
async function loadData() {
    try {
        const result = await jsonbinApi('GET');
        
        if (result && result.record) {
            dataCache = result.record;
            // 确保数据结构完整
            if (!dataCache.anime) dataCache.anime = {};
            if (!dataCache.comments) dataCache.comments = {};
        }
        
        // 更新界面
        Object.keys(dataCache.anime).forEach(id => {
            updateAnimeCard(id, dataCache.anime[id]);
        });
        
        Object.keys(dataCache.comments).forEach(id => {
            updateCommentsList(id, dataCache.comments[id]);
        });
        
    } catch (error) {
        console.error('加载数据失败:', error);
        showNotification('加载数据失败，使用本地数据', 'error');
    }
}

// 保存数据到 JSONBin
async function saveData() {
    try {
        const url = `https://api.jsonbin.io/v3/b/${jsonbinConfig.binId}`;
        const headers = {
            'X-Master-Key': jsonbinConfig.apiKey,
            'Content-Type': 'application/json'
        };
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(dataCache)
        });
        
        if (!response.ok) {
            throw new Error(`JSONBin API error: ${response.status}`);
        }
        return true;
    } catch (error) {
        console.error('保存数据失败:', error);
        showNotification('保存失败，请重试', 'error');
        return false;
    }
}

// 绑定事件
function bindEvents() {
    // 评论表单
    document.querySelectorAll('.comment-form').forEach(form => {
        form.addEventListener('submit', handleAddComment);
    });

    // 编辑按钮
    document.querySelectorAll('.btn-edit-anime').forEach(btn => {
        btn.addEventListener('click', handleEditClick);
    });

    // 登录按钮
    document.getElementById('btnLogin').addEventListener('click', () => {
        currentEditingAnimeId = null;
        openPasswordModal();
    });

    // 密码弹窗
    document.getElementById('passwordForm').addEventListener('submit', handlePasswordSubmit);
    document.getElementById('cancelPassword').addEventListener('click', closePasswordModal);

    // 编辑弹窗
    document.getElementById('editAnimeForm').addEventListener('submit', handleSaveEdit);
    document.getElementById('closeEditBtn').addEventListener('click', closeEditModal);

    // 新增栏目
    document.getElementById('btnAddAnime').addEventListener('click', handleAddNewAnime);

    // 年份筛选
    document.getElementById('yearSidebarMenu').addEventListener('click', function(e) {
        const link = e.target.closest('.sidebar-link');
        if (link && link.dataset.year) {
            e.preventDefault();
            filterByYear(link.dataset.year);

            document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        }
    });

    // 封面上传
    document.getElementById('editCover').addEventListener('change', handleCoverUpload);
}

// 更新动漫卡片
function updateAnimeCard(animeId, data) {
    const card = document.querySelector(`[data-anime-id="${animeId}"]`);
    if (!card || card.dataset.updating === 'true') return;

    card.classList.remove('empty-card');
    card.dataset.year = data.year || '';
    
    card.querySelector('.anime-title').textContent = data.title || '未命名';
    card.querySelector('.anime-rating').innerHTML = `<i class="fas fa-star"></i> ${data.rating || '0'}分`;
    card.querySelector('.anime-year').innerHTML = `<i class="fas fa-calendar"></i> ${data.year || '未知'}年`;
    
    const tags = data.tags || '';
    card.querySelector('.anime-tags').innerHTML = tags.split(',').filter(t => t.trim()).map(t => `<span class="tag">${t.trim()}</span>`).join('');
    
    const review = data.review || '';
    card.querySelector('.anime-review').innerHTML = review.split('\n').filter(p => p.trim()).map(p => `<p>${p.trim()}</p>`).join('');

    // 更新封面
    if (data.cover) {
        const coverContainer = card.querySelector('.anime-cover-container');
        coverContainer.innerHTML = `
            <div class="anime-cover">
                <img src="${data.cover}" alt="${data.title}封面">
            </div>
        `;
    }

    updateYearSidebar();
}

// 更新评论列表
function updateCommentsList(animeId, comments) {
    const commentsList = document.getElementById(`comments-${animeId}`);
    if (!commentsList) return;

    commentsList.innerHTML = '';

    if (!comments || comments.length === 0) {
        commentsList.innerHTML = '<div class="empty-comments">暂无评论，快来发表你的看法吧！</div>';
        return;
    }

    comments.forEach(comment => {
        const commentItem = document.createElement('div');
        commentItem.className = 'comment-item';
        commentItem.innerHTML = `
            <div class="comment-content">${escapeHtml(comment.content)}</div>
            <div class="comment-time">${new Date(comment.time).toLocaleString()}</div>
        `;
        commentsList.appendChild(commentItem);
    });
}

// 打开密码弹窗
function openPasswordModal() {
    document.getElementById('passwordModal').classList.add('active');
    document.getElementById('passwordInput').value = '';
    document.getElementById('passwordError').classList.remove('show');
    document.getElementById('passwordInput').focus();
}

// 关闭密码弹窗
function closePasswordModal() {
    document.getElementById('passwordModal').classList.remove('active');
}

// 处理密码提交
function handlePasswordSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('passwordInput').value;
    const decrypted = atob(ENCRYPTED_PASSWORD);

    if (input === decrypted) {
        isAuthenticated = true;
        closePasswordModal();
        document.getElementById('btnLogin').style.display = 'none';
        document.getElementById('btnAddAnime').style.display = 'flex';
        showNotification('身份验证成功！', 'success');

        if (currentEditingAnimeId) {
            openEditModal(currentEditingAnimeId);
        }
    } else {
        document.getElementById('passwordError').classList.add('show');
        document.getElementById('passwordInput').value = '';
    }
}

// 处理编辑点击
function handleEditClick(e) {
    const animeId = e.currentTarget.dataset.animeId;
    currentEditingAnimeId = animeId;

    if (!isAuthenticated) {
        openPasswordModal();
    } else {
        openEditModal(animeId);
    }
}

// 打开编辑弹窗
function openEditModal(animeId) {
    const card = document.querySelector(`[data-anime-id="${animeId}"]`);
    if (!card) {
        showNotification('找不到该栏目', 'error');
        return;
    }

    const titleEl = card.querySelector('.anime-title');
    const ratingEl = card.querySelector('.anime-rating');
    const yearEl = card.querySelector('.anime-year');
    const tagsEl = card.querySelector('.anime-tags');
    const reviewEl = card.querySelector('.anime-review');

    const title = titleEl ? titleEl.textContent : '';
    const ratingText = ratingEl ? ratingEl.textContent : '';
    const yearText = yearEl ? yearEl.textContent : '';
    const tags = tagsEl ? Array.from(tagsEl.querySelectorAll('.tag')).map(t => t.textContent).join(', ') : '';
    const review = reviewEl ? reviewEl.innerHTML.replace(/<p>/g, '').replace(/<\/p>/g, '\n').trim() : '';

    currentCoverData = null;

    document.getElementById('editAnimeId').value = animeId;
    document.getElementById('editTitle').value = title === '空栏目 1' || title === '空栏目 2' || title === '空栏目 3' || title === '新栏目' ? '' : title;
    document.getElementById('editRating').value = ratingText.match(/\d+/) ? ratingText.match(/\d+/)[0] : '8';
    document.getElementById('editYear').value = yearText.match(/\d+/) ? yearText.match(/\d+/)[0] : new Date().getFullYear();
    document.getElementById('editTags').value = tags === '待添加标签' ? '' : tags;
    document.getElementById('editReview').value = review === '点击编辑按钮添加内容...' ? '' : review;

    // 设置封面预览
    const coverPreview = document.getElementById('coverPreview');
    const animeData = dataCache.anime[animeId];
    
    if (animeData && animeData.cover) {
        coverPreview.innerHTML = `<img src="${animeData.cover}" alt="封面">`;
        currentCoverData = animeData.cover;
    } else {
        coverPreview.innerHTML = `
            <div class="cover-placeholder">
                <i class="fas fa-cloud-upload-alt"></i>
                <span>点击上传封面图片</span>
            </div>
        `;
    }

    document.getElementById('editModal').classList.add('active');
}

// 关闭编辑弹窗
function closeEditModal() {
    document.getElementById('editModal').classList.remove('active');
    currentEditingAnimeId = null;
    currentCoverData = null;
}

// 处理封面上传
function handleCoverUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showNotification('请选择图片文件', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
        currentCoverData = event.target.result;
        const coverPreview = document.getElementById('coverPreview');
        coverPreview.innerHTML = `<img src="${currentCoverData}" alt="封面预览">`;
    };
    reader.readAsDataURL(file);
}

// 保存编辑
async function handleSaveEdit(e) {
    e.preventDefault();

    const animeId = document.getElementById('editAnimeId').value;
    const title = document.getElementById('editTitle').value || '未命名';
    const rating = document.getElementById('editRating').value;
    const year = document.getElementById('editYear').value;
    const tags = document.getElementById('editTags').value;
    const review = document.getElementById('editReview').value;

    const card = document.querySelector(`[data-anime-id="${animeId}"]`);
    card.dataset.updating = 'true';

    // 更新数据缓存
    dataCache.anime[animeId] = {
        title,
        rating,
        year,
        tags,
        review,
        cover: currentCoverData,
        updatedAt: new Date().toISOString()
    };

    // 保存到 JSONBin
    const saved = await saveData();
    
    if (saved) {
        // 更新界面
        updateAnimeCard(animeId, dataCache.anime[animeId]);
        closeEditModal();
        showNotification('保存成功！', 'success');
    }
    
    delete card.dataset.updating;
}

// 处理添加评论
async function handleAddComment(e) {
    e.preventDefault();
    const animeId = e.target.dataset.animeId;
    const input = e.target.querySelector('.comment-input');
    const content = input.value.trim();

    if (!content) return;

    const commentData = {
        content: content,
        time: new Date().toISOString()
    };

    // 更新数据缓存
    if (!dataCache.comments[animeId]) {
        dataCache.comments[animeId] = [];
    }
    dataCache.comments[animeId].push(commentData);

    // 保存到 JSONBin
    const saved = await saveData();
    
    if (saved) {
        input.value = '';
        updateCommentsList(animeId, dataCache.comments[animeId]);
        showNotification('评论已发布！', 'success');
    }
}

// 新增栏目
async function handleAddNewAnime() {
    if (!isAuthenticated) {
        showNotification('请先验证身份', 'error');
        return;
    }

    const animeList = document.getElementById('animeList');
    const newId = Date.now().toString();

    // 添加到数据缓存
    dataCache.anime[newId] = {
        title: '新栏目',
        rating: '',
        year: '',
        tags: '待添加标签',
        review: '点击编辑按钮添加内容...',
        cover: null,
        updatedAt: new Date().toISOString()
    };
    dataCache.comments[newId] = [];

    // 保存到 JSONBin
    const saved = await saveData();
    
    if (!saved) {
        showNotification('创建失败，请重试', 'error');
        return;
    }

    const newCard = document.createElement('article');
    newCard.className = 'anime-card empty-card';
    newCard.dataset.animeId = newId;
    newCard.innerHTML = `
        <div class="anime-header">
            <div class="anime-title-section">
                <h3 class="anime-title">新栏目</h3>
                <div class="anime-meta">
                    <span class="anime-rating"><i class="fas fa-star"></i> 待评分</span>
                    <span class="anime-year"><i class="fas fa-calendar"></i> 待填写</span>
                </div>
            </div>
            <div class="anime-actions">
                <button class="btn-icon btn-edit-anime" data-anime-id="${newId}" title="编辑">
                    <i class="fas fa-edit"></i>
                </button>
            </div>
        </div>
        <div class="anime-tags">
            <span class="tag">待添加标签</span>
        </div>
        <div class="anime-cover-container">
            <div class="anime-cover empty-cover">
                <i class="fas fa-image"></i>
                <span>暂无封面</span>
            </div>
        </div>
        <div class="anime-review">
            <p>点击编辑按钮添加内容...</p>
        </div>
        <div class="comments-section">
            <div class="comments-header">
                <i class="fas fa-comments"></i>
                <span>评论区</span>
            </div>
            <div class="comments-list" id="comments-${newId}">
                <div class="empty-comments">暂无评论，快来发表你的看法吧！</div>
            </div>
            <form class="comment-form" data-anime-id="${newId}">
                <input type="text" class="comment-input" placeholder="写下你的评论..." required>
                <button type="submit" class="btn-comment">
                    <i class="fas fa-paper-plane"></i> 发送
                </button>
            </form>
        </div>
    `;

    animeList.appendChild(newCard);

    newCard.querySelector('.btn-edit-anime').addEventListener('click', handleEditClick);
    newCard.querySelector('.comment-form').addEventListener('submit', handleAddComment);

    setTimeout(() => {
        openEditModal(newId);
    }, 100);

    showNotification('新栏目已添加', 'success');
}

// 年份筛选
function filterByYear(year) {
    currentFilterYear = year;
    document.querySelectorAll('.anime-card').forEach(card => {
        const cardYear = card.dataset.year;
        if (year === 'all' || cardYear === year) {
            card.classList.remove('hidden');
        } else {
            card.classList.add('hidden');
        }
    });
}

// 更新年份侧边栏
function updateYearSidebar() {
    const years = new Set();
    document.querySelectorAll('.anime-card').forEach(card => {
        const year = card.dataset.year;
        if (year) years.add(year);
    });

    const sortedYears = Array.from(years).sort((a, b) => b - a);
    const sidebarMenu = document.getElementById('yearSidebarMenu');
    const allLink = sidebarMenu.querySelector('[data-year="all"]');
    sidebarMenu.innerHTML = '';
    sidebarMenu.appendChild(allLink.parentElement);

    sortedYears.forEach(year => {
        const li = document.createElement('li');
        li.className = 'sidebar-item';
        li.innerHTML = `
            <a href="#" class="sidebar-link ${currentFilterYear === year ? 'active' : ''}" data-year="${year}">
                <i class="fas fa-calendar sidebar-icon"></i>
                <span>${year}年</span>
            </a>
        `;
        sidebarMenu.appendChild(li);
    });
}

// 显示通知
function showNotification(message, type) {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// HTML转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
