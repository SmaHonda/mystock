// 主程式
document.addEventListener('DOMContentLoaded', () => {
    const formStock = document.getElementById('form-stock');
    const formDividend = document.getElementById('form-dividend');
    const formPrice = document.getElementById('form-price');
    const tableStocks = document.getElementById('table-stocks').querySelector('tbody');
    const filterBroker = document.getElementById('filter-broker');
    const modal = document.getElementById('modal-detail');
    const btnExport = document.getElementById('btn-export');
    const fileImport = document.getElementById('file-import');

    let currentStock = null;

    // 格式化金額
    function formatMoney(n) {
        return '$' + Math.round(n).toLocaleString();
    }

    // 格式化百分比
    function formatPercent(n) {
        return n.toFixed(2) + '%';
    }

    // 加上正負 class
    function profitClass(n) {
        return n >= 0 ? 'positive' : 'negative';
    }

    // 更新總覽
    function updateOverview() {
        const data = Storage.getData();
        const calc = Calculator.calcPortfolio(data.stocks);

        document.getElementById('total-cost').textContent = formatMoney(calc.totalCost);
        document.getElementById('total-value').textContent = formatMoney(calc.totalValue);
        document.getElementById('total-dividend').textContent = formatMoney(calc.totalDividend);

        const profitRawEl = document.getElementById('profit-raw');
        profitRawEl.textContent = formatMoney(calc.profitRaw);
        profitRawEl.className = 'stat-value ' + profitClass(calc.profitRaw);

        const profitAdjEl = document.getElementById('profit-adjusted');
        profitAdjEl.textContent = formatMoney(calc.profitAdjusted);
        profitAdjEl.className = 'stat-value ' + profitClass(calc.profitAdjusted);

        const returnEl = document.getElementById('return-rate');
        returnEl.textContent = formatPercent(calc.returnRate);
        returnEl.className = 'stat-value ' + profitClass(calc.returnRate);
    }

    // 更新券商篩選選項
    function updateBrokerFilter() {
        const data = Storage.getData();
        const brokers = [...new Set(data.stocks.map(s => s.broker))];
        
        filterBroker.innerHTML = '<option value="">全部</option>';
        brokers.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b;
            opt.textContent = b;
            filterBroker.appendChild(opt);
        });
    }

    // 渲染持股列表
    function renderStocks() {
        const data = Storage.getData();
        const brokerFilter = filterBroker.value;
        
        let stocks = data.stocks;
        if (brokerFilter) {
            stocks = stocks.filter(s => s.broker === brokerFilter);
        }

        tableStocks.innerHTML = '';
        stocks.forEach(stock => {
            const calc = Calculator.calcStock(stock);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${stock.symbol}</td>
                <td>${stock.name}</td>
                <td>${stock.broker}</td>
                <td>${calc.totalShares.toLocaleString()}</td>
                <td>${calc.avgCostRaw.toFixed(2)}</td>
                <td>${calc.currentPrice.toFixed(2)}</td>
                <td>${formatMoney(calc.marketValue)}</td>
                <td class="${profitClass(calc.profitRaw)}">${formatMoney(calc.profitRaw)}</td>
                <td class="${profitClass(calc.profitAdjusted)}">${formatMoney(calc.profitAdjusted)}</td>
                <td><button class="btn btn-danger btn-delete">刪除</button></td>
            `;
            
            // 點擊整列開啟詳情（除了刪除按鈕）
            tr.addEventListener('click', (e) => {
                if (!e.target.classList.contains('btn-delete')) {
                    openDetail(stock);
                }
            });
            
            // 刪除按鈕
            tr.querySelector('.btn-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`確定刪除 ${stock.name}（${stock.broker}）？`)) {
                    Storage.deleteStock(stock.symbol, stock.broker);
                    refresh();
                }
            });

            tableStocks.appendChild(tr);
        });
    }

    // 開啟個股詳情
    function openDetail(stock) {
        currentStock = stock;
        const calc = Calculator.calcStock(stock);

        document.getElementById('detail-title').textContent = 
            `${stock.symbol} ${stock.name}（${stock.broker}）`;

        document.getElementById('detail-info').innerHTML = `
            <p><strong>總股數：</strong>${calc.totalShares.toLocaleString()} 股</p>
            <p><strong>原始均價：</strong>${calc.avgCostRaw.toFixed(2)}</p>
            <p><strong>降成本均價：</strong>${calc.avgCostAdjusted.toFixed(2)}</p>
            <p><strong>現價：</strong>${calc.currentPrice.toFixed(2)}</p>
            <p><strong>市值：</strong>${formatMoney(calc.marketValue)}</p>
            <p><strong>報酬率：</strong><span class="${profitClass(calc.returnRate)}">${formatPercent(calc.returnRate)}</span></p>
        `;

        // 買入紀錄表
        const purchaseTbody = document.getElementById('table-purchases').querySelector('tbody');
        purchaseTbody.innerHTML = '';
        stock.purchases.forEach((p, i) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${p.date}</td>
                <td>${p.price.toFixed(2)}</td>
                <td>${p.shares.toLocaleString()}</td>
                <td>${formatMoney(p.price * p.shares)}</td>
                <td><button class="btn btn-danger btn-del-purchase" data-idx="${i}">刪</button></td>
            `;
            purchaseTbody.appendChild(tr);
        });
        
        purchaseTbody.querySelectorAll('.btn-del-purchase').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                stock.purchases.splice(idx, 1);
                Storage.upsertStock(stock);
                openDetail(stock);
                refresh();
            });
        });

        // 配股配息紀錄表
        const divTbody = document.getElementById('table-dividends').querySelector('tbody');
        divTbody.innerHTML = '';
        stock.dividends.forEach((d, i) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${d.date}</td>
                <td>${d.cash ? formatMoney(d.cash) : '-'}</td>
                <td>${d.stockShares ? d.stockShares + ' 股' : '-'}</td>
                <td><button class="btn btn-danger btn-del-div" data-idx="${i}">刪</button></td>
            `;
            divTbody.appendChild(tr);
        });
        
        divTbody.querySelectorAll('.btn-del-div').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                stock.dividends.splice(idx, 1);
                Storage.upsertStock(stock);
                openDetail(stock);
                refresh();
            });
        });

        // 配股配息統計
        document.getElementById('sum-cash').textContent = formatMoney(calc.totalCashDividend);
        document.getElementById('sum-stock').textContent = calc.dividendShares + ' 股';
        document.getElementById('cost-reduction').textContent = 
            '$' + calc.costReduction.toFixed(2) + '/股';

        // 現價輸入框
        document.getElementById('current-price').value = stock.currentPrice || '';

        modal.classList.remove('hidden');
    }

    // 關閉 Modal
    document.querySelector('.modal-close').addEventListener('click', () => {
        modal.classList.add('hidden');
        currentStock = null;
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
            currentStock = null;
        }
    });

    // 新增持股
    formStock.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const symbol = document.getElementById('input-symbol').value.trim().toUpperCase();
        const name = document.getElementById('input-name').value.trim();
        const broker = document.getElementById('input-broker').value.trim();
        const price = parseFloat(document.getElementById('input-price').value);
        const shares = parseInt(document.getElementById('input-shares').value);
        const date = document.getElementById('input-date').value;

        let stock = Storage.getStock(symbol, broker);
        
        if (stock) {
            // 已存在，加入買入紀錄
            stock.purchases.push({ date, price, shares });
        } else {
            // 新建
            stock = {
                symbol,
                name,
                broker,
                currentPrice: price,
                purchases: [{ date, price, shares }],
                dividends: []
            };
        }
        
        Storage.upsertStock(stock);
        formStock.reset();
        document.getElementById('input-date').value = new Date().toISOString().slice(0,10);
        refresh();
    });

    // 新增配股配息
    formDividend.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!currentStock) return;

        const date = document.getElementById('div-date').value;
        const cash = parseFloat(document.getElementById('div-cash').value) || 0;
        const stockShares = parseInt(document.getElementById('div-stock').value) || 0;

        if (cash === 0 && stockShares === 0) {
            alert('請至少輸入現金股利或股票股利');
            return;
        }

        currentStock.dividends.push({ date, cash, stockShares });
        Storage.upsertStock(currentStock);
        
        formDividend.reset();
        openDetail(currentStock);
        refresh();
    });

    // 更新現價
    formPrice.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!currentStock) return;

        const price = parseFloat(document.getElementById('current-price').value);
        currentStock.currentPrice = price;
        Storage.upsertStock(currentStock);
        
        openDetail(currentStock);
        refresh();
    });

    // 篩選券商
    filterBroker.addEventListener('change', renderStocks);

    // 匯出備份
    btnExport.addEventListener('click', () => {
        Storage.exportToFile();
    });

    // 匯入備份
    fileImport.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            await Storage.importFromFile(file);
            alert('匯入成功！');
            refresh();
        } catch (err) {
            alert('匯入失敗：' + err.message);
        }
        
        fileImport.value = '';
    });

    // 刷新整個畫面
    function refresh() {
        updateOverview();
        updateBrokerFilter();
        renderStocks();
    }

    // 初始化日期
    document.getElementById('input-date').value = new Date().toISOString().slice(0,10);

    // 啟動
    refresh();
});
