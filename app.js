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
    history: [],  // История сделок
    stats: {
        positionsCount: 0,
        totalProfit: 0,
        notifications: 0
    },
    historyStats: {
        total: 0,
        profit: 0,
        loss: 0,
        winRate: 0
    },
    selectedOpportunity: null,
    selectedPosition: null,
    selectedHistoryItem: null,
    openPositionMode: false,  // Режим формы открытия
    closePositionMode: false  // Режим формы закрытия
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
    state.closePositionMode = false;  // Сначала показываем детали
    
    renderPositionModal();
    document.getElementById('modalPosition').classList.add('active');
}

// ═══ ФУНКЦИЯ: ОТРИСОВКА МОДАЛЬНОГО ОКНА ПОЗИЦИИ ═══
function renderPositionModal() {
    const pos = state.selectedPosition;
    if (!pos) return;
    
    const pnlClass = pos.pnl_percent >= 0 ? 'positive' : 'negative';
    const pnlSign = pos.pnl_percent >= 0 ? '+' : '';
    
    document.getElementById('posModalTitle').textContent = `📊 ${pos.symbol}`;
    
    const modalBody = document.getElementById('posModalBody');
    
    if (state.closePositionMode) {
        // РЕЖИМ ФОРМЫ ЗАКРЫТИЯ
        modalBody.innerHTML = `
            <div class="form-section">
                <h3>🔴 Закрытие позиции ${pos.symbol}</h3>
                
                <div class="info-box" style="background: ${pnlClass === 'positive' ? '#d1fae5' : '#fee2e2'}; border-left-color: ${pnlClass === 'positive' ? '#10b981' : '#ef4444'};">
                    <strong>💰 Текущий P&L:</strong><br>
                    Процент: <strong>${pnlSign}${pos.pnl_percent.toFixed(2)}%</strong><br>
                    USDT: <strong>${pnlSign}$${Math.abs(pos.pnl_usd).toFixed(2)}</strong>
                </div>
                
                <div class="form-group">
                    <label>📊 Текущие цены:</label>
                    <div class="detail-row">
                        <div class="detail-label">🟢 LONG (${pos.long_exchange.toUpperCase()}):</div>
                        <div class="detail-value">$${pos.current_price_long.toLocaleString()}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">🔴 SHORT (${pos.short_exchange.toUpperCase()}):</div>
                        <div class="detail-value">$${pos.current_price_short.toLocaleString()}</div>
                    </div>
                </div>
                
                <div class="form-group">
                    <label>🔢 Размер закрытия:</label>
                    <select id="inputCloseSize" class="form-input">
                        <option value="100">Закрыть полностью (100%)</option>
                        <option value="50">Закрыть половину (50%)</option>
                        <option value="25">Закрыть четверть (25%)</option>
                        <option value="custom">Указать вручную</option>
                    </select>
                </div>
                
                <div class="form-group" id="customSizeGroup" style="display: none;">
                    <label>💰 Размер (монет):</label>
                    <input type="number" id="inputCustomSize" step="0.001" min="0.001" max="${pos.size}" placeholder="${pos.size}" class="form-input">
                    <small>Максимум: ${pos.size} ${pos.symbol.replace('USDT', '')}</small>
                </div>
                
                <div class="form-group">
                    <label>⚠️ Подтверждение:</label>
                    <div style="background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; padding: 15px; margin-top: 10px;">
                        <input type="checkbox" id="confirmClose" style="width: auto; margin-right: 10px;">
                        <label for="confirmClose" style="display: inline; font-weight: normal;">
                            Я понимаю, что позиция будет закрыта по текущим рыночным ценам
                        </label>
                    </div>
                </div>
                
                <div class="info-box">
                    <strong>ℹ️ Информация о закрытии:</strong><br>
                    📍 Размер позиции: ${pos.size} ${pos.symbol.replace('USDT', '')}<br>
                    📍 Входные цены: LONG $${pos.entry_price_long.toLocaleString()} / SHORT $${pos.entry_price_short.toLocaleString()}<br>
                    📍 Плечо: ${pos.leverage}x<br>
                    ${pnlClass === 'positive' ? '✅ Закрытие с прибылью' : '⚠️ Закрытие с убытком'}
                </div>
            </div>
        `;
        
        // Обработчик для показа/скрытия поля custom size
        document.getElementById('inputCloseSize')?.addEventListener('change', (e) => {
            const customGroup = document.getElementById('customSizeGroup');
            if (e.target.value === 'custom') {
                customGroup.style.display = 'block';
            } else {
                customGroup.style.display = 'none';
            }
        });
        
        // Меняем кнопки
        document.getElementById('posModalFooter').innerHTML = `
            <button class="btn-secondary" onclick="backToPositionDetails()">← Назад</button>
            <button class="btn-danger" onclick="confirmClosePosition()">🔴 Закрыть позицию</button>
        `;
        
    } else {
        // РЕЖИМ ПРОСМОТРА ДЕТАЛЕЙ
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
                <h3>💵 Текущие цены</h3>
                <div class="detail-row">
                    <div class="detail-label">LONG цена:</div>
                    <div class="detail-value">$${pos.current_price_long.toLocaleString()}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">SHORT цена:</div>
                    <div class="detail-value">$${pos.current_price_short.toLocaleString()}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Разница цен:</div>
                    <div class="detail-value">$${Math.abs(pos.current_price_long - pos.current_price_short).toFixed(2)}</div>
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
                <div class="detail-row">
                    <div class="detail-label">Изменение:</div>
                    <div class="detail-value ${pos.current_price_long > pos.entry_price_long ? 'positive' : 'negative'}">
                        ${pos.current_price_long > pos.entry_price_long ? '+' : ''}${((pos.current_price_long - pos.entry_price_long) / pos.entry_price_long * 100).toFixed(2)}%
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
                <div class="detail-row">
                    <div class="detail-label">Изменение:</div>
                    <div class="detail-value ${pos.current_price_short < pos.entry_price_short ? 'positive' : 'negative'}">
                        ${pos.current_price_short < pos.entry_price_short ? '+' : ''}${((pos.entry_price_short - pos.current_price_short) / pos.entry_price_short * 100).toFixed(2)}%
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
        
        // Меняем кнопки
        document.getElementById('posModalFooter').innerHTML = `
            <button class="btn-secondary" onclick="closePositionModal()">Закрыть</button>
            <button class="btn-danger" onclick="closePositionFromModal()">🔴 Закрыть позицию</button>
        `;
    }
}

