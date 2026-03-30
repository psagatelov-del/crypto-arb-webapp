// ═══════════════════════════════════════════════════════════
// ═══ ПАТЧ v2.13.15 - ИСПРАВЛЕНИЯ DASHBOARD ═══
// ═══════════════════════════════════════════════════════════

// Применить этот патч к app_v3.js (или app_final.js)

// ═══════════════════════════════════════════════════════════
// ═══ ИСПРАВЛЕНИЕ 1: БЕЛАЯ ЛИНИЯ 0% НА ГРАФИКЕ ФАНДИНГА ═══
// ═══════════════════════════════════════════════════════════

// НАЙТИ функцию initPositionCharts или аналогичную где создаётся график фандинга
// ДОБАВИТЬ в options графика:

function initPositionCharts(pos) {
    // ... существующий код ...
    
    // График фандинга
    const ctxFunding = document.getElementById('chartPositionFunding');
    if (ctxFunding) {
        charts.positionFunding = new Chart(ctxFunding, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Фандинг (%)',
                    data: [],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false },
                    // ДОБАВИТЬ: линия аннотации на 0%
                    annotation: {
                        annotations: {
                            line0: {
                                type: 'line',
                                yMin: 0,
                                yMax: 0,
                                borderColor: 'rgba(255, 255, 255, 0.8)',
                                borderWidth: 2,
                                borderDash: [0, 0], // Сплошная линия
                                label: {
                                    enabled: true,
                                    content: '0%',
                                    position: 'end'
                                }
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback: function(value) {
                                return value.toFixed(4) + '%';
                            }
                        }
                    }
                }
            }
        });
    }
}

// ПРИМЕЧАНИЕ: Нужно подключить Chart.js annotation plugin:
// <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@2.2.1"></script>

// ═══════════════════════════════════════════════════════════
// ═══ ИСПРАВЛЕНИЕ 2: ЦЕНА 0 И ФАНДИНГ 0 В ИСТОРИИ ═══
// ═══════════════════════════════════════════════════════════

// НАЙТИ функцию renderHistory
// ДОБАВИТЬ проверку на 0:

function renderHistory() {
    // ... существующий код ...
    
    filteredHistory.forEach(item => {
        const pnlClass = item.pnl_percent >= 0 ? 'positive' : 'negative';
        const pnlSign = item.pnl_percent >= 0 ? '+' : '';
        
        // ИСПРАВЛЕНИЕ: Проверка на 0 значения
        const entryLong = item.entry_price_long || 0;
        const entryShort = item.entry_price_short || 0;
        const exitLong = item.exit_price_long || 0;
        const exitShort = item.exit_price_short || 0;
        
        // Если цены = 0, показываем "Н/Д"
        const displayEntryLong = entryLong > 0 ? formatPrice(entryLong) : 'Н/Д';
        const displayEntryShort = entryShort > 0 ? formatPrice(entryShort) : 'Н/Д';
        const displayExitLong = exitLong > 0 ? formatPrice(exitLong) : 'Н/Д';
        const displayExitShort = exitShort > 0 ? formatPrice(exitShort) : 'Н/Д';
        
        html += `
            <div class="history-item" onclick="showHistoryDetails('${item.id}')">
                ...
                <div class="history-details">
                    💰 P&L: ${pnlSign}$${Math.abs(item.pnl_usd).toFixed(2)}<br>
                    📊 Размер: ${item.size} ${item.symbol.replace('USDT', '')}<br>
                    🟢 LONG: $${displayEntryLong} → $${displayExitLong}<br>
                    🔴 SHORT: $${displayEntryShort} → $${displayExitShort}<br>
                    💸 Фандинг: ${item.funding_profit > 0 ? '+' : ''}${item.funding_profit.toFixed(3)}%<br>
                    💵 Комиссии: -$${item.total_fees ? item.total_fees.toFixed(2) : '0.00'}<br>
                    ⏱️ Длительность: ${item.duration_hours.toFixed(1)} часов
                </div>
                ...
            </div>
        `;
    });
}

// ═══════════════════════════════════════════════════════════
// ═══ ИСПРАВЛЕНИЕ 3: ДОБАВИТЬ КОМИССИИ В ИСТОРИЮ ═══
// ═══════════════════════════════════════════════════════════

