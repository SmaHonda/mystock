// 損益計算模組
const Calculator = {
    // 計算單一股票的各項數據
    calcStock(stock) {
        // 總買入成本
        const totalCost = stock.purchases.reduce((sum, p) => 
            sum + p.price * p.shares, 0
        );
        
        // 原始買入股數
        const purchasedShares = stock.purchases.reduce((sum, p) => 
            sum + p.shares, 0
        );
        
        // 股票股利獲得的股數
        const dividendShares = stock.dividends.reduce((sum, d) => 
            sum + (d.stockShares || 0), 0
        );
        
        // 現在總股數
        const totalShares = purchasedShares + dividendShares;
        
        // 原始均價（不含配股）
        const avgCostRaw = purchasedShares > 0 ? totalCost / purchasedShares : 0;
        
        // 累計現金股利
        const totalCashDividend = stock.dividends.reduce((sum, d) => 
            sum + (d.cash || 0), 0
        );
        
        // 降成本後的均價：(總成本 - 累計現金股利) / 總股數
        const avgCostAdjusted = totalShares > 0 
            ? (totalCost - totalCashDividend) / totalShares 
            : 0;
        
        // 現價
        const currentPrice = stock.currentPrice || avgCostRaw;
        
        // 市值
        const marketValue = currentPrice * totalShares;
        
        // 損益（不含降成本）：市值 - 總成本
        const profitRaw = marketValue - totalCost;
        
        // 損益（含降成本）：市值 - 總成本 + 累計現金股利
        const profitAdjusted = marketValue - totalCost + totalCashDividend;
        
        // 報酬率（含降成本）
        const returnRate = totalCost > 0 ? (profitAdjusted / totalCost) * 100 : 0;
        
        // 每股降低成本金額
        const costReduction = totalShares > 0 
            ? avgCostRaw - avgCostAdjusted 
            : 0;

        return {
            symbol: stock.symbol,
            name: stock.name,
            broker: stock.broker,
            totalCost,
            purchasedShares,
            dividendShares,
            totalShares,
            avgCostRaw,
            avgCostAdjusted,
            totalCashDividend,
            currentPrice,
            marketValue,
            profitRaw,
            profitAdjusted,
            returnRate,
            costReduction
        };
    },

    // 計算投資組合總覽
    calcPortfolio(stocks) {
        let totalCost = 0;
        let totalValue = 0;
        let totalDividend = 0;
        let totalProfitRaw = 0;
        let totalProfitAdjusted = 0;

        stocks.forEach(stock => {
            const calc = this.calcStock(stock);
            totalCost += calc.totalCost;
            totalValue += calc.marketValue;
            totalDividend += calc.totalCashDividend;
            totalProfitRaw += calc.profitRaw;
            totalProfitAdjusted += calc.profitAdjusted;
        });

        const returnRate = totalCost > 0 
            ? (totalProfitAdjusted / totalCost) * 100 
            : 0;

        return {
            totalCost,
            totalValue,
            totalDividend,
            profitRaw: totalProfitRaw,
            profitAdjusted: totalProfitAdjusted,
            returnRate
        };
    }
};