// ═══ ФУНКЦИЯ: ЗАКРЫТЬ МОДАЛЬНОЕ ОКНО ПОЗИЦИИ ═══
function closePositionModal() {
    document.getElementById('modalPosition').classList.remove('active');
    state.closePositionMode = false;
}

// ═══ ФУНКЦИЯ: ОТКРЫТЬ ФОРМУ ЗАКРЫТИЯ ПОЗИЦИИ ═══
function closePositionFromModal() {
    state.closePositionMode = true;
    renderPositionModal();
}

// ═══ ФУНКЦИЯ: ВЕРНУТЬСЯ К ДЕТАЛЯМ ПОЗИЦИИ ═══
function backToPositionDetails() {
    state.closePositionMode = false;
    renderPositionModal();
}

// ═══ ФУНКЦИЯ: ПОДТВЕРДИТЬ ЗАКРЫТИЕ ПОЗИЦИИ ═══
async function confirmClosePosition() {
    const pos = state.selectedPosition;
    if (!pos) return;
    
    // Проверка подтверждения
    const confirmed = document.getElementById('confirmClose').checked;
    if (!confirmed) {
        tg.showAlert('⚠️ Пожалуйста, подтвердите закрытие позиции!');
        return;
    }
    
    // Получаем размер закрытия
    const closeSizeOption = document.getElementById('inputCloseSize').value;
    let closeSize;
    
    if (closeSizeOption === 'custom') {
        const customSize = parseFloat(document.getElementById('inputCustomSize').value);
        if (!customSize || customSize <= 0 || customSize > pos.size) {
            tg.showAlert('⚠️ Введите корректный размер позиции!');
            return;
        }
        closeSize = customSize;
    } else {
        const percent = parseInt(closeSizeOption);
        closeSize = (pos.size * percent) / 100;
    }
    
    // Формируем данные для отправки
    const closeData = {
        user_id: userId,
        symbol: pos.symbol,
        long_exchange: pos.long_exchange,
        short_exchange: pos.short_exchange,
        close_size: closeSize,
        close_percent: (closeSize / pos.size * 100).toFixed(0),
        current_price_long: pos.current_price_long,
        current_price_short: pos.current_price_short,
        pnl_usd: pos.pnl_usd,
        pnl_percent: pos.pnl_percent
    };
    
    console.log('📤 Закрытие позиции:', closeData);
    
    // TODO: Отправка на API
    // const response = await fetch(`${API_BASE}/positions/close`, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(closeData)
    // });
    
    // Пока просто уведомление
    const closeSizeText = closeSizeOption === '100' ? 'полностью' : 
                         closeSizeOption === '50' ? 'наполовину' : 
                         closeSizeOption === '25' ? 'на четверть' : 
                         `${closeSize} монет`;
    
    tg.showAlert(
        `✅ Позиция закрыта ${closeSizeText}!\n\n` +
        `${pos.symbol}\n` +
        `Размер: ${closeSize.toFixed(4)} из ${pos.size}\n` +
        `P&L: ${pos.pnl_percent >= 0 ? '+' : ''}${pos.pnl_percent.toFixed(2)}%\n` +
        `Прибыль: ${pos.pnl_percent >= 0 ? '+' : ''}$${Math.abs(pos.pnl_usd).toFixed(2)}\n\n` +
        `⚠️ Функция отправки в бота в разработке!`
    );
    
    closePositionModal();
    
    // Обновляем список позиций
    await loadPositions();
}