// ОБНОВИТЬ структуру history item при сохранении:

async function closePosition(positionId, closeSize) {
    // ... существующий код закрытия ...
    
    // Рассчитываем комиссии
    const fees = calculateTotalFees(
        closeSize,
        pos.current_price_long,
        pos.long_exchange,
        pos.short_exchange
    );
    
    // Создаём запись истории
    const historyItem = {
        id: `trade_${Date.now()}`,
        symbol: pos.symbol,
        strategy: pos.strategy,
        size: closeSize,
        
        // Цены входа
        entry_price_long: pos.entry_price_long,
        entry_price_short: pos.entry_price_short,
        
        // Цены выхода
        exit_price_long: pos.current_price_long,
        exit_price_short: pos.current_price_short,
        
        // P&L
        pnl_percent: pos.pnl_percent,
        pnl_usd: pos.pnl_usd,
        
        // Фандинг
        funding_profit: pos.funding_profit || 0,
        
        // ДОБАВИТЬ: Комиссии
        total_fees: fees.total_usd,
        fees_breakdown: fees.breakdown,
        
        // Биржи
        long_exchange: pos.long_exchange,
        short_exchange: pos.short_exchange,
        
        // Время
        opened_at: pos.opened_at,
        closed_at: new Date().toISOString(),
        duration_hours: (Date.now() - new Date(pos.opened_at).getTime()) / 3600000
    };
    
    // Сохраняем в историю
    state.history.unshift(historyItem);
    localStorage.setItem('trade_history', JSON.stringify(state.history));
}

// Функция расчёта комиссий (если её нет):
function calculateTotalFees(size, price, exchangeLong, exchangeShort) {
    const FEES = {
        'binance': { maker: 0.02, taker: 0.04, withdrawal: 1 },
        'bybit': { maker: 0.01, taker: 0.06, withdrawal: 1 },
        'mexc': { maker: 0.00, taker: 0.05, withdrawal: 1 },
        'kucoin': { maker: 0.02, taker: 0.06, withdrawal: 1 },
        'gate': { maker: 0.02, taker: 0.05, withdrawal: 1 }
    };
    
    const positionValue = size * price;
    const feesLong = FEES[exchangeLong] || FEES['binance'];
    const feesShort = FEES[exchangeShort] || FEES['binance'];
    
    const openLong = positionValue * (feesLong.taker / 100);
    const openShort = positionValue * (feesShort.taker / 100);
    const closeLong = positionValue * (feesLong.maker / 100);
    const closeShort = positionValue * (feesShort.maker / 100);
    const transfer = exchangeLong !== exchangeShort ? 1 : 0;
    
    const totalUsd = openLong + openShort + closeLong + closeShort + transfer;
    
    return {
        total_usd: totalUsd,
        total_percent: (totalUsd / positionValue) * 100,
        breakdown: {
            open_long: openLong,
            open_short: openShort,
            close_long: closeLong,
            close_short: closeShort,
            transfer: transfer
        }
    };
}

// ═══════════════════════════════════════════════════════════
// ═══ ИСПРАВЛЕНИЕ 4: ПРАВИЛЬНЫЙ РАСЧЁТ WIN RATE ═══
// ═══════════════════════════════════════════════════════════

// НАЙТИ функцию calculateHistoryStats
// ИЗМЕНИТЬ расчёт Win Rate:

function calculateHistoryStats() {
    if (state.history.length === 0) {
        state.historyStats = {
            total: 0,
            profit: 0,
            loss: 0,
            winRate: 0,
            avgPnL: 0  // ДОБАВИТЬ: Средний P&L
        };
        return;
    }
    
    const total = state.history.length;
    const profit = state.history.filter(h => h.pnl_percent > 0).length;
    const loss = state.history.filter(h => h.pnl_percent < 0).length;
    
    // ИСПРАВЛЕНИЕ: Win Rate = % прибыльных сделок
    const winRate = (profit / total) * 100;
    
    // ДОБАВИТЬ: Средний P&L в %
    const sumPnl = state.history.reduce((sum, h) => sum + h.pnl_percent, 0);
    const avgPnL = sumPnl / total;
    
    state.historyStats = {
        total,
        profit,
        loss,
        winRate,      // % прибыльных сделок
        avgPnL        // Средний P&L
    };
}

// ОБНОВИТЬ отображение в истории:

