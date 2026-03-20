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
    },
    selectedOpportunity: null,
    selectedPosition: null,
    openPositionMode: false  // Режим формы открытия
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
        const response = await fetch(`${API_BASE}/positions?user_id=${userId}`);
        const data = await response.json();
        
        if (data.positions) {
            state.positions = data.positions;
        } else {
            state.positions = [];
        }
        
        renderPositions();
        updateStats();
        
    } catch (error) {
        console.error('Ошибка загрузки позиций:', error);
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
    
    container.innerHTML = state.positions.map((pos, index) => {
        const pnlClass = pos.pnl_percent >= 0 ? 'positive' : 'negative';
        const pnlSign = pos.pnl_percent >= 0 ? '+' : '';
        
        return `
            <div class="position-card" onclick="showPositionDetails(${index})">
                <div class="position-header">
                    <div class="position-symbol">${pos.symbol}</div>
                    <div class="position-pnl ${pnlClass}">
                        ${pnlSign}${pos.pnl_percent.toFixed(2)}%
                    </div>
                </div>
                
                <div class="position-details">
                    🟢 LONG (${pos.long_exchange.toUpperCase()}): $${pos.current_price_long.toLocaleString()}<br>
                    🔴 SHORT (${pos.short_exchange.toUpperCase()}): $${pos.current_price_short.toLocaleString()}<br>
                    💰 P&L: ${pnlSign}$${Math.abs(pos.pnl_usd)}
                </div>
                
                <div class="position-progress">
                    <div class="position-progress-bar" style="width: ${pos.target_progress}%"></div>
                </div>
            </div>
        `;
    }).join('');
}

// ═══ ФУНКЦИЯ: ПОКАЗАТЬ ДЕТАЛИ ПОЗИЦИИ ═══
function showPositionDetails(index) {
    const pos = state.positions[index];
    state.selectedPosition = pos;
    
    const pnlClass = pos.pnl_percent >= 0 ? 'positive' : 'negative';
    const pnlSign = pos.pnl_percent >= 0 ? '+' : '';
    
    document.getElementById('posModalTitle').textContent = `📊 ${pos.symbol}`;
    
    const modalBody = document.getElementById('posModalBody');
    modalBody.innerHTML = `
        <div class="detail-section">
            <h3>💰 Прибыль/Убыток</h3>
            <div class="detail-row">
                <div class="detail-label">P&L процент:</div>
                <div class="detail-value ${pnlClass}">${pnlSign}${pos.pnl_percent.toFixed(2)}%</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">P&L USDT:</div>
                <div class="detail-value ${pnlClass}">${pnlSign}$${Math.abs(pos.pnl_usd).toFixed(2)}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Прогресс до цели:</div>
                <div class="detail-value">${pos.target_progress.toFixed(0)}%</div>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>🟢 LONG Позиция</h3>
            <div class="detail-row">
                <div class="detail-label">Биржа:</div>
                <div class="detail-value">${pos.long_exchange.toUpperCase()}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Входная цена:</div>
                <div class="detail-value">$${pos.entry_price_long.toLocaleString()}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Текущая цена:</div>
                <div class="detail-value ${pos.current_price_long > pos.entry_price_long ? 'positive' : 'negative'}">
                    $${pos.current_price_long.toLocaleString()}
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>🔴 SHORT Позиция</h3>
            <div class="detail-row">
                <div class="detail-label">Биржа:</div>
                <div class="detail-value">${pos.short_exchange.toUpperCase()}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Входная цена:</div>
                <div class="detail-value">$${pos.entry_price_short.toLocaleString()}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Текущая цена:</div>
                <div class="detail-value ${pos.current_price_short < pos.entry_price_short ? 'positive' : 'negative'}">
                    $${pos.current_price_short.toLocaleString()}
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>📋 Информация</h3>
            <div class="detail-row">
                <div class="detail-label">Размер позиции:</div>
                <div class="detail-value">${pos.size} ${pos.symbol.replace('USDT', '')}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Плечо:</div>
                <div class="detail-value">${pos.leverage}x</div>
            </div>
        </div>
    `;
    
    document.getElementById('modalPosition').classList.add('active');
}