// ═══ ФУНКЦИЯ: ЗАГРУЗКА ВОЗМОЖНОСТЕЙ ═══
async function loadOpportunities() {
    try {
        const strategy = document.getElementById('filterStrategy')?.value || 'futures_only';
        const strategyParam = strategy === 'all' ? 'futures_only' : strategy;
        
        console.log(`🔍 Загрузка возможностей: стратегия=${strategyParam}, min_profit=${settings.minProfit}%`);
        
        const response = await fetch(`${API_BASE}/opportunities?user_id=${userId}&strategy=${strategyParam}&min_profit=${settings.minProfit}`);
        const data = await response.json();
        
        if (data.opportunities) {
            state.opportunities = data.opportunities;
            const sortBy = document.getElementById('filterSort')?.value || 'net_profit';
            sortOpportunities(sortBy);
            console.log(`✅ Загружено ${state.opportunities.length} возможностей`);
        } else {
            state.opportunities = [];
            console.log(`⚠️ Нет возможностей`);
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

// ═══ ФУНКЦИЯ: ЗАГРУЗКА ИСТОРИИ ═══
async function loadHistory() {
    try {
        // Запрос к API
        const response = await fetch(`${API_BASE}/history?user_id=${userId}`);
        const data = await response.json();
        
        if (data.history) {
            state.history = data.history;
        } else {
            // ДЕМО ДАННЫЕ для примера (с разными датами)
            const now = new Date();
            
            state.history = [
                {
                    id: '1',
                    symbol: 'BTCUSDT',
                    long_exchange: 'bybit',
                    short_exchange: 'binance',
                    entry_price_long: 96500,
                    entry_price_short: 96400,
                    exit_price_long: 96850,
                    exit_price_short: 96840,
                    size: 0.5,
                    leverage: 1,
                    pnl_percent: 2.8,
                    pnl_usd: 142,
                    opened_at: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(), // 6 часов назад
                    closed_at: new Date(now.getTime() - 15 * 60 * 1000).toISOString(), // 15 минут назад
                    duration_hours: 5.75
                },
                {
                    id: '2',
                    symbol: 'ETHUSDT',
                    long_exchange: 'bybit',
                    short_exchange: 'mexc',
                    entry_price_long: 3250,
                    entry_price_short: 3245,
                    exit_price_long: 3210,
                    exit_price_short: 3220,
                    size: 5,
                    leverage: 1,
                    pnl_percent: -1.2,
                    pnl_usd: -45,
                    opened_at: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), // вчера
                    closed_at: new Date(now.getTime() - 18 * 60 * 60 * 1000).toISOString(), // 18 часов назад
                    duration_hours: 6
                },
                {
                    id: '3',
                    symbol: 'SOLUSDT',
                    long_exchange: 'kucoin',
                    short_exchange: 'binance',
                    entry_price_long: 145,
                    entry_price_short: 144.5,
                    exit_price_long: 147.2,
                    exit_price_short: 147,
                    size: 20,
                    leverage: 1,
                    pnl_percent: 1.5,
                    pnl_usd: 58,
                    opened_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 дня назад
                    closed_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 дня назад
                    duration_hours: 24
                },
                {
                    id: '4',
                    symbol: 'BNBUSDT',
                    long_exchange: 'bybit',
                    short_exchange: 'binance',
                    entry_price_long: 610,
                    entry_price_short: 609.5,
                    exit_price_long: 615,
                    exit_price_short: 614.2,
                    size: 3,
                    leverage: 1,
                    pnl_percent: 0.9,
                    pnl_usd: 16.5,
                    opened_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 дней назад
                    closed_at: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000).toISOString(), // 9 дней назад
                    duration_hours: 12
                },
                {
                    id: '5',
                    symbol: 'XRPUSDT',
                    long_exchange: 'kucoin',
                    short_exchange: 'mexc',
                    entry_price_long: 2.15,
                    entry_price_short: 2.14,
                    exit_price_long: 2.08,
                    exit_price_short: 2.09,
                    size: 100,
                    leverage: 1,
                    pnl_percent: -2.8,
                    pnl_usd: -6,
                    opened_at: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000).toISOString(), // 35 дней назад
                    closed_at: new Date(now.getTime() - 32 * 24 * 60 * 60 * 1000).toISOString(), // 32 дня назад
                    duration_hours: 72
                }
            ];
        }
        
        filterAndRenderHistory();
        
    } catch (error) {
        console.error('Ошибка загрузки истории:', error);
        state.history = [];
        renderHistory();
    }
}

