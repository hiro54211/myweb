// 密码加密存储 (Base64)
const ENCRYPTED_PASSWORD = 'emhvdXl1bmZlaTIwMDY=';

// 全局状态
let isAuthenticated = false;
let currentEditingAnimeId = null;
let currentFilterYear = 'all';
let currentCoverData = null;

// 数据存储
let animeData = {};
let commentsData = {};

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    bindEvents();
    updateYearSidebar();
});

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
    const title = card.querySelector('.anime-title').textContent;
    const ratingText = card.querySelector('.anime-rating').textContent;
    const yearText = card.querySelector('.anime-year').textContent;
    const tags = Array.from(card.querySelectorAll('.tag')).map(t => t.textContent).join(', ');
    const review = card.querySelector('.anime-review').innerHTML.replace(/<p>/g, '').replace(/<\/p>/g, '\n').trim();

    // 重置封面数据
    currentCoverData = null;

    document.getElementById('editAnimeId').value = animeId;
    document.getElementById('editTitle').value = title;
    document.getElementById('editRating').value = ratingText.match(/\d+/) ? ratingText.match(/\d+/)[0] : '8';
    document.getElementById('editYear').value = yearText.match(/\d+/) ? yearText.match(/\d+/)[0] : new Date().getFullYear();
    document.getElementById('editTags').value = tags;
    document.getElementById('editReview').value = review;

    // 设置封面预览
    const coverPreview = document.getElementById('coverPreview');
    if (animeData[animeId] && animeData[animeId].cover) {
        coverPreview.innerHTML = `<img src="${animeData[animeId].cover}" alt="封面">`;
        currentCoverData = animeData[animeId].cover;
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
function handleSaveEdit(e) {
    e.preventDefault();

    const animeId = document.getElementById('editAnimeId').value;
    const title = document.getElementById('editTitle').value;
    const rating = document.getElementById('editRating').value;
    const year = document.getElementById('editYear').value;
    const tags = document.getElementById('editTags').value;
    const review = document.getElementById('editReview').value;

    const card = document.querySelector(`[data-anime-id="${animeId}"]`);
    card.classList.remove('empty-card');
    card.dataset.year = year;

    card.querySelector('.anime-title').textContent = title;
    card.querySelector('.anime-rating').innerHTML = `<i class="fas fa-star"></i> ${rating}分`;
    card.querySelector('.anime-year').innerHTML = `<i class="fas fa-calendar"></i> ${year}年`;

    const tagsContainer = card.querySelector('.anime-tags');
    tagsContainer.innerHTML = tags.split(',').map(t => `<span class="tag">${t.trim()}</span>`).join('');

    const reviewContainer = card.querySelector('.anime-review');
    reviewContainer.innerHTML = review.split('\n').filter(p => p.trim()).map(p => `<p>${p.trim()}</p>`).join('');

    // 更新封面
    const coverContainer = card.querySelector('.anime-cover-container');
    if (currentCoverData) {
        coverContainer.innerHTML = `
            <div class="anime-cover">
                <img src="${currentCoverData}" alt="${title}封面">
            </div>
        `;
    }

    animeData[animeId] = { title, rating, year, tags, review, cover: currentCoverData };
    saveData();
    updateYearSidebar();

    closeEditModal();
    showNotification('保存成功！', 'success');
}

// 处理添加评论
function handleAddComment(e) {
    e.preventDefault();
    const animeId = e.target.dataset.animeId;
    const input = e.target.querySelector('.comment-input');
    const content = input.value.trim();

    if (!content) return;

    const commentsList = document.getElementById(`comments-${animeId}`);
    const emptyMsg = commentsList.querySelector('.empty-comments');
    if (emptyMsg) emptyMsg.remove();

    const commentId = Date.now();
    const commentItem = document.createElement('div');
    commentItem.className = 'comment-item';
    commentItem.dataset.commentId = commentId;
    commentItem.innerHTML = `
        <div class="comment-content">${escapeHtml(content)}</div>
        <div class="comment-time">${new Date().toLocaleString()}</div>
    `;

    commentsList.appendChild(commentItem);
    input.value = '';

    if (!commentsData[animeId]) commentsData[animeId] = [];
    commentsData[animeId].push({ id: commentId, content, time: new Date().toISOString() });
    saveData();
}

// 新增栏目
function handleAddNewAnime() {
    if (!isAuthenticated) {
        showNotification('请先验证身份', 'error');
        return;
    }

    const animeList = document.getElementById('animeList');
    const newId = Date.now();

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

    openEditModal(newId);
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
    for (let id in animeData) {
        if (animeData[id].year) years.add(animeData[id].year);
    }

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

// 数据持久化
function saveData() {
    localStorage.setItem('animeData', JSON.stringify(animeData));
    localStorage.setItem('commentsData', JSON.stringify(commentsData));
}

function loadData() {
    const savedAnime = localStorage.getItem('animeData');
    const savedComments = localStorage.getItem('commentsData');

    if (savedAnime) {
        animeData = JSON.parse(savedAnime);
        Object.keys(animeData).forEach(id => {
            const data = animeData[id];
            const card = document.querySelector(`[data-anime-id="${id}"]`);
            if (card) {
                card.classList.remove('empty-card');
                card.dataset.year = data.year;
                card.querySelector('.anime-title').textContent = data.title;
                card.querySelector('.anime-rating').innerHTML = `<i class="fas fa-star"></i> ${data.rating}分`;
                card.querySelector('.anime-year').innerHTML = `<i class="fas fa-calendar"></i> ${data.year}年`;
                card.querySelector('.anime-tags').innerHTML = data.tags.split(',').map(t => `<span class="tag">${t.trim()}</span>`).join('');
                card.querySelector('.anime-review').innerHTML = data.review.split('\n').filter(p => p.trim()).map(p => `<p>${p.trim()}</p>`).join('');

                // 加载封面
                if (data.cover) {
                    const coverContainer = card.querySelector('.anime-cover-container');
                    coverContainer.innerHTML = `
                        <div class="anime-cover">
                            <img src="${data.cover}" alt="${data.title}封面">
                        </div>
                    `;
                }
            }
        });
    }

    if (savedComments) {
        commentsData = JSON.parse(savedComments);
        Object.keys(commentsData).forEach(animeId => {
            const commentsList = document.getElementById(`comments-${animeId}`);
            if (commentsList && commentsData[animeId].length > 0) {
                const emptyMsg = commentsList.querySelector('.empty-comments');
                if (emptyMsg) emptyMsg.remove();

                commentsData[animeId].forEach(comment => {
                    const commentItem = document.createElement('div');
                    commentItem.className = 'comment-item';
                    commentItem.dataset.commentId = comment.id;
                    commentItem.innerHTML = `
                        <div class="comment-content">${escapeHtml(comment.content)}</div>
                        <div class="comment-time">${new Date(comment.time).toLocaleString()}</div>
                    `;
                    commentsList.appendChild(commentItem);
                });
            }
        });
    }
}