function renderHistoryStats() {
    calculateHistoryStats();
    
    const stats = state.historyStats;
    
    document.getElementById('historyStatsTotal').textContent = stats.total;
    document.getElementById('historyStatsProfit').textContent = stats.profit;
    document.getElementById('historyStatsLoss').textContent = stats.loss;
    
    // ИСПРАВЛЕНИЕ: Показываем Win Rate и средний P&L отдельно
    document.getElementById('historyStatsWinRate').textContent = `${stats.winRate.toFixed(1)}%`;
    document.getElementById('historyStatsAvgPnL').textContent = 
        `${stats.avgPnL >= 0 ? '+' : ''}${stats.avgPnL.toFixed(2)}%`;
}

// ДОБАВИТЬ в HTML (index_v3.html):
/*
<div class="history-stats">
    <div class="stat-item">
        <div class="stat-label">Всего сделок</div>
        <div class="stat-value" id="historyStatsTotal">0</div>
    </div>
    <div class="stat-item">
        <div class="stat-label">Прибыльных</div>
        <div class="stat-value positive" id="historyStatsProfit">0</div>
    </div>
    <div class="stat-item">
        <div class="stat-label">Убыточных</div>
        <div class="stat-value negative" id="historyStatsLoss">0</div>
    </div>
    <div class="stat-item">
        <div class="stat-label">Win Rate</div>
        <div class="stat-value" id="historyStatsWinRate">0%</div>
    </div>
    <div class="stat-item">
        <div class="stat-label">Средний P&L</div>
        <div class="stat-value" id="historyStatsAvgPnL">+0.00%</div>
    </div>
</div>
*/

// ═══════════════════════════════════════════════════════════
// ═══ ИСПРАВЛЕНИЕ 5: ИСТОРИЯ НЕ УДАЛЯЕТСЯ ═══
// ═══════════════════════════════════════════════════════════

// НАЙТИ функцию deleteHistoryItem
// УБЕДИТЬСЯ что удаление сохраняется:

async function deleteHistoryItem(itemId) {
    if (!confirm('Удалить эту запись из истории?')) {
        return;
    }
    
    // Удаляем из массива
    state.history = state.history.filter(h => h.id !== itemId);
    
    // ВАЖНО: Сохраняем в localStorage
    localStorage.setItem('trade_history', JSON.stringify(state.history));
    
    // Также отправляем на сервер (если есть API)
    try {
        await fetch(`${API_BASE}/history/${itemId}`, {
            method: 'DELETE'
        });
    } catch (error) {
        console.error('Ошибка удаления на сервере:', error);
    }
    
    // Обновляем отображение
    renderHistory();
    calculateHistoryStats();
    renderHistoryStats();
    
    tg.showAlert('✅ Запись удалена из истории');
}

// ТАКЖЕ: При загрузке истории НЕ перезаписывать из сервера если там старые данные:

async function loadHistory() {
    try {
        // Сначала загружаем из localStorage
        const localHistory = localStorage.getItem('trade_history');
        if (localHistory) {
            state.history = JSON.parse(localHistory);
        }
        
        // Потом загружаем с сервера
        const response = await fetch(`${API_BASE}/history?user_id=${userId}`);
        const data = await response.json();
        
        if (data.history) {
            // ИСПРАВЛЕНИЕ: Объединяем, а не перезаписываем
            // Используем Set для избежания дубликатов
            const localIds = new Set(state.history.map(h => h.id));
            const serverHistory = data.history.filter(h => !localIds.has(h.id));
            
            state.history = [...state.history, ...serverHistory];
            
            // Сохраняем обратно в localStorage
            localStorage.setItem('trade_history', JSON.stringify(state.history));
        }
        
        renderHistory();
        calculateHistoryStats();
        
    } catch (error) {
        console.error('Ошибка загрузки истории:', error);
    }
}

// ═══════════════════════════════════════════════════════════
// ═══ ИСПРАВЛЕНИЕ 6: ЦВЕТ ИКОНКИ РЕДАКТИРОВАНИЯ ═══
// ═══════════════════════════════════════════════════════════

// НАЙТИ в CSS (styles_v3.css):
// ЗАМЕНИТЬ все жёлтые иконки на фиолетовые