// ═══ ФУНКЦИЯ: ЗАКРЫТЬ МОДАЛЬНОЕ ОКНО ПОЗИЦИИ ═══
function closePositionModal() {
    document.getElementById('modalPosition').classList.remove('active');
}

// ═══ ФУНКЦИЯ: ЗАКРЫТЬ ПОЗИЦИЮ ИЗ МОДАЛЬНОГО ОКНА ═══
function closePositionFromModal() {
    if (!state.selectedPosition) return;
    
    tg.showAlert(`🔴 Закрытие позиции ${state.selectedPosition.symbol}\n\n⚠️ Эта функция в разработке!`);
    closePositionModal();
}

// ═══ ФУНКЦИЯ: ЗАГРУЗКА ВОЗМОЖНОСТЕЙ ═══
async function loadOpportunities() {
    try {
        const strategy = document.getElementById('filterStrategy')?.value || 'futures_only';
        const strategyParam = strategy === 'all' ? 'futures_only' : strategy;
        
        const response = await fetch(`${API_BASE}/opportunities?user_id=${userId}&strategy=${strategyParam}&min_profit=${settings.minProfit}`);
        const data = await response.json();
        
        if (data.opportunities) {
            state.opportunities = data.opportunities;
            const sortBy = document.getElementById('filterSort')?.value || 'net_profit';
            sortOpportunities(sortBy);
        } else {
            state.opportunities = [];
        }
        
        renderOpportunities();
        updateStats();
        
    } catch (error) {
        console.error('Ошибка загрузки возможностей:', error);
        state.opportunities = [];
        renderOpportunities();
    }
}

// ═══ ФУНКЦИЯ: СОРТИРОВКА ВОЗМОЖНОСТЕЙ ═══
function sortOpportunities(sortBy) {
    switch(sortBy) {
        case 'net_profit':
            state.opportunities.sort((a, b) => (b.net_profit || 0) - (a.net_profit || 0));
            break;
        case 'funding_profit':
            state.opportunities.sort((a, b) => (b.funding_profit || 0) - (a.funding_profit || 0));
            break;
        case 'spread':
            state.opportunities.sort((a, b) => Math.abs(b.spread || 0) - Math.abs(a.spread || 0));
            break;
    }
}

