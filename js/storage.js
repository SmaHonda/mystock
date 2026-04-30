// LocalStorage 操作模組
const Storage = {
    KEY: 'stock_portfolio_data',

    // 取得所有資料
    getData() {
        const raw = localStorage.getItem(this.KEY);
        if (!raw) {
            return { stocks: [], lastUpdated: null };
        }
        return JSON.parse(raw);
    },

    // 儲存所有資料
    saveData(data) {
        data.lastUpdated = new Date().toISOString();
        localStorage.setItem(this.KEY, JSON.stringify(data));
    },

    // 匯出 JSON 檔案
    exportToFile() {
        const data = this.getData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stock_portfolio_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },

    // 從 JSON 檔案匯入
    importFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (data.stocks && Array.isArray(data.stocks)) {
                        this.saveData(data);
                        resolve(data);
                    } else {
                        reject(new Error('無效的備份檔案格式'));
                    }
                } catch (err) {
                    reject(new Error('檔案解析失敗'));
                }
            };
            reader.onerror = () => reject(new Error('檔案讀取失敗'));
            reader.readAsText(file);
        });
    },

    // 新增或更新股票
    upsertStock(stock) {
        const data = this.getData();
        const idx = data.stocks.findIndex(s => 
            s.symbol === stock.symbol && s.broker === stock.broker
        );
        if (idx >= 0) {
            data.stocks[idx] = stock;
        } else {
            data.stocks.push(stock);
        }
        this.saveData(data);
    },

    // 刪除股票
    deleteStock(symbol, broker) {
        const data = this.getData();
        data.stocks = data.stocks.filter(s => 
            !(s.symbol === symbol && s.broker === broker)
        );
        this.saveData(data);
    },

    // 取得單一股票
    getStock(symbol, broker) {
        const data = this.getData();
        return data.stocks.find(s => 
            s.symbol === symbol && s.broker === broker
        );
    }
};