// ═══ ФУНКЦИЯ: ФИЛЬТРАЦИЯ И ОТРИСОВКА ИСТОРИИ ═══
function filterAndRenderHistory() {
    const period = document.getElementById('filterPeriod')?.value || 'all';
    const profitFilter = document.getElementById('filterProfit')?.value || 'all';
    
    let filtered = [...state.history];
    
    // Фильтр по периоду
    if (period !== 'all') {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        filtered = filtered.filter(item => {
            const closedDate = new Date(item.closed_at);
            
            switch(period) {
                case 'today':
                    return closedDate >= startOfDay;
                case 'week':
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    return closedDate >= weekAgo;
                case 'month':
                    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    return closedDate >= monthAgo;
                default:
                    return true;
            }
        });
    }
    
    // Фильтр по прибыли/убытку
    if (profitFilter !== 'all') {
        filtered = filtered.filter(item => {
            if (profitFilter === 'profit') {
                return item.pnl_percent >= 0;
            } else {
                return item.pnl_percent < 0;
            }
        });
    }
    
    // Сортировка по дате (новые первые)
    filtered.sort((a, b) => new Date(b.closed_at) - new Date(a.closed_at));
    
    renderHistory(filtered);
    updateHistoryStats(filtered);
}

// ═══ ФУНКЦИЯ: ОТРИСОВКА ИСТОРИИ ═══
function renderHistory(items = state.history) {
    const container = document.getElementById('historyList');
    
    if (items.length === 0) {
        const period = document.getElementById('filterPeriod')?.value || 'all';
        const periodText = {
            'all': 'за всё время',
            'today': 'за сегодня',
            'week': 'за неделю',
            'month': 'за месяц'
        }[period] || 'за выбранный период';
        
        container.innerHTML = `
            <div class="loading">
                <p>Нет сделок ${periodText}</p>
                <p style="font-size: 12px; color: #888; margin-top: 10px;">Попробуйте изменить период или фильтр</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = items.map(item => {
        const pnlClass = item.pnl_percent >= 0 ? 'positive' : 'negative';
        const pnlSign = item.pnl_percent >= 0 ? '+' : '';
        
        const openedDate = new Date(item.opened_at);
        const closedDate = new Date(item.closed_at);
        const dateStr = closedDate.toLocaleDateString('ru-RU', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        });
        const timeStr = closedDate.toLocaleTimeString('ru-RU', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        return `
            <div class="history-card">
                <div class="history-card-header">
                    <div class="history-symbol">${item.symbol}</div>
                    <div class="history-pnl ${pnlClass}">
                        ${pnlSign}${item.pnl_percent.toFixed(2)}%
                    </div>
                </div>
                
                <div class="history-details">
                    💰 P&L: ${pnlSign}$${Math.abs(item.pnl_usd).toFixed(2)}<br>
                    📊 Размер: ${item.size} ${item.symbol.replace('USDT', '')}<br>
                    🟢 LONG (${item.long_exchange.toUpperCase()}): $${item.entry_price_long.toLocaleString()} → $${item.exit_price_long.toLocaleString()}<br>
                    🔴 SHORT (${item.short_exchange.toUpperCase()}): $${item.entry_price_short.toLocaleString()} → $${item.exit_price_short.toLocaleString()}<br>
                    ⏱️ Длительность: ${item.duration_hours.toFixed(1)} часов
                </div>
                
                <div class="history-footer">
                    <div class="history-date">
                        📅 ${dateStr} ${timeStr}
                    </div>
                    <div class="history-actions">
                        <button class="btn-history-view" onclick="showHistoryDetails('${item.id}')">
                            👁️ Детали
                        </button>
                        <button class="btn-history-delete" onclick="confirmDeleteHistory('${item.id}')">
                            🗑️ Удалить
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ═══ ФУНКЦИЯ: ОБНОВЛЕНИЕ СТАТИСТИКИ ИСТОРИИ ═══
function updateHistoryStats(items = state.history) {
    const total = items.length;
    const profitable = items.filter(item => item.pnl_percent >= 0);
    const loss = items.filter(item => item.pnl_percent < 0);
    
    // Win Rate = общий P&L в процентах по всем сделкам
    const totalPnlPercent = items.reduce((sum, item) => sum + item.pnl_percent, 0);
    const winRate = total > 0 ? (totalPnlPercent / total).toFixed(2) : '0.00';
    
    state.historyStats = {
        total: total,
        profit: profitable.length,
        loss: loss.length,
        winRate: winRate
    };
    
    document.getElementById('historyTotal').textContent = total;
    document.getElementById('historyProfit').textContent = profitable.length;
    document.getElementById('historyLoss').textContent = loss.length;
    
    // Цвет Win Rate в зависимости от прибыли/убытка
    const winRateEl = document.getElementById('historyWinRate');
    winRateEl.textContent = `${winRate >= 0 ? '+' : ''}${winRate}%`;
    
    // Меняем цвет родительской карточки
    const winRateCard = winRateEl.closest('.history-stat-card');
    winRateCard.classList.remove('positive', 'negative');
    if (parseFloat(winRate) > 0) {
        winRateCard.classList.add('positive');
    } else if (parseFloat(winRate) < 0) {
        winRateCard.classList.add('negative');
    }
}

// ═══ ФУНКЦИЯ: ПОКАЗАТЬ ДЕТАЛИ СДЕЛКИ ИЗ ИСТОРИИ ═══
function showHistoryDetails(id) {
    const item = state.history.find(h => h.id === id);
    if (!item) return;
    
    state.selectedHistoryItem = item;
    
    const pnlClass = item.pnl_percent >= 0 ? 'positive' : 'negative';
    const pnlSign = item.pnl_percent >= 0 ? '+' : '';
    
    const openedDate = new Date(item.opened_at);
    const closedDate = new Date(item.closed_at);
    
    document.getElementById('oppModalTitle').textContent = `📜 ${item.symbol} (История)`;
    
    const modalBody = document.getElementById('oppModalBody');
    modalBody.innerHTML = `
        <div class="detail-section">
            <h3>💰 Результат</h3>
            <div class="detail-row">
                <div class="detail-label">P&L процент:</div>
                <div class="detail-value ${pnlClass}" id="historyPnlPercent">${pnlSign}${item.pnl_percent.toFixed(2)}%</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">P&L USDT:</div>
                <div class="detail-value ${pnlClass}" id="historyPnlUsd">${pnlSign}$${Math.abs(item.pnl_usd).toFixed(2)}</div>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>🟢 LONG (${item.long_exchange.toUpperCase()})</h3>
            <div class="form-group">
                <label>Входная цена (нажмите для редактирования):</label>
                <input type="number" 
                       id="editEntryLong" 
                       class="form-input" 
                       value="${item.entry_price_long}" 
                       step="0.01"
                       onchange="recalculateHistoryPnL()">
            </div>
            <div class="form-group">
                <label>Выходная цена (нажмите для редактирования):</label>
                <input type="number" 
                       id="editExitLong" 
                       class="form-input" 
                       value="${item.exit_price_long}" 
                       step="0.01"
                       onchange="recalculateHistoryPnL()">
            </div>
            <div class="detail-row">
                <div class="detail-label">Изменение:</div>
                <div class="detail-value ${item.exit_price_long > item.entry_price_long ? 'positive' : 'negative'}" id="changeLong">
                    ${((item.exit_price_long - item.entry_price_long) / item.entry_price_long * 100).toFixed(2)}%
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>🔴 SHORT (${item.short_exchange.toUpperCase()})</h3>
            <div class="form-group">
                <label>Входная цена (нажмите для редактирования):</label>
                <input type="number" 
                       id="editEntryShort" 
                       class="form-input" 
                       value="${item.entry_price_short}" 
                       step="0.01"
                       onchange="recalculateHistoryPnL()">
            </div>
            <div class="form-group">
                <label>Выходная цена (нажмите для редактирования):</label>
                <input type="number" 
                       id="editExitShort" 
                       class="form-input" 
                       value="${item.exit_price_short}" 
                       step="0.01"
                       onchange="recalculateHistoryPnL()">
            </div>
            <div class="detail-row">
                <div class="detail-label">Изменение:</div>
                <div class="detail-value ${item.exit_price_short < item.entry_price_short ? 'positive' : 'negative'}" id="changeShort">
                    ${((item.entry_price_short - item.exit_price_short) / item.entry_price_short * 100).toFixed(2)}%
                </div>
            </div>
        </div>
        
        <div class="detail-section">
            <h3>📋 Информация</h3>
            <div class="detail-row">
                <div class="detail-label">Размер:</div>
                <div class="detail-value">${item.size} ${item.symbol.replace('USDT', '')}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Плечо:</div>
                <div class="detail-value">${item.leverage}x</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Открыта:</div>
                <div class="detail-value">${openedDate.toLocaleString('ru-RU')}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Закрыта:</div>
                <div class="detail-value">${closedDate.toLocaleString('ru-RU')}</div>
            </div>
            <div class="detail-row">
                <div class="detail-label">Длительность:</div>
                <div class="detail-value">${item.duration_hours.toFixed(1)} часов</div>
            </div>
        </div>
        
        <div class="info-box" style="background: #fff3cd; border-left-color: #ffc107;">
            <strong>ℹ️ Редактирование цен</strong><br>
            Измените цены выше если они отличаются от реальных данных.<br>
            P&L автоматически пересчитается при изменении.
        </div>
    `;
    
    document.getElementById('oppModalFooter').innerHTML = `
        <button class="btn-secondary" onclick="closeOpportunityModal()">Закрыть</button>
        <button class="btn-primary" onclick="saveHistoryEdits()">💾 Сохранить</button>
    `;
    
    document.getElementById('modalOpportunity').classList.add('active');
}

// ═══ ФУНКЦИЯ: ПЕРЕСЧЁТ P&L ПРИ РЕДАКТИРОВАНИИ ═══
function recalculateHistoryPnL() {
    const item = state.selectedHistoryItem;
    if (!item) return;
    
    // Получаем новые цены
    const entryLong = parseFloat(document.getElementById('editEntryLong').value);
    const exitLong = parseFloat(document.getElementById('editExitLong').value);
    const entryShort = parseFloat(document.getElementById('editEntryShort').value);
    const exitShort = parseFloat(document.getElementById('editExitShort').value);
    
    // Пересчитываем изменения
    const changeLongPercent = ((exitLong - entryLong) / entryLong * 100);
    const changeShortPercent = ((entryShort - exitShort) / entryShort * 100);
    
    // Обновляем изменения
    const changeLongEl = document.getElementById('changeLong');
    changeLongEl.textContent = `${changeLongPercent.toFixed(2)}%`;
    changeLongEl.className = `detail-value ${changeLongPercent >= 0 ? 'positive' : 'negative'}`;
    
    const changeShortEl = document.getElementById('changeShort');
    changeShortEl.textContent = `${changeShortPercent.toFixed(2)}%`;
    changeShortEl.className = `detail-value ${changeShortPercent >= 0 ? 'positive' : 'negative'}`;
    
    // Пересчитываем общий P&L
    // LONG: (exitLong - entryLong) * size
    // SHORT: (entryShort - exitShort) * size
    const longPnl = (exitLong - entryLong) * item.size;
    const shortPnl = (entryShort - exitShort) * item.size;
    const totalPnl = longPnl + shortPnl;
    
    // Средняя цена входа
    const avgEntry = (entryLong + entryShort) / 2;
    const pnlPercent = (totalPnl / (avgEntry * item.size)) * 100;
    
    // Обновляем P&L
    const pnlPercentEl = document.getElementById('historyPnlPercent');
    pnlPercentEl.textContent = `${pnlPercent >= 0 ? '+' : ''}${pnlPercent.toFixed(2)}%`;
    pnlPercentEl.className = `detail-value ${pnlPercent >= 0 ? 'positive' : 'negative'}`;
    
    const pnlUsdEl = document.getElementById('historyPnlUsd');
    pnlUsdEl.textContent = `${totalPnl >= 0 ? '+' : ''}$${Math.abs(totalPnl).toFixed(2)}`;
    pnlUsdEl.className = `detail-value ${totalPnl >= 0 ? 'positive' : 'negative'}`;
}

// ═══ ФУНКЦИЯ: СОХРАНИТЬ ИЗМЕНЕНИЯ ИСТОРИИ ═══
async function saveHistoryEdits() {
    const item = state.selectedHistoryItem;
    if (!item) return;
    
    // Получаем новые цены
    const entryLong = parseFloat(document.getElementById('editEntryLong').value);
    const exitLong = parseFloat(document.getElementById('editExitLong').value);
    const entryShort = parseFloat(document.getElementById('editEntryShort').value);
    const exitShort = parseFloat(document.getElementById('editExitShort').value);
    
    // Валидация
    if (!entryLong || !exitLong || !entryShort || !exitShort) {
        tg.showAlert('⚠️ Все цены должны быть заполнены!');
        return;
    }
    
    if (entryLong <= 0 || exitLong <= 0 || entryShort <= 0 || exitShort <= 0) {
        tg.showAlert('⚠️ Цены должны быть больше нуля!');
        return;
    }
    
    // Пересчитываем P&L
    const longPnl = (exitLong - entryLong) * item.size;
    const shortPnl = (entryShort - exitShort) * item.size;
    const totalPnl = longPnl + shortPnl;
    const avgEntry = (entryLong + entryShort) / 2;
    const pnlPercent = (totalPnl / (avgEntry * item.size)) * 100;
    
    // Обновляем в state
    const historyItem = state.history.find(h => h.id === item.id);
    if (historyItem) {
        historyItem.entry_price_long = entryLong;
        historyItem.exit_price_long = exitLong;
        historyItem.entry_price_short = entryShort;
        historyItem.exit_price_short = exitShort;
        historyItem.pnl_usd = totalPnl;
        historyItem.pnl_percent = pnlPercent;
    }
    
    // TODO: Отправка на API
    // await fetch(`${API_BASE}/history/${item.id}`, {
    //     method: 'PUT',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({
    //         entry_price_long: entryLong,
    //         exit_price_long: exitLong,
    //         entry_price_short: entryShort,
    //         exit_price_short: exitShort
    //     })
    // });
    
    tg.showAlert('✅ Изменения сохранены!');
    
    // Закрываем модальное окно
    closeOpportunityModal();
    
    // Обновляем список
    filterAndRenderHistory();
    
    console.log('💾 Сохранены изменения истории:', {
        id: item.id,
        entry_long: entryLong,
        exit_long: exitLong,
        entry_short: entryShort,
        exit_short: exitShort,
        pnl: totalPnl,
        pnl_percent: pnlPercent
    });
}

// ═══ ФУНКЦИЯ: ПОДТВЕРЖДЕНИЕ УДАЛЕНИЯ ИЗ ИСТОРИИ ═══
function confirmDeleteHistory(id) {
    const item = state.history.find(h => h.id === id);
    if (!item) return;
    
    if (confirm(`Удалить сделку ${item.symbol} из истории?\n\nP&L: ${item.pnl_percent >= 0 ? '+' : ''}${item.pnl_percent.toFixed(2)}%\n\nЭто действие нельзя отменить!`)) {
        deleteHistoryItem(id);
    }
}

// ═══ ФУНКЦИЯ: УДАЛЕНИЕ ИЗ ИСТОРИИ ═══
async function deleteHistoryItem(id) {
    try {
        // TODO: Отправка на API
        // const response = await fetch(`${API_BASE}/history/${id}`, {
        //     method: 'DELETE'
        // });
        
        // Удаляем локально
        state.history = state.history.filter(h => h.id !== id);
        
        // Перерисовываем
        filterAndRenderHistory();
        
        tg.showAlert('✅ Сделка удалена из истории');
        
        console.log('🗑️ Удалена сделка из истории:', id);
        
    } catch (error) {
        console.error('Ошибка удаления из истории:', error);
        tg.showAlert('❌ Ошибка при удалении');
    }
}

// ═══ ОБРАБОТЧИКИ ФИЛЬТРОВ ИСТОРИИ ═══
document.getElementById('filterPeriod')?.addEventListener('change', () => {
    filterAndRenderHistory();
});

document.getElementById('filterProfit')?.addEventListener('change', () => {
    filterAndRenderHistory();
});

// ═══ ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ ═══
window.addEventListener('load', async () => {
    console.log('📱 Инициализация Web App...');
    
    loadSettings();
    
    await loadPositions();
    await loadOpportunities();
    await loadHistory();  // Загружаем историю
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
