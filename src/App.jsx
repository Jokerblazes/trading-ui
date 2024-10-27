import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType } from 'lightweight-charts';

// 辅助函数：计算移动平均线
function calculateMA(data, period) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push({ time: data[i].time, value: null });
      continue;
    }
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    result.push({ time: data[i].time, value: sum / period });
  }
  return result;
}

function calculateNetHighLow(constituents) {
  let netHigh = 0;
  let netLow = 0;

  constituents.forEach(stock => {
    if (stock.currentClose > stock.previousClose) {
      netHigh++;
    } else if (stock.currentClose < stock.previousClose) {
      netLow++;
    }
  });

  return { netHigh, netLow };
}

export function App() {
  const chartContainerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // ... existing code ...
        setIsLoading(true);
        const index = 'HK.800000';
        const startDate = '2024-01-01';
        const endDate = '2024-01-31';
        const response = await fetch(`http://127.0.0.1:5000/api/index_kline?index=${index}&start_date=${startDate}&end_date=${endDate}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // 处理返回的数据
        const constituentsKline = data.constituents; // 所有成份股的历史K线数据
        
        
        const indexKline = await response.json();

        if (chartContainerRef.current && data.length > 0) {
          const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: 400,
            layout: {
              background: { type: ColorType.Solid, color: 'white' },
              textColor: 'black',
            },
            grid: {
              vertLines: { color: 'rgba(197, 203, 206, 0.5)' },
              horzLines: { color: 'rgba(197, 203, 206, 0.5)' },
            },
            rightPriceScale: {
              borderColor: 'rgba(197, 203, 206, 0.8)',
            },
            timeScale: {
              borderColor: 'rgba(197, 203, 206, 0.8)',
              timeVisible: true,
              secondsVisible: false,
            },
          });

          const mainSeries = chart.addCandlestickSeries({
            upColor: '#26a69a',
            downColor: '#ef5350',
            borderVisible: false,
            wickUpColor: '#26a69a',
            wickDownColor: '#ef5350',
          });

          const volumeSeries = chart.addHistogramSeries({
            color: '#26a69a',
            priceFormat: {
              type: 'volume',
            },
            priceScaleId: 'volume',
            scaleMargins: {
              top: 0.9,
              bottom: 0,
            },
          });

          // 设置成交量的独立价格尺度
          chart.priceScale('volume').applyOptions({
            scaleMargins: {
              top: 0.9,
              bottom: 0,
            },
          });

          // 添加移动平均线
          const ma7Series = chart.addLineSeries({
            color: '#2962FF',
            lineWidth: 2,
            title: 'MA7',
          });

          const ma21Series = chart.addLineSeries({
            color: '#FF6D00',
            lineWidth: 2,
            title: 'MA21',
          });

          // 转换数据格式
          const formattedCandlestickData = data.map(item => ({
            time: new Date(item.time_key).getTime() / 1000,
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close
          }));

          const formattedVolumeData = data.map(item => ({
            time: new Date(item.time_key).getTime() / 1000,
            value: item.turnover,
            color: item.close > item.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
          }));

          // 计算移动平均线数据
          const ma7Data = calculateMA(formattedCandlestickData, 7);
          const ma21Data = calculateMA(formattedCandlestickData, 21);

          mainSeries.setData(formattedCandlestickData);
          volumeSeries.setData(formattedVolumeData);
          ma7Series.setData(ma7Data);
          ma21Series.setData(ma21Data);

          chart.timeScale().fitContent();

          // 清理函数
          return () => {
            chart.remove();
          };
        }
      } catch (error) {
        console.error('获取数据时出错:', error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  
  if (isLoading) {
    return <div>加载中...</div>;
  }

  if (error) {
    return <div>错误: {error}</div>;
  }

  return <div ref={chartContainerRef} style={{ width: '100%', height: '400px' }} />;
}