/* БЫЛО: */
.edit-icon {
    background: #fbbf24; /* Жёлтый */
    color: white;
}

/* СТАЛО: */
.edit-icon {
    background: #8b5cf6; /* Фиолетовый */
    color: white;
}

/* Или для лилового: */
.edit-icon {
    background: #a78bfa; /* Лиловый */
    color: white;
}

// ТАКЖЕ найти все места с жёлтыми иконками:

/* Иконки информации */
.info-icon,
.warning-icon,
.edit-button {
    background: #8b5cf6 !important; /* Фиолетовый вместо жёлтого */
    color: white;
    border: none;
}

.info-icon:hover,
.edit-button:hover {
    background: #7c3aed !important; /* Тёмно-фиолетовый при наведении */
}

// ═══════════════════════════════════════════════════════════
// ═══ ИСПРАВЛЕНИЕ 7: ОТРИЦАТЕЛЬНЫЙ СПРЕД В АВТОЗАКРЫТИИ ═══
// ═══════════════════════════════════════════════════════════

// НАЙТИ настройки автозакрытия в app.js:

let autoCloseSettings = {
    enabled: false,
    minSpread: 0.05,  // БЫЛО: только положительные
    checkInterval: 1000
};

// ИЗМЕНИТЬ на:

let autoCloseSettings = {
    enabled: false,
    minSpread: 0.05,  // Может быть отрицательным!
    checkInterval: 1000,
    allowNegative: true  // ДОБАВИТЬ: разрешить отрицательные значения
};

// ОБНОВИТЬ проверку в checkAutoClose:

function checkAutoClose() {
    if (!autoCloseSettings.enabled) return;
    
    state.positions.forEach(async (pos) => {
        const avgPrice = (pos.current_price_long + pos.current_price_short) / 2;
        const spread = Math.abs(pos.current_price_long - pos.current_price_short);
        const spreadPercent = (spread / avgPrice) * 100;
        
        // ИСПРАВЛЕНИЕ: Учитываем знак спреда
        let actualSpread = spreadPercent;
        if (pos.current_price_long > pos.current_price_short) {
            actualSpread = -spreadPercent; // Отрицательный спред
        }
        
        // Проверяем условие с учётом отрицательных значений
        const threshold = autoCloseSettings.minSpread;
        
        let shouldClose = false;
        if (threshold >= 0) {
            // Положительный порог: закрываем если спред <= порога
            shouldClose = actualSpread <= threshold;
        } else {
            // Отрицательный порог: закрываем если спред >= порога (ближе к 0)
            shouldClose = actualSpread >= threshold;
        }
        
        if (shouldClose) {
            console.log(`⚡ АВТОЗАКРЫТИЕ ${pos.symbol}: спред ${actualSpread.toFixed(4)}%`);
            await autoClosePosition(pos);
        }
    });
}

// ОБНОВИТЬ UI для ввода отрицательных значений в HTML:

/*
<div class="setting-item">
    <label>Минимальный спред для закрытия (%)</label>
    <input 
        type="number" 
        id="autoCloseMinSpread" 
        value="0.05" 
        step="0.01" 
        min="-5.00"  <!-- ДОБАВИТЬ: разрешить от -5% -->
        max="5.00"
        class="form-input"
    >
    <small>
        Положительное значение: закрывает при схождении<br>
        Отрицательное значение: закрывает при расхождении
    </small>
</div>
*/

// ═══════════════════════════════════════════════════════════
// ═══ КОНЕЦ ПАТЧА ═══
// ═══════════════════════════════════════════════════════════

/*
ИТОГОВЫЙ CHECKLIST:

✅ 1. Белая линия 0% на графике фандинга
✅ 2. Исправлены цены и фандинг = 0 в истории
✅ 3. Добавлена информация о комиссиях в истории
✅ 4. Исправлен Win Rate (% прибыльных), добавлен средний P&L
✅ 5. История не возвращается после удаления
✅ 6. Жёлтые иконки → Фиолетовые
✅ 7. Поддержка отрицательного спреда в автозакрытии

ПРИМЕНИТЬ:
1. Скопировать изменения в app_v3.js (или app_final.js)
2. Обновить styles_v3.css (цвета иконок)
3. Обновить index_v3.html (добавить поле среднего P&L)
4. Подключить chartjs-plugin-annotation для линии 0%
*/
