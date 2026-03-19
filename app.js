// ═══ ИНИЦИАЛИЗАЦИЯ TELEGRAM WEB APP ═══
const tg = window.Telegram.WebApp;
tg.ready();
tg.expand(); // Развернуть на весь экран

// Получаем ID пользователя Telegram
const userId = tg.initDataUnsafe?.user?.id || '836773735';

console.log('🚀 Web App запущен!', { userId });

// ═══ НАСТРОЙКИ ═══
let settings = {
    updateInterval: 3000, // мс
    minProfit: 1.5,
    darkMode: false
};

// ═══ URL API БОТА ═══
const API_BASE = 'http://localhost:8000/api';

// ═══ СОСТОЯНИЕ ПРИЛОЖЕНИЯ ═══
let state = {
    positions: [],
    opportunities: [],
    stats: {
        positionsCount: 0,
        totalProfit: 0,
        notifications: 0
    }
};

// ═══ ПЕРЕКЛЮЧЕНИЕ ТАБОВ ═══
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        
        // Убираем active со всех табов
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
        
        // Добавляем active к выбранному
        tab.classList.add('active');
        document.getElementById(`tab-${tabName}`).classList.add('active');
        
        console.log('Переключено на таб:', tabName);
    });
});

// ═══ ФУНКЦИЯ: ЗАГРУЗКА ПОЗИЦИЙ ═══
async function loadPositions() {
    try {
        // Запрос к РЕАЛЬНОМУ API
        const response = await fetch(`${API_BASE}/positions?user_id=${userId}`);
        const data = await response.json();
        
        // Проверяем что данные получены
        if (data.positions) {
            state.positions = data.positions;
        } else {
            state.positions = [];
        }
        
        renderPositions();
        updateStats();
        
    } catch (error) {
        console.error('Ошибка загрузки позиций:', error);
        // При ошибке показываем пустой список
        state.positions = [];
        renderPositions();
    }
}

// ═══ ФУНКЦИЯ: ОТРИСОВКА ПОЗИЦИЙ ═══
function renderPositions() {
    const container = document.getElementById('positionsList');
    
    if (state.positions.length === 0) {
        container.innerHTML = '<div class="loading"><p>Нет открытых позиций</p></div>';
        return;
    }
    
    container.innerHTML = state.positions.map(pos => {
        const pnlClass = pos.pnl_percent >= 0 ? 'positive' : 'negative';
        const pnlSign = pos.pnl_percent >= 0 ? '+' : '';
        
        return `
            <div class="position-card">
                <div class="position-header">
                    <div class="position-symbol">${pos.symbol}</div>
                    <div class="position-pnl ${pnlClass}">
                        ${pnlSign}${pos.pnl_percent.toFixed(2)}%
                    </div>
                </div>
                
                <div class="position-details">
                    🟢 LONG (${pos.long_exchange}): $${pos.current_price_long.toLocaleString()}<br>
                    🔴 SHORT (${pos.short_exchange}): $${pos.current_price_short.toLocaleString()}<br>
                    💰 P&L: ${pnlSign}$${Math.abs(pos.pnl_usd)}
                </div>
                
                <div class="position-progress">
                    <div class="position-progress-bar" style="width: ${pos.target_progress}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

// ═══ ФУНКЦИЯ: ЗАГРУЗКА ВОЗМОЖНОСТЕЙ ═══
async function loadOpportunities() {
    try {
        // Запрос к РЕАЛЬНОМУ API
        const response = await fetch(`${API_BASE}/opportunities?user_id=${userId}&min_profit=${settings.minProfit}`);
        const data = await response.json();
        
        // Проверяем что данные получены
        if (data.opportunities) {
            state.opportunities = data.opportunities;
        } else {
            state.opportunities = [];
        }
        
        renderOpportunities();
        
    } catch (error) {
        console.error('Ошибка загрузки возможностей:', error);
        state.opportunities = [];
        renderOpportunities();
    }
}

// ═══ ФУНКЦИЯ: ОТРИСОВКА ВОЗМОЖНОСТЕЙ ═══
function renderOpportunities() {
    const container = document.getElementById('opportunitiesList');
    
    if (state.opportunities.length === 0) {
        container.innerHTML = `
            <div class="loading">
                <p>Нет возможностей с прибылью ≥${settings.minProfit}%</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = state.opportunities.map(opp => `
        <div class="opportunity-card">
            <div class="opportunity-info">
                <div class="opportunity-symbol">${opp.symbol}</div>
                <div class="opportunity-exchanges">
                    🟢${opp.long_exchange} / 🔴${opp.short_exchange}
                </div>
            </div>
            <div class="opportunity-profit">
                +${opp.net_profit.toFixed(1)}%
            </div>
        </div>
    `).join('');
}

// ═══ ФУНКЦИЯ: ОБНОВЛЕНИЕ СТАТИСТИКИ ═══
function updateStats() {
    // Подсчёт общей прибыли
    const totalProfit = state.positions.reduce((sum, pos) => sum + pos.pnl_percent, 0);
    
    state.stats = {
        positionsCount: state.positions.length,
        totalProfit: totalProfit,
        notifications: state.opportunities.length
    };
    
    // Обновляем DOM
    document.getElementById('positionsCount').textContent = state.stats.positionsCount;
    
    const profitEl = document.getElementById('totalProfit');
    profitEl.textContent = `${totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(1)}%`;
    profitEl.style.color = totalProfit >= 0 ? '#10b981' : '#ef4444';
    
    document.getElementById('notifications').textContent = state.stats.notifications;
}

// ═══ ФУНКЦИЯ: ОБНОВЛЕНИЕ ВРЕМЕНИ ═══
function updateTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    });
    document.getElementById('updateTime').textContent = `Обновлено ${timeStr}`;
}