// ═══ ФУНКЦИЯ: ОТРИСОВКА ВОЗМОЖНОСТЕЙ ═══
function renderOpportunities() {
    const container = document.getElementById('opportunitiesList');
    
    if (state.opportunities.length === 0) {
        container.innerHTML = `
            <div class="loading">
                <p>Нет возможностей с прибылью ≥${settings.minProfit}%</p>
                <p style="font-size: 12px; color: #888; margin-top: 10px;">Попробуйте изменить фильтры или нажмите "Сканировать"</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = state.opportunities.map((opp, index) => {
        const longEx = opp.long_exchange || opp.spot_exchange || 'N/A';
        const shortEx = opp.short_exchange || opp.futures_exchange || 'N/A';
        
        return `
            <div class="opportunity-card" onclick="showOpportunityDetails(${index})">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div class="opportunity-info">
                        <div class="opportunity-symbol">${opp.symbol}</div>
                        <div class="opportunity-exchanges">
                            🟢${longEx.toUpperCase()} / 🔴${shortEx.toUpperCase()}
                        </div>
                    </div>
                    <div class="opportunity-profit">
                        +${opp.net_profit.toFixed(1)}%
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ═══ ФУНКЦИЯ: ПОКАЗАТЬ ДЕТАЛИ ВОЗМОЖНОСТИ ═══
function showOpportunityDetails(index) {
    const opp = state.opportunities[index];
    state.selectedOpportunity = opp;
    state.openPositionMode = false;  // Сначала показываем детали
    
    renderOpportunityModal();
    document.getElementById('modalOpportunity').classList.add('active');
}

// ═══ ФУНКЦИЯ: ОТРИСОВКА МОДАЛЬНОГО ОКНА ВОЗМОЖНОСТИ ═══
function renderOpportunityModal() {
    const opp = state.selectedOpportunity;
    if (!opp) return;
    
    const longEx = opp.long_exchange || opp.spot_exchange || 'N/A';
    const shortEx = opp.short_exchange || opp.futures_exchange || 'N/A';
    
    document.getElementById('oppModalTitle').textContent = `📊 ${opp.symbol}`;
    
    const modalBody = document.getElementById('oppModalBody');
    
    if (state.openPositionMode) {
        // РЕЖИМ ФОРМЫ ОТКРЫТИЯ
        modalBody.innerHTML = `
            <div class="form-section">
                <h3>📈 Открытие позиции ${opp.symbol}</h3>
                
                <div class="form-group">
                    <label>💰 Размер позиции (монет):</label>
                    <input type="number" id="inputSize" step="0.001" min="0.001" placeholder="0.01" class="form-input">
                    <small>Введите количество монет ${opp.symbol.replace('USDT', '')}</small>
                </div>
                
                <div class="form-group">
                    <label>⚡ Плечо (leverage):</label>
                    <input type="number" id="inputLeverage" value="1" min="1" max="10" class="form-input">
                    <small>Рекомендуется: 1x (без плеча)</small>
                </div>
                
                <div class="form-group">
                    <label>🎯 Цель LONG (опционально):</label>
                    <input type="number" id="inputTargetLong" step="0.01" placeholder="${(opp.long_price * 1.02).toFixed(2)}" class="form-input">
                    <small>Текущая цена: $${opp.long_price.toLocaleString()}</small>
                </div>
                
                <div class="form-group">
                    <label>🛑 Стоп LONG (опционально):</label>
                    <input type="number" id="inputStopLong" step="0.01" placeholder="${(opp.long_price * 0.98).toFixed(2)}" class="form-input">
                </div>
                
                <div class="form-group">
                    <label>🎯 Цель SHORT (опционально):</label>
                    <input type="number" id="inputTargetShort" step="0.01" placeholder="${(opp.short_price * 0.98).toFixed(2)}" class="form-input">
                    <small>Текущая цена: $${opp.short_price.toLocaleString()}</small>
                </div>
                
                <div class="form-group">
                    <label>🛑 Стоп SHORT (опционально):</label>
                    <input type="number" id="inputStopShort" step="0.01" placeholder="${(opp.short_price * 1.02).toFixed(2)}" class="form-input">
                </div>
                
                <div class="info-box">
                    <strong>ℹ️ Информация:</strong><br>
                    🟢 LONG на ${longEx.toUpperCase()}: $${opp.long_price.toLocaleString()}<br>
                    🔴 SHORT на ${shortEx.toUpperCase()}: $${opp.short_price.toLocaleString()}<br>
                    💰 Ожидаемая прибыль: +${opp.net_profit.toFixed(2)}%
                </div>
            </div>
        `;
        
        // Меняем кнопки
        document.getElementById('oppModalFooter').innerHTML = `
            <button class="btn-secondary" onclick="backToOpportunityDetails()">← Назад</button>
            <button class="btn-primary" onclick="confirmOpenPosition()">✅ Открыть</button>
        `;
        
    } else {
        // РЕЖИМ ПРОСМОТРА ДЕТАЛЕЙ
        modalBody.innerHTML = `
            <div class="detail-section">
                <h3>💰 Прибыль</h3>
                <div class="detail-row">
                    <div class="detail-label">Чистая прибыль:</div>
                    <div class="detail-value positive">+${opp.net_profit.toFixed(2)}%</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Прибыль фандинг:</div>
                    <div class="detail-value positive">+${(opp.funding_profit || 0).toFixed(2)}%</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Спред:</div>
                    <div class="detail-value">${(opp.spread || 0).toFixed(2)}%</div>
                </div>
            </div>
            
            <div class="detail-section">
                <h3>💵 Текущие цены</h3>
                <div class="detail-row">
                    <div class="detail-label">LONG цена:</div>
                    <div class="detail-value">$${(opp.long_price || 0).toLocaleString()}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">SHORT цена:</div>
                    <div class="detail-value">$${(opp.short_price || 0).toLocaleString()}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Разница цен:</div>
                    <div class="detail-value">$${Math.abs((opp.long_price || 0) - (opp.short_price || 0)).toFixed(2)}</div>
                </div>
            </div>
            
            <div class="detail-section">
                <h3>🟢 LONG (${longEx.toUpperCase()})</h3>
                <div class="detail-row">
                    <div class="detail-label">Цена:</div>
                    <div class="detail-value">$${(opp.long_price || 0).toLocaleString()}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Фандинг:</div>
                    <div class="detail-value">${(opp.long_funding || 0).toFixed(4)}%</div>
                </div>
            </div>
            
            <div class="detail-section">
                <h3>🔴 SHORT (${shortEx.toUpperCase()})</h3>
                <div class="detail-row">
                    <div class="detail-label">Цена:</div>
                    <div class="detail-value">$${(opp.short_price || 0).toLocaleString()}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Фандинг:</div>
                    <div class="detail-value">${(opp.short_funding || 0).toFixed(4)}%</div>
                </div>
            </div>
            
            <div class="detail-section">
                <h3>📊 Данные</h3>
                <div class="detail-row">
                    <div class="detail-label">Объём 24ч:</div>
                    <div class="detail-value">$${(opp.volume || 0).toLocaleString()}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Стратегия:</div>
                    <div class="detail-value">${opp.strategy === 'futures_only' ? 'Futures-Futures' : opp.strategy}</div>
                </div>
            </div>
        `;
        
        // Меняем кнопки
        document.getElementById('oppModalFooter').innerHTML = `
            <button class="btn-secondary" onclick="closeOpportunityModal()">Закрыть</button>
            <button class="btn-primary" onclick="openPositionFromModal()">📈 Открыть позицию</button>
        `;
    }
}

// ═══ ФУНКЦИЯ: ЗАКРЫТЬ МОДАЛЬНОЕ ОКНО ВОЗМОЖНОСТИ ═══
function closeOpportunityModal() {
    document.getElementById('modalOpportunity').classList.remove('active');
    state.openPositionMode = false;
}

// ═══ ФУНКЦИЯ: ОТКРЫТЬ ФОРМУ ПОЗИЦИИ ═══
function openPositionFromModal() {
    state.openPositionMode = true;
    renderOpportunityModal();
}

// ═══ ФУНКЦИЯ: ВЕРНУТЬСЯ К ДЕТАЛЯМ ═══
function backToOpportunityDetails() {
    state.openPositionMode = false;
    renderOpportunityModal();
}

// ═══ ФУНКЦИЯ: ПОДТВЕРДИТЬ ОТКРЫТИЕ ПОЗИЦИИ ═══
async function confirmOpenPosition() {
    const opp = state.selectedOpportunity;
    if (!opp) return;
    
    // Собираем данные из формы
    const size = parseFloat(document.getElementById('inputSize').value);
    const leverage = parseInt(document.getElementById('inputLeverage').value);
    const targetLong = document.getElementById('inputTargetLong').value;
    const stopLong = document.getElementById('inputStopLong').value;
    const targetShort = document.getElementById('inputTargetShort').value;
    const stopShort = document.getElementById('inputStopShort').value;
    
    // Валидация
    if (!size || size <= 0) {
        tg.showAlert('⚠️ Введите размер позиции!');
        return;
    }
    
    if (!leverage || leverage < 1) {
        tg.showAlert('⚠️ Плечо должно быть минимум 1x!');
        return;
    }
    
    // Формируем данные для отправки
    const positionData = {
        user_id: userId,
        symbol: opp.symbol,
        long_exchange: opp.long_exchange || opp.spot_exchange,
        short_exchange: opp.short_exchange || opp.futures_exchange,
        size: size,
        leverage: leverage,
        target_long: targetLong || null,
        stop_long: stopLong || null,
        target_short: targetShort || null,
        stop_short: stopShort || null,
        long_price: opp.long_price,
        short_price: opp.short_price
    };
    
    console.log('📤 Отправка позиции:', positionData);
    
    // TODO: Отправка на API
    // const response = await fetch(`${API_BASE}/positions/open`, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(positionData)
    // });
    
    // Пока просто уведомление
    tg.showAlert(
        `✅ Позиция открыта!\n\n` +
        `${opp.symbol}\n` +
        `Размер: ${size} монет\n` +
        `Плечо: ${leverage}x\n` +
        `Прибыль: +${opp.net_profit.toFixed(2)}%\n\n` +
        `⚠️ Функция отправки в бота в разработке!`
    );
    
    closeOpportunityModal();
}

// ═══ ФУНКЦИЯ: ОБНОВЛЕНИЕ СТАТИСТИКИ ═══
function updateStats() {
    const totalProfit = state.positions.reduce((sum, pos) => sum + pos.pnl_percent, 0);
    
    state.stats = {
        positionsCount: state.positions.length,
        totalProfit: totalProfit,
        notifications: state.opportunities.length
    };
    
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
    if (updateTimer) {
        clearInterval(updateTimer);
    }
    
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
    startAutoUpdate();
});

document.getElementById('minProfit').addEventListener('change', (e) => {
    settings.minProfit = parseFloat(e.target.value);
    loadOpportunities();
});

document.getElementById('darkMode').addEventListener('change', (e) => {
    settings.darkMode = e.target.checked;
    document.body.classList.toggle('dark-mode', settings.darkMode);
});

document.getElementById('saveSettings').addEventListener('click', () => {
    localStorage.setItem('settings', JSON.stringify(settings));
    tg.showAlert('✅ Настройки сохранены!');
    console.log('💾 Настройки сохранены:', settings);
});

// ═══ ОБРАБОТЧИКИ ФИЛЬТРОВ И СКАНИРОВАНИЯ ═══
document.getElementById('btnScan')?.addEventListener('click', async () => {
    const btn = document.getElementById('btnScan');
    const originalText = btn.textContent;
    
    btn.textContent = '⏳ Сканирование...';
    btn.classList.add('loading');
    
    await loadOpportunities();
    
    btn.textContent = originalText;
    btn.classList.remove('loading');
    
    if (state.opportunities.length > 0) {
        tg.showAlert(`✅ Найдено ${state.opportunities.length} возможностей!`);
    } else {
        tg.showAlert(`⚠️ Возможностей не найдено.\n\nПопробуйте снизить минимум прибыли в настройках.`);
    }
});

document.getElementById('filterStrategy')?.addEventListener('change', () => {
    loadOpportunities();
});

document.getElementById('filterSort')?.addEventListener('change', () => {
    const sortBy = document.getElementById('filterSort').value;
    sortOpportunities(sortBy);
    renderOpportunities();
});

// ═══ ЗАГРУЗКА НАСТРОЕК ИЗ localStorage ═══
function loadSettings() {
    const saved = localStorage.getItem('settings');
    if (saved) {
        settings = { ...settings, ...JSON.parse(saved) };
        
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
    
    loadSettings();
    
    await loadPositions();
    await loadOpportunities();
    updateTime();
    
    startAutoUpdate();
    
    console.log('✅ Web App готов к работе!');
});

// ═══ ОБРАБОТКА ЗАКРЫТИЯ ═══
window.addEventListener('beforeunload', () => {
    if (updateTimer) {
        clearInterval(updateTimer);
    }
});

// ═══ ЗАКРЫТИЕ МОДАЛЬНЫХ ОКОН ПРИ КЛИКЕ ВНЕ ═══
document.getElementById('modalOpportunity')?.addEventListener('click', (e) => {
    if (e.target.id === 'modalOpportunity') {
        closeOpportunityModal();
    }
});

document.getElementById('modalPosition')?.addEventListener('click', (e) => {
    if (e.target.id === 'modalPosition') {
        closePositionModal();
    }
});