// ═══ АВТООБНОВЛЕНИЕ ═══
let updateTimer;

function startAutoUpdate() {
    // Останавливаем предыдущий таймер если был
    if (updateTimer) {
        clearInterval(updateTimer);
    }
    
    // Запускаем новый
    updateTimer = setInterval(() => {
        console.log('🔄 Автообновление...');
        loadPositions();
        loadOpportunities();
        updateTime();
    }, settings.updateInterval);
    
    console.log(`✅ Автообновление запущено (${settings.updateInterval}ms)`);
}

// ═══ НАСТРОЙКИ ═══
document.getElementById('updateInterval').addEventListener('change', (e) => {
    settings.updateInterval = parseInt(e.target.value);
    startAutoUpdate(); // Перезапускаем с новым интервалом
});

document.getElementById('minProfit').addEventListener('change', (e) => {
    settings.minProfit = parseFloat(e.target.value);
    loadOpportunities(); // Перефильтруем возможности
});

document.getElementById('darkMode').addEventListener('change', (e) => {
    settings.darkMode = e.target.checked;
    document.body.classList.toggle('dark-mode', settings.darkMode);
});

document.getElementById('saveSettings').addEventListener('click', () => {
    // Сохраняем в localStorage
    localStorage.setItem('settings', JSON.stringify(settings));
    
    // Показываем уведомление
    tg.showAlert('✅ Настройки сохранены!');
    
    console.log('💾 Настройки сохранены:', settings);
});

// ═══ ЗАГРУЗКА НАСТРОЕК ИЗ localStorage ═══
function loadSettings() {
    const saved = localStorage.getItem('settings');
    if (saved) {
        settings = { ...settings, ...JSON.parse(saved) };
        
        // Применяем настройки к UI
        document.getElementById('updateInterval').value = settings.updateInterval;
        document.getElementById('minProfit').value = settings.minProfit;
        document.getElementById('darkMode').checked = settings.darkMode;
        document.body.classList.toggle('dark-mode', settings.darkMode);
        
        console.log('📂 Настройки загружены:', settings);
    }
}

// ═══ ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ ═══
window.addEventListener('load', async () => {
    console.log('📱 Инициализация Web App...');
    
    // Загружаем настройки
    loadSettings();
    
    // Первая загрузка данных
    await loadPositions();
    await loadOpportunities();
    updateTime();
    
    // Запускаем автообновление
    startAutoUpdate();
    
    console.log('✅ Web App готов к работе!');
});

// ═══ ОБРАБОТКА ЗАКРЫТИЯ ═══
window.addEventListener('beforeunload', () => {
    if (updateTimer) {
        clearInterval(updateTimer);
    }
});
